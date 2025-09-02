/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 01 / 07 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (CTS_TB_MovimientosCaja.js) contiene controladores para manejar operaciones CRUD sobre la tabla movimientos_caja.
 *
 * Tema: Controladores - Movimientos de Caja
 * Capa: Backend
 */

// Importar el modelo
import MD_TB_MovimientosCaja from '../../Models/Ventas/MD_TB_MovimientosCaja.js';
const MovimientosCajaModel = MD_TB_MovimientosCaja.MovimientosCajaModel;
import MD_TB_Caja from '../../Models/Ventas/MD_TB_Caja.js';
const CajaModel = MD_TB_Caja.CajaModel;
import { LocalesModel } from '../../Models/Stock/MD_TB_Locales.js';
import { Op } from 'sequelize';

// Obtener todos los movimientos de caja con información de la caja
export const OBRS_MovimientosCaja_CTS = async (req, res) => {
  try {
    const movimientos = await MovimientosCajaModel.findAll({
      include: [
        {
          model: CajaModel,
          as: 'Caja',
          include: [
            {
              model: LocalesModel,
              as: 'locale',
              attributes: ['id', 'nombre'] // solo lo necesario
            }
          ]
        }
      ],
      order: [['id', 'DESC']]
    });

    const resultado = movimientos.map((m) => {
      const data = m.toJSON();
      return {
        ...data,
        local_id: data.Caja?.local_id ?? null,
        local_nombre: data.Caja?.locale?.nombre ?? null
      };
    });

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Obtener movimientos de una caja específica
export const OBRS_MovimientosCajaByCajaId_CTS = async (req, res) => {
  const { caja_id } = req.params;
  try {
    const movimientos = await MovimientosCajaModel.findAll({
      where: { caja_id }, // 👈 FILTRO POR ID DE CAJA
      order: [['id', 'DESC']]
    });
    res.json(movimientos);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};


// Obtener un movimiento de caja por ID
export const OBR_MovimientoCaja_CTS = async (req, res) => {
  try {
    const movimiento = await MovimientosCajaModel.findByPk(req.params.id);
    if (!movimiento)
      return res
        .status(404)
        .json({ mensajeError: 'Movimiento de caja no encontrado' });
    res.json(movimiento);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Crear un nuevo movimiento de caja
export const CR_MovimientoCaja_CTS = async (req, res) => {
  const { caja_id, tipo, descripcion, monto, fecha, referencia } = req.body;

  if (!caja_id || !tipo || !monto) {
    return res.status(400).json({
      mensajeError: 'Faltan campos obligatorios: caja_id, tipo, monto'
    });
  }

  try {
    const nuevo = await MovimientosCajaModel.create({
      caja_id,
      tipo,
      descripcion,
      monto,
      fecha,
      referencia
    });
    res.json({
      message: 'Movimiento de caja creado correctamente',
      movimiento: nuevo
    });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Eliminar un movimiento de caja
export const ER_MovimientoCaja_CTS = async (req, res) => {
  try {
    const eliminado = await MovimientosCajaModel.destroy({
      where: { id: req.params.id }
    });

    if (!eliminado)
      return res
        .status(404)
        .json({ mensajeError: 'Movimiento de caja no encontrado' });

    res.json({ message: 'Movimiento de caja eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Actualizar un movimiento de caja
export const UR_MovimientoCaja_CTS = async (req, res) => {
  const { id } = req.params;

  try {
    const [updated] = await MovimientosCajaModel.update(req.body, {
      where: { id }
    });

    if (updated === 1) {
      const actualizado = await MovimientosCajaModel.findByPk(id);
      res.json({
        message: 'Movimiento de caja actualizado correctamente',
        actualizado
      });
    } else {
      res
        .status(404)
        .json({ mensajeError: 'Movimiento de caja no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// GET /v2/movimientos/caja/:caja_id?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&tipo=ingreso|egreso|venta&q=texto&page=1&limit=50&sort=fecha:desc
export const OBRS_MovimientosCajaByCajaId_V2_CTS = async (req, res) => {
  const { caja_id } = req.params;

  let {
    desde,
    hasta,
    tipo,
    q,
    page = '1',
    limit = '100',
    sort = 'fecha:desc'
  } = req.query || {};

  // sanitize
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));

  const [sortFieldRaw, sortDirRaw] = String(sort).split(':');
  const sortField = ['fecha', 'monto', 'id'].includes(sortFieldRaw)
    ? sortFieldRaw
    : 'fecha';
  const sortDir =
    (sortDirRaw || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const parseARDate = (dStr, endOfDay = false) => {
    if (!dStr || !/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return null;
    const base = endOfDay ? 'T23:59:59' : 'T00:00:00';
    return new Date(`${dStr}${base}`);
  };

  const where = { caja_id };

  // tipo: ingreso | egreso | venta (venta = ingreso + match de descripción)
  if (tipo) {
    if (tipo === 'venta') {
      where.tipo = 'ingreso';
      where.descripcion = { [Op.like]: '%venta #%' }; // heurística
    } else if (['ingreso', 'egreso'].includes(tipo)) {
      where.tipo = tipo;
    }
  }

  const fDesde = parseARDate(desde, false);
  const fHasta = parseARDate(hasta, true);
  if (fDesde || fHasta) {
    where.fecha = {};
    if (fDesde) where.fecha[Op.gte] = fDesde;
    if (fHasta) where.fecha[Op.lte] = fHasta;
  }

  if (q && String(q).trim()) {
    const term = `%${String(q).trim()}%`;
    where[Op.or] = [
      { descripcion: { [Op.like]: term } },
      { referencia: { [Op.like]: term } }
    ];
  }

  try {
    const total = await MovimientosCajaModel.count({ where });

    const rows = await MovimientosCajaModel.findAll({
      where,
      order: [[sortField, sortDir]],
      limit,
      offset: (page - 1) * limit
    });

    res.json({
      data: rows,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      sort: `${sortField}:${sortDir.toLowerCase()}`
    });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};
