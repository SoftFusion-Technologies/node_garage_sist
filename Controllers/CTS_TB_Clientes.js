/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 01 / 07 / 2025
 * Versión: 1.1
 *
 * Descripción:
 * Controladores CRUD de clientes con normalización E.164, opt-in/opt-out WA
 * y endpoints auxiliares para campañas.
 *
 * Tema: Controladores - Clientes
 * Capa: Backend
 */

// Importar el modelo
import MD_TB_Clientes from '../Models/MD_TB_Clientes.js';
import { VentasModel } from '../Models/Ventas/MD_TB_Ventas.js';
import { DetalleVentaModel } from '../Models/Ventas/MD_TB_DetalleVenta.js';
import db from '../DataBase/db.js';
import { Op, fn, col, literal } from 'sequelize';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const ClienteModel = MD_TB_Clientes.ClienteModel;

/* =========================
   Helpers
   ========================= */
function toE164AR(raw) {
  try {
    if (!raw) return null;
    const cleaned = String(raw).replace(/[^\d+]/g, '');
    const p = parsePhoneNumberFromString(cleaned, 'AR');
    if (p && p.isValid()) return p.number; // E.164 (+549...)
    return null;
  } catch {
    return null;
  }
}

function now() {
  return new Date();
}

// Reemplazá el helper anterior por este:
function toE164ARMobile(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, '');

  // Quitar 0 inicial (prefijo nacional) si viene
  let msisdn = digits.replace(/^0+/, '');

  // Si viene con 15 en el segmento móvil (ej: 381 15 5796507), eliminar “15”
  // Casos frecuentes: AREA(3-4 dígitos) + 15 + número (6-8 dígitos)
  msisdn = msisdn.replace(/^(\d{3,4})15(\d{6,8})$/, '$1$2');

  // Agregar código país si no está
  if (!msisdn.startsWith('54')) {
    msisdn = '54' + msisdn;
  }

  // Insertar el "9" de móviles AR si no está: +54 9 ...
  // Si ya viene 549... dejamos; si viene 54xxxx insertamos 9.
  if (!msisdn.startsWith('549')) {
    msisdn = '549' + msisdn.slice(2);
  }

  return '+' + msisdn;
}


export const OBRS_Clientes_V2 = async (req, res) => {
  try {
    // 1) Parámetros y defaults seguros
    const {
      q = '',
      optin,
      cone164,
      // pagina actual (0-based) y tamaño de página. También aceptamos limit/offset crudos.
      page,
      pageSize,
      limit: limitRaw,
      offset: offsetRaw,
      sort = 'id',
      order = 'DESC'
    } = req.query;

    // Cap y normalización
    const MAX_LIMIT = 100;
    const defaultLimit = 20;

    // Si vino page/pageSize, calculamos offset/limit desde ahí; si no, usamos limit/offset
    const limit = Math.min(
      Number(pageSize ?? limitRaw ?? defaultLimit) || defaultLimit,
      MAX_LIMIT
    );
    const offset =
      Number((page != null ? Number(page) * limit : offsetRaw) ?? 0) || 0;

    // 2) Filtro base
    const where = {};
    if (optin === '1') where.wa_opt_in = true;
    if (cone164 === '1') where.telefono_e164 = { [Op.ne]: null };

    const qTrim = q.trim();
    if (qTrim.length >= 2) {
      const isNumeric = /^\d+$/.test(qTrim);
      if (isNumeric) {
        where[Op.or] = [
          { dni: qTrim },
          { telefono: { [Op.like]: `%${qTrim}%` } },
          { telefono_e164: { [Op.like]: `%${qTrim}%` } }
        ];
      } else {
        where[Op.or] = [
          { nombre: { [Op.like]: `%${qTrim}%` } },
          { email: { [Op.like]: `%${qTrim}%` } }
        ];
      }
    }

    // 3) Orden seguro (whitelist)
    const ORDER_WHITELIST = new Set([
      'id',
      'nombre',
      'fecha_alta',
      'fecha_ultima_compra'
    ]);
    const SORT = ORDER_WHITELIST.has(sort) ? sort : 'id';
    const ORDER = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 4) Proyección ligera (evita payload gigante si luego agregás campos pesados)
    const attributes = [
      'id',
      'nombre',
      'telefono',
      'telefono_e164',
      'email',
      'dni',
      'direccion',
      'wa_opt_in',
      'wa_blocked',
      'fecha_alta',
      'fecha_ultima_compra'
    ];

    // 5) Consulta paginada + total
    const { rows, count } = await ClienteModel.findAndCountAll({
      where,
      attributes,
      order: [[SORT, ORDER]],
      limit,
      offset
    });

    // 6) Respuesta estándar de paginación
    const hasMore = offset + limit < count;
    res.json({
      data: rows,
      page: {
        limit,
        offset,
        total: count,
        hasMore
      }
    });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};
/* =========================
   Obtener todos los clientes
   ========================= */
