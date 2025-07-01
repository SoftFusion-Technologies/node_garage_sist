/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 21 /06 /2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (routes.js) define las rutas HTTP para operaciones CRUD en la tabla 'locales'
 * Tema: Rutas - Locales
 *
 * Capa: Backend
 */

import express from 'express'; // Importa la librería Express
const router = express.Router(); // Inicializa el router

// Importar controladores de locales
import {
  OBRS_Locales_CTS,
  OBR_Local_CTS,
  CR_Local_CTS,
  ER_Local_CTS,
  UR_Local_CTS
} from '../Controllers/Stock/CTS_TB_Locales.js';
// Importar controladores de locales

// Importar controladores de productos

import {
  OBRS_Productos_CTS,
  OBR_Producto_CTS,
  CR_Producto_CTS,
  ER_Producto_CTS,
  UR_Producto_CTS
} from '../Controllers/Stock/CTS_TB_Productos.js';
// Importar controladores de productos

// Importar controladores de talles
import {
  OBRS_Talles_CTS,
  OBR_Talle_CTS,
  CR_Talle_CTS,
  ER_Talle_CTS,
  UR_Talle_CTS
} from '../Controllers/Stock/CTS_TB_Talles.js';
// Importar controladores de talles

// Importar controladores de lugares
import {
  OBRS_Lugares_CTS,
  OBR_Lugar_CTS,
  CR_Lugar_CTS,
  ER_Lugar_CTS,
  UR_Lugar_CTS
} from '../Controllers/Stock/CTS_TB_Lugares.js';
// Importar controladores de lugares

// Importar controladores de estados
import {
  OBRS_Estados_CTS,
  OBR_Estado_CTS,
  CR_Estado_CTS,
  ER_Estado_CTS,
  UR_Estado_CTS
} from '../Controllers/Stock/CTS_TB_Estados.js';
// Importar controladores de estados

// Importar controladores de stock
import {
  OBRS_Stock_CTS,
  OBR_Stock_CTS,
  CR_Stock_CTS,
  ER_Stock_CTS,
  UR_Stock_CTS,
  ER_StockPorProducto,
  DISTRIBUIR_Stock_CTS,
  TRANSFERIR_Stock_CTS,
  ER_StockPorGrupo
} from '../Controllers/Stock/CTS_TB_Stock.js';

// Importar controladores de usuarios
import {
  OBRS_Usuarios_CTS,
  OBR_Usuario_CTS,
  CR_Usuario_CTS,
  ER_Usuario_CTS,
  UR_Usuario_CTS
} from '../Controllers/CTS_TB_Users.js';
// Importar controladores de usuarios

// Importar controladores de clientes
import {
  OBRS_Clientes_CTS,
  OBR_Cliente_CTS,
  CR_Cliente_CTS,
  ER_Cliente_CTS,
  UR_Cliente_CTS
} from '../Controllers/CTS_TB_Clientes.js';
// Importar controladores de categorias
import {
  OBRS_Categorias_CTS,
  OBR_Categoria_CTS,
  CR_Categoria_CTS,
  ER_Categoria_CTS,
  UR_Categoria_CTS
} from '../Controllers/Stock/CTS_TB_Categorias.js';
// Importar controladores de categorias

import importRouter from './importRouter.js'; // 🆕 CARGA MASIVA

// ----------------------------------------------------------------
// Rutas para operaciones CRUD en la tabla 'locales'
// ----------------------------------------------------------------

// Obtener todos los locales
router.get('/locales', OBRS_Locales_CTS);

// Obtener un solo local por ID
router.get('/locales/:id', OBR_Local_CTS);

// Crear un nuevo local
router.post('/locales', CR_Local_CTS);

// Eliminar un local por ID
router.delete('/locales/:id', ER_Local_CTS);

// Actualizar un local por ID
router.put('/locales/:id', UR_Local_CTS);

// ----------------------------------------------------------------
// Rutas para operaciones CRUD en la tabla 'productos'
// ----------------------------------------------------------------

// Obtener todos los productos
router.get('/productos', OBRS_Productos_CTS);

// Obtener un producto por ID
router.get('/productos/:id', OBR_Producto_CTS);

// Crear un nuevo producto
router.post('/productos', CR_Producto_CTS);

// Eliminar un producto
router.delete('/productos/:id', ER_Producto_CTS);

// Actualizar un producto
router.put('/productos/:id', UR_Producto_CTS);

// ----------------------------------------------------------------
// Rutas para operaciones CRUD en la tabla 'talles'
// ----------------------------------------------------------------

router.get('/talles', OBRS_Talles_CTS);
router.get('/talles/:id', OBR_Talle_CTS);
router.post('/talles', CR_Talle_CTS);
router.delete('/talles/:id', ER_Talle_CTS);
router.put('/talles/:id', UR_Talle_CTS);

// ----------------------------------------------------------------
// Rutas para operaciones CRUD en la tabla 'Lugares'
// ----------------------------------------------------------------

router.get('/lugares', OBRS_Lugares_CTS);
router.get('/lugares/:id', OBR_Lugar_CTS);
router.post('/lugares', CR_Lugar_CTS);
router.delete('/lugares/:id', ER_Lugar_CTS);
router.put('/lugares/:id', UR_Lugar_CTS);

// ----------------------------------------------------------------
// Rutas para operaciones CRUD en la tabla 'Estados'
// ----------------------------------------------------------------

