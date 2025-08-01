import express from 'express';
import cors from 'cors';
// El Intercambio de Recursos de Origen Cruzado (CORS (en-US))
// es un mecanismo que utiliza cabeceras HTTP adicionales para permitir que un user agent (en-US)
// obtenga permiso para acceder a recursos seleccionados desde un servidor, en un origen distinto (dominio) al que pertenece.

// importamos la conexion de la base de datos
import db from './DataBase/db.js';
import GetRoutes from './Routes/routes.js';
import dotenv from 'dotenv';

import { login, authenticateToken } from './Security/auth.js'; // Importa las funciones del archivo auth.js
import { PORT } from './DataBase/config.js';
import mysql from 'mysql2/promise'; // Usar mysql2 para las promesas
import cron from 'node-cron';

import './Models/relaciones.js';

// CONFIGURACION PRODUCCION
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// const PORT = process.env.PORT || 3000;

// console.log(process.env.PORT)

const app = express();
app.use(cors()); // aca configuramos cors para no tener errores
app.use(express.json());
app.use('/', GetRoutes);
// definimos la conexion

// Para verificar si nuestra conexión funciona, lo hacemos con el método authenticate()
//  el cual nos devuelve una promesa que funciona de la siguiente manera:
// un try y un catch para captar cualquier tipo de errores
try {
  db.authenticate();
  console.log('Conexion con la db establecida');
} catch (error) {
  console.log(`El error de la conexion es : ${error}`);
}

const pool = mysql.createPool({
  host: 'localhost', // Configurar según tu base de datos
  user: 'root', // Configurar según tu base de datos
  password: '123456', // Configurar según tu base de datos
  database: 'DB_GarageDESA_21062025'
});

// Ruta de login
app.post('/login', login);

// Ruta protegida
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Esto es una ruta protegida' });
});

app.get('/', (req, res) => {
  if (req.url == '/') {
    res.send('si en la URL pone  vera los registros en formato JSON'); // este hola mundo se mostrara en el puerto 5000 y en la raiz principal
  } else if (req.url != '/') {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('404 ERROR');
  }
});

// Ejemplo para historial completo
// GET /ventas-historial?desde=2025-07-01&hasta=2025-07-31&local=1&vendedor=3&cliente=5
app.get('/ventas-historial', async (req, res) => {
  try {
    const {
      desde,
      hasta,
      local,
      vendedor,
      cliente,
      busqueda,
      page = 1,
      limit = 10
    } = req.query;

    const limitNum = Number(limit);
    const pageNum = Number(page);
    const offsetNum = (pageNum - 1) * limitNum;

    const localId = local ? Number(local) : null;
    const vendedorId = vendedor ? Number(vendedor) : null;
    const clienteId = cliente ? Number(cliente) : null;

    let filtros = [];
    let params = [];

    if (desde && !hasta) {
      filtros.push('DATE(v.fecha) = ?');
      params.push(desde);
    } else {
      if (desde) {
        filtros.push('DATE(v.fecha) >= ?');
        params.push(desde);
      }
      if (hasta) {
        filtros.push('DATE(v.fecha) <= ?');
        params.push(hasta);
      }
    }

    if (localId) {
      filtros.push('v.local_id = ?');
      params.push(localId);
    }
    if (vendedorId) {
      filtros.push('v.usuario_id = ?');
      params.push(vendedorId);
    }
    if (clienteId) {
      filtros.push('v.cliente_id = ?');
      params.push(clienteId);
    }

    if (busqueda) {
      const busquedaId = busqueda.trim().replace('#', '');
      const posibleId = Number(busquedaId);

      if (!isNaN(posibleId)) {
        filtros.push('v.id = ?');
        params.push(posibleId);
      } else {
        filtros.push(`(
          IFNULL(c.nombre, '') LIKE ? OR
          IFNULL(u.nombre, '') LIKE ? OR
          IFNULL(l.nombre, '') LIKE ?
        )`);
        params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
      }
    }

    const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

    // Total para paginación
    const baseFrom = `
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      LEFT JOIN locales l ON v.local_id = l.id
    `;

    const [countResult] = await pool.query(
      `SELECT COUNT(DISTINCT v.id) AS total ${baseFrom} ${where}`,
      params
    );
    const total = countResult[0].total;

    // Datos con JOIN de devoluciones y detalles
    const query = `
    SELECT 
      v.id AS venta_id,
      v.fecha,
      v.total,
      v.estado,
      c.nombre AS cliente,
      u.nombre AS vendedor,
      l.nombre AS local,

      -- Total de productos vendidos en detalle_venta
      (
        SELECT SUM(dv.cantidad)
        FROM detalle_venta dv
        WHERE dv.venta_id = v.id
      ) AS total_productos,

      -- Total de productos devueltos en detalle_devolucion
      (
        SELECT SUM(dd.cantidad)
        FROM devoluciones d
        JOIN detalle_devolucion dd ON dd.devolucion_id = d.id
        WHERE d.venta_id = v.id
      ) AS total_devueltos

      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      LEFT JOIN locales l ON v.local_id = l.id
      LEFT JOIN detalle_venta dvv ON dvv.venta_id = v.id
      LEFT JOIN devoluciones dd ON dd.venta_id = v.id
      LEFT JOIN detalle_devolucion ddd ON ddd.devolucion_id = dd.id
      ${where}
      GROUP BY v.id
      ORDER BY v.fecha DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `;

    const [rows] = await pool.query(query, params);

    res.json({
      total,
      page: pageNum,
      limit: limitNum,
      ventas: rows
    });
  } catch (err) {
    console.error('Error en /ventas-historial:', err);
    res.status(500).json({ mensajeError: err.message });
  }
});