export const OBRS_Clientes_CTS = async (req, res) => {
  try {
    const { optin, cone164, q, limit = 500, offset = 0 } = req.query;

    const where = {};
    if (optin === '1') where.wa_opt_in = true;
    if (cone164 === '1') where.telefono_e164 = { [Op.ne]: null };

    if (q && q.trim().length >= 2) {
      const query = q.trim();
      const isNumeric = /^\d+$/.test(query);
      if (isNumeric) {
        where[Op.or] = [
          { dni: query },
          { telefono: { [Op.like]: `%${query}%` } },
          { telefono_e164: { [Op.like]: `%${query}%` } }
        ];
      } else {
        where[Op.or] = [
          { nombre: { [Op.like]: `%${query}%` } },
          { email: { [Op.like]: `%${query}%` } }
        ];
      }
    }

    const clientes = await ClienteModel.findAll({
      where,
      order: [['id', 'DESC']],
      limit: Number(limit),
      offset: Number(offset)
    });
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================
   Obtener un cliente por ID
   ========================= */
export const OBR_Cliente_CTS = async (req, res) => {
  try {
    const cliente = await ClienteModel.findByPk(req.params.id);
    if (!cliente)
      return res.status(404).json({ mensajeError: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================
   Crear un nuevo cliente
   ========================= */
export const CR_Cliente_CTS = async (req, res) => {
  const {
    nombre,
    telefono,
    email,
    direccion,
    dni,
    // nuevos campos opcionales
    wa_opt_in,
    wa_blocked,
    origen_opt_in
  } = req.body;

  if (!nombre) {
    return res.status(400).json({
      mensajeError: 'Falta el campo obligatorio: nombre'
    });
  }

  try {
    const telefono_e164 = toE164ARMobile(telefono);

    const nuevo = await ClienteModel.create({
      nombre,
      telefono: telefono || null,
      telefono_e164,
      email: email || null,
      direccion: direccion || null,
      dni: dni || null,
      wa_opt_in: typeof wa_opt_in === 'boolean' ? wa_opt_in : true,
      wa_blocked: !!wa_blocked,
      origen_opt_in: origen_opt_in || 'manual'
      // fecha_alta: default DB y modelo
    });

    res.json({ message: 'Cliente creado correctamente', cliente: nuevo });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================
   Eliminar un cliente (con chequeo de ventas)
   ========================= */
export const ER_Cliente_CTS = async (req, res) => {
  const clienteId = req.params.id;

  try {
    const ventasCliente = await VentasModel.findAll({
      where: { cliente_id: clienteId },
      attributes: ['id']
    });

    if (ventasCliente.length > 0) {
      const ventaIds = ventasCliente.map((v) => v.id);
      const detalleRelacionado = await DetalleVentaModel.findOne({
        where: { venta_id: { [Op.in]: ventaIds } }
      });

      if (detalleRelacionado) {
        return res.status(409).json({
          mensajeError:
            'No se puede eliminar el cliente porque tiene ventas asociadas.'
        });
      }
    }

    const eliminado = await ClienteModel.destroy({
      where: { id: clienteId }
    });

    if (!eliminado) {
      return res.status(404).json({ mensajeError: 'Cliente no encontrado' });
    }

    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================
   Actualizar un cliente
   - Recalcula telefono_e164 si cambia telefono (o si viene explícito)
   - Maneja transición de opt-in → opt-out seteando wa_opt_out_at
   ========================= */
export const UR_Cliente_CTS = async (req, res) => {
  const { id } = req.params;

  try {
    const actual = await ClienteModel.findByPk(id);
    if (!actual) {
      return res.status(404).json({ mensajeError: 'Cliente no encontrado' });
    }

    const payload = { ...req.body };

    // Si se envía "telefono" o "telefono_e164", recalculamos para mantener consistencia

    if (Object.prototype.hasOwnProperty.call(payload, 'telefono')) {
      payload.telefono_e164 = toE164ARMobile(payload.telefono);
    } else if (!actual.telefono_e164 && (payload.telefono || actual.telefono)) {
      payload.telefono_e164 = toE164ARMobile(
        payload.telefono ?? actual.telefono
      );
    }

    // Manejo opt-out timestamp
    if (
      Object.prototype.hasOwnProperty.call(payload, 'wa_opt_in') &&
      payload.wa_opt_in === false &&
      actual.wa_opt_in === true
    ) {
      payload.wa_opt_out_at = now();
    }
    // Si vuelve a opt-in, limpiamos opt_out_at (opcional)
    if (
      Object.prototype.hasOwnProperty.call(payload, 'wa_opt_in') &&
      payload.wa_opt_in === true
    ) {
      payload.wa_opt_out_at = null;
    }

    const [updated] = await ClienteModel.update(payload, { where: { id } });

    if (updated === 1) {
      const actualizado = await ClienteModel.findByPk(id);
      res.json({ message: 'Cliente actualizado correctamente', actualizado });
    } else {
      res.status(404).json({ mensajeError: 'Cliente no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================
   Búsqueda rápida / autosuggest
   - Soporta nombre, email (parcial)
   - DNI exacto si query es numérica
   - También busca por teléfono y E.164
   ========================= */
export const SEARCH_Clientes_CTS = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) return res.json([]);

    const cleanQuery = query.trim().replace(/\s/g, '');
    const isNumeric = /^\d+$/.test(cleanQuery);

    if (isNumeric) {
      const clientes = await ClienteModel.findAll({
        where: {
          [Op.or]: [
            { dni: cleanQuery },
            { telefono: { [Op.like]: `%${cleanQuery}%` } },
            { telefono_e164: { [Op.like]: `%${cleanQuery}%` } }
          ]
        },
        order: [['id', 'DESC']]
      });
      if (clientes.length > 0) return res.json(clientes);
      return res.status(404).json({ mensajeError: 'Cliente no encontrado' });
    }

    const clientes = await ClienteModel.findAll({
      where: {
        [Op.or]: [
          { nombre: { [Op.like]: `%${cleanQuery}%` } },
          { email: { [Op.like]: `%${cleanQuery}%` } }
        ]
      },
      order: [['id', 'DESC']]
    });

    if (clientes.length > 0) return res.json(clientes);
    return res.status(404).json({ mensajeError: 'Cliente no encontrado' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================
   Historial de compras
   ========================= */
export const OBR_HistorialComprasCliente_CTS = async (req, res) => {
  try {
    const clienteId = req.params.id;
    const ventas = await VentasModel.findAll({
      where: { cliente_id: clienteId },
      order: [['fecha', 'DESC']],
      attributes: ['id', 'fecha', 'total']
    });

    res.json(ventas);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================
   Clientes inactivos (por días)
   ========================= */
export const OBRS_ClientesInactivos_CTS = async (req, res) => {
  try {
    const dias = parseInt(req.query.dias, 10) || 60;

    const clientes = await ClienteModel.findAll({
      where: {
        [Op.or]: [
          { fecha_ultima_compra: null },
          db.literal(`fecha_ultima_compra < NOW() - INTERVAL ${dias} DAY`)
        ]
      },
      order: [['fecha_ultima_compra', 'ASC']]
    });

    res.json(clientes);
  } catch (error) {
    console.error('Error al buscar clientes inactivos:', error);
    res
      .status(500)
      .json({ mensajeError: 'Error al obtener clientes inactivos' });
  }
};

/* =========================
   NUEVOS: Opt-in / Opt-out WA
   ========================= */
export const PUT_Cliente_OptIn_CTS = async (req, res) => {
  try {
    const { id } = req.params;
    const { origen_opt_in = 'manual' } = req.body;

    const [upd] = await ClienteModel.update(
      {
        wa_opt_in: true,
        wa_blocked: false,
        wa_opt_out_at: null,
        origen_opt_in
      },
      { where: { id } }
    );

    if (upd !== 1)
      return res.status(404).json({ mensajeError: 'Cliente no encontrado' });
    const cliente = await ClienteModel.findByPk(id);
    res.json({ message: 'Opt-in registrado', cliente });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

export const PUT_Cliente_OptOut_CTS = async (req, res) => {
  try {
    const { id } = req.params;
    const [upd] = await ClienteModel.update(
      { wa_opt_in: false, wa_opt_out_at: now() },
      { where: { id } }
    );
    if (upd !== 1)
      return res.status(404).json({ mensajeError: 'Cliente no encontrado' });
    const cliente = await ClienteModel.findByPk(id);
    res.json({ message: 'Opt-out registrado', cliente });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================
   NUEVO: Elegibles WA para campañas
   - wa_opt_in = 1
   - telefono_e164 no nulo
   - wa_blocked = 0
   - filtros opcionales: inactivos > N días
   ========================= */
export const OBRS_ClientesElegiblesWA_CTS = async (req, res) => {
  try {
    const { diasInactivo, limit = 500, offset = 0 } = req.query;

    const where = {
      wa_opt_in: true,
      wa_blocked: false,
      telefono_e164: { [Op.ne]: null }
    };

    if (diasInactivo) {
      where[Op.or] = [
        { fecha_ultima_compra: null },
        literal(
          `fecha_ultima_compra < NOW() - INTERVAL ${Number(diasInactivo)} DAY`
        )
      ];
    }

    const clientes = await ClienteModel.findAll({
      where,
      order: [['id', 'DESC']],
      limit: Number(limit),
      offset: Number(offset)
    });

    res.json(clientes);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

export default {
  OBRS_Clientes_CTS,
  OBR_Cliente_CTS,
  CR_Cliente_CTS,
  ER_Cliente_CTS,
  UR_Cliente_CTS,
  SEARCH_Clientes_CTS,
  OBR_HistorialComprasCliente_CTS,
  OBRS_ClientesInactivos_CTS,
  // nuevos
  PUT_Cliente_OptIn_CTS,
  PUT_Cliente_OptOut_CTS,
  OBRS_ClientesElegiblesWA_CTS
};