router.get('/estados', OBRS_Estados_CTS);
router.get('/estados/:id', OBR_Estado_CTS);
router.post('/estados', CR_Estado_CTS);
router.delete('/estados/:id', ER_Estado_CTS);
router.put('/estados/:id', UR_Estado_CTS);

// ----------------------------------------------------------------
// Rutas para operaciones CRUD en la tabla 'Stock'
// ----------------------------------------------------------------

router.get('/stock', OBRS_Stock_CTS);
router.get('/stock/:id', OBR_Stock_CTS);
router.post('/stock', CR_Stock_CTS);
router.delete('/stock/:id', ER_Stock_CTS);
router.put('/stock/:id', UR_Stock_CTS);
router.delete('/stock/producto/:id', ER_StockPorProducto);
// Ruta para distribuir stock por talle
router.post('/distribuir', DISTRIBUIR_Stock_CTS);
router.post('/transferir', TRANSFERIR_Stock_CTS);
router.post('/eliminar-grupo', ER_StockPorGrupo);

// ----------------------------------------------------------------
// Rutas para operaciones CRUD en la tabla 'usuarios'
// ----------------------------------------------------------------

router.get('/usuarios', OBRS_Usuarios_CTS);
router.get('/usuarios/:id', OBR_Usuario_CTS);
router.post('/usuarios', CR_Usuario_CTS);
router.delete('/usuarios/:id', ER_Usuario_CTS);
router.put('/usuarios/:id', UR_Usuario_CTS);

// ----------------------------------------------------------------
// Rutas para operaciones CRUD en la tabla 'clientes'
// ----------------------------------------------------------------

router.get('/clientes', OBRS_Clientes_CTS);
router.get('/clientes/:id', OBR_Cliente_CTS);
router.post('/clientes', CR_Cliente_CTS);
router.delete('/clientes/:id', ER_Cliente_CTS);
router.put('/clientes/:id', UR_Cliente_CTS);
// ----------------------------------------------------------------
// Rutas para operaciones CRUD en la tabla 'categorias'
// ----------------------------------------------------------------

router.get('/categorias', OBRS_Categorias_CTS);
router.get('/categorias/:id', OBR_Categoria_CTS);
router.post('/categorias', CR_Categoria_CTS);
router.delete('/categorias/:id', ER_Categoria_CTS);
router.put('/categorias/:id', UR_Categoria_CTS);

// Rutas de carga masiva
router.use('/carga-masiva', importRouter); // 🆕  (=> POST /api/import/:tabla)

// MODULO DE VENTAS
import {
  buscarItemsVenta,
  buscarItemsVentaAgrupado,
  buscarItemsVentaDetallado
} from '../Controllers/Ventas/ventasControllerPOS.js';
router.get('/buscar-productos', buscarItemsVenta);
router.get('/buscar-productos-agrupados', buscarItemsVentaAgrupado);
router.get('/buscar-productos-detallado', buscarItemsVentaDetallado);

import {
  OBRS_MediosPago_CTS,
  OBR_MedioPago_CTS,
  CR_MedioPago_CTS,
  ER_MedioPago_CTS,
  UR_MedioPago_CTS
} from '../Controllers/Ventas/CTS_TB_MediosPago.js';
router.get('/medios-pago', OBRS_MediosPago_CTS);
router.get('/medios-pago/:id', OBR_MedioPago_CTS);
router.post('/medios-pago', CR_MedioPago_CTS);
router.delete('/medios-pago/:id', ER_MedioPago_CTS);
router.put('/medios-pago/:id', UR_MedioPago_CTS);

// Importar controladores de ventas
import {
  OBRS_Ventas_CTS,
  OBR_Venta_CTS,
  CR_Venta_CTS,
  ER_Venta_CTS,
  UR_Venta_CTS
} from '../Controllers/Ventas/CTS_TB_Ventas.js';

// ----------------------------------------------------------------
// Rutas para operaciones CRUD en la tabla 'ventas'
// ----------------------------------------------------------------

router.get('/ventas', OBRS_Ventas_CTS); // Obtener todas las ventas
router.get('/ventas/:id', OBR_Venta_CTS); // Obtener una venta por ID
router.post('/ventas', CR_Venta_CTS); // Crear nueva venta
router.delete('/ventas/:id', ER_Venta_CTS); // Eliminar venta por ID
router.put('/ventas/:id', UR_Venta_CTS); // Actualizar venta por ID

// Importar controladores de detalle_venta
import {
  OBRS_DetalleVenta_CTS,
  OBR_DetalleVenta_CTS,
  CR_DetalleVenta_CTS,
  ER_DetalleVenta_CTS,
  UR_DetalleVenta_CTS
} from '../Controllers/Ventas/CTS_TB_DetalleVenta.js';

// ----------------------------------------------------------------
// Rutas para operaciones CRUD en la tabla 'detalle_venta'
// ----------------------------------------------------------------

router.get('/detalle_venta', OBRS_DetalleVenta_CTS); // Obtener todos los detalles
router.get('/detalle_venta/:id', OBR_DetalleVenta_CTS); // Obtener un detalle por ID
router.post('/detalle_venta', CR_DetalleVenta_CTS); // Crear nuevo detalle
router.delete('/detalle_venta/:id', ER_DetalleVenta_CTS); // Eliminar detalle por ID
router.put('/detalle_venta/:id', UR_DetalleVenta_CTS); // Actualizar detalle por ID

export default router;