// GET /ventas/:id/detalle
app.get('/ventas/:id/detalle', async (req, res) => {
  try {
    const ventaId = req.params.id;
    // Info de la venta principal + joins básicos (si lo deseas)
    const [info] = await db.query(
      `
      SELECT 
        v.id AS venta_id,
        v.fecha,
        v.total,
        v.estado,
        c.nombre AS cliente,
        u.nombre AS vendedor,
        l.nombre AS local
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      LEFT JOIN locales l ON v.local_id = l.id
      WHERE v.id = ?
      LIMIT 1
    `,
      [ventaId]
    );

    // Detalle de productos vendidos
    const [detalle] = await db.query(
      `
      SELECT 
        dv.cantidad,
        dv.precio_unitario,
        dv.descuento,
        p.nombre AS producto,
        t.nombre AS talle,
        s.codigo_sku
      FROM detalle_venta dv
      LEFT JOIN stock s ON dv.stock_id = s.id
      LEFT JOIN productos p ON s.producto_id = p.id
      LEFT JOIN talles t ON s.talle_id = t.id
      WHERE dv.venta_id = ?
    `,
      [ventaId]
    );

    // Devolver toda la info junta
    res.json({
      ...info[0], // info principal de la venta
      detalle // array de productos vendidos
    });
  } catch (err) {
    res.status(500).json({ mensajeError: err.message });
  }
});

app.get('/ventas-mes', async (req, res) => {
  try {
    const sql = `
      SELECT
        p.id,
        p.nombre,
        COALESCE(SUM(dv.cantidad), 0) AS total_vendido
      FROM productos p
      LEFT JOIN stock s ON s.producto_id = p.id
      LEFT JOIN detalle_venta dv ON dv.stock_id = s.id
      LEFT JOIN ventas v ON dv.venta_id = v.id
        AND YEAR(v.fecha) = YEAR(CURRENT_DATE())
        AND MONTH(v.fecha) = MONTH(CURRENT_DATE())
      GROUP BY p.id, p.nombre
      ORDER BY total_vendido DESC, p.nombre ASC
    `;
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener productos vendidos del mes:', error);
    res.status(500).json({ mensajeError: 'Error interno al obtener datos' });
  }
});

// borrado de la tabla temporal para no almacenar datos basura
cron.schedule('0 0 * * *', async () => {
  try {
    await db.query('DELETE FROM ajustes_precios_temp');
    console.log('🧹 Tabla ajustes_precios_temp limpiada a las 00:00');
  } catch (error) {
    console.error('❌ Error al limpiar ajustes_precios_temp:', error);
  }
});

if (!PORT) {
  console.error('El puerto no está definido en el archivo de configuración.');
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
  process.exit(1); // Opcional: reiniciar la aplicación
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no capturada:', promise, 'razón:', reason);
  process.exit(1); // Opcional: reiniciar la aplicación
});
