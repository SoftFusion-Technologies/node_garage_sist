/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 05 / 12 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (CTS_TB_CajaRecaudaciones.js) contiene los controladores para
 * gestionar el historial de recaudaciones (retiros de efectivo) desde las cajas.
 *
 * Flujo principal:
 *  - Registrar recaudación: crea un movimiento de caja (egreso, origen = retiro_recaudacion)
 *    y un registro en caja_recaudaciones dentro de una transacción.
 *  - Listar recaudaciones con filtros (local, usuario, fecha).
 *  - Obtener detalle de una recaudación puntual.
 *
 * Tema: Controladores - Caja / Recaudaciones
 * Capa: Backend
 */

import db from '../../DataBase/db.js';
import MD_TB_MovimientosCaja from '../../Models/Ventas/MD_TB_MovimientosCaja.js';
import MD_TB_Caja from '../../Models/Ventas/MD_TB_Caja.js';
import MD_TB_CajaRecaudaciones from '../../Models/Ventas/MD_TB_CajaRecaudaciones.js';
import { Op } from 'sequelize';

const MovimientosCajaModel = MD_TB_MovimientosCaja.MovimientosCajaModel;
const CajaModel = MD_TB_Caja.CajaModel;
const CajaRecaudacionesModel = MD_TB_CajaRecaudaciones.CajaRecaudacionesModel;

/**
 * Helper: Calcula el saldo actual de una caja (efectivo en caja)
 * usando los movimientos de tipo ingreso/egreso.
 */
const calcularSaldoCaja = async (caja_id, transaction = null) => {
  const ingresos =
    (await MovimientosCajaModel.sum('monto', {
      where: { caja_id, tipo: 'ingreso' },
      transaction
    })) || 0;

  const egresos =
    (await MovimientosCajaModel.sum('monto', {
      where: { caja_id, tipo: 'egreso' },
      transaction
    })) || 0;

  return Number(ingresos) - Number(egresos);
};

/**
 * POST /caja/recaudaciones
 *
 * Registra una recaudación (retiro de efectivo) desde la caja de un local.
 * - Busca la caja abierta del local.
 * - Valida que el monto sea > 0 y que haya saldo suficiente.
 * - Crea movimiento de caja (egreso, origen = retiro_recaudacion).
 * - Crea registro en caja_recaudaciones.
 */
export const CR_CajaRecaudacion_CTS = async (req, res) => {
  const { local_id, monto, observaciones, usuario_id } = req.body;

  if (!local_id || !monto || !usuario_id) {
    return res.status(400).json({
      mensajeError:
        'Faltan campos obligatorios: local_id, monto, usuario_id (usuario que registra la recaudación)'
    });
  }

  const montoNumber = Number(monto);
  if (isNaN(montoNumber) || montoNumber <= 0) {
    return res
      .status(400)
      .json({ mensajeError: 'El monto de recaudación debe ser mayor a 0' });
  }

  let t;

  try {
    t = await db.transaction();

    // 1) Buscar caja abierta del local (la más reciente)
    const caja = await CajaModel.findOne({
      where: {
        local_id,
        fecha_cierre: null
      },
      order: [['fecha_apertura', 'DESC']],
      transaction: t
    });

    if (!caja) {
      await t.rollback();
      return res.status(400).json({
        mensajeError:
          'No se encontró una caja abierta para el local seleccionado. Abra una caja antes de registrar una recaudación.'
      });
    }

    // 2) Calcular saldo actual de la caja
    const saldoActual = await calcularSaldoCaja(caja.id, t);

    if (montoNumber > saldoActual) {
      await t.rollback();
      return res.status(400).json({
        mensajeError:
          'El monto a recaudar no puede ser mayor al saldo actual de la caja.',
        detalle: {
          saldoActual,
          montoSolicitado: montoNumber
        }
      });
    }

    // 3) Crear movimiento de caja (egreso por recaudación)
    const movimiento = await MovimientosCajaModel.create(
      {
        caja_id: caja.id,
        tipo: 'egreso',
        origen: 'retiro_recaudacion',
        descripcion: observaciones || `Recaudación de caja - Local ${local_id}`,
        monto: montoNumber,
        referencia: 'RECAUDACION'
      },
      { transaction: t }
    );

    // 4) Crear registro en caja_recaudaciones
    const recaudacion = await CajaRecaudacionesModel.create(
      {
        caja_id: caja.id,
        local_id,
        usuario_id,
        movimiento_caja_id: movimiento.id,
        monto: montoNumber,
        observaciones: observaciones || null
      },
      { transaction: t }
    );

    const saldoNuevo = saldoActual - montoNumber;

    await t.commit();

    return res.json({
      message: 'Recaudación registrada correctamente',
      data: {
        recaudacion,
        movimiento,
        saldoAntes: saldoActual,
        saldoDespues: saldoNuevo
      }
    });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(500).json({ mensajeError: error.message });
  }
};

/**
 * GET /caja/recaudaciones
 *
 * Listado global de recaudaciones con filtros:
 * - local_id (opcional)
 * - usuario_id (opcional)
 * - desde / hasta (opcional, rango de fecha_recaudacion)
 * - page / limit para paginación
 */
export const OBRS_CajaRecaudaciones_CTS = async (req, res) => {
  try {
    const {
      local_id,
      usuario_id,
      caja_id, // 👈 nuevo filtro opcional
      desde,
      hasta,
      page = 1,
      limit = 20
    } = req.query;

    const where = {};

    if (local_id) {
      where.local_id = local_id;
    }

    if (usuario_id) {
      where.usuario_id = usuario_id;
    }

    if (caja_id) {
      where.caja_id = caja_id;
    }

    if (desde || hasta) {
      where.fecha_recaudacion = {};
      if (desde) {
        where.fecha_recaudacion[Op.gte] = new Date(desde);
      }
      if (hasta) {
        where.fecha_recaudacion[Op.lte] = new Date(hasta);
      }
    }

    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 20;
    const offset = (pageNumber - 1) * limitNumber;

    const { count, rows } = await CajaRecaudacionesModel.findAndCountAll({
      where,
      order: [['fecha_recaudacion', 'DESC']],
      limit: limitNumber,
      offset
    });

    return res.json({
      total: count,
      page: pageNumber,
      totalPages: Math.ceil(count / limitNumber),
      limit: limitNumber,
      data: rows
    });
  } catch (error) {
    return res.status(500).json({ mensajeError: error.message });
  }
};


/**
 * GET /caja/recaudaciones/:id
 *
 * Devuelve el detalle de una recaudación por ID.
 */
export const OBR_CajaRecaudacion_CTS = async (req, res) => {
  const { id } = req.params;

  try {
    const recaudacion = await CajaRecaudacionesModel.findByPk(id);

    if (!recaudacion) {
      return res
        .status(404)
        .json({ mensajeError: 'Recaudación no encontrada' });
    }

    return res.json(recaudacion);
  } catch (error) {
    return res.status(500).json({ mensajeError: error.message });
  }
};

/**
 * DELETE /caja/recaudaciones/:id
 *
 * Elimina una recaudación y el movimiento de caja asociado.
 * (Si en el futuro querés auditoría hardcore, acá en vez de borrar
 * podríamos hacer una reversa con un movimiento "ingreso" espejo.)
 */
export const ER_CajaRecaudacion_CTS = async (req, res) => {
  const { id } = req.params;

  let t;
  try {
    t = await db.transaction();

    const recaudacion = await CajaRecaudacionesModel.findByPk(id, {
      transaction: t
    });

    if (!recaudacion) {
      await t.rollback();
      return res
        .status(404)
        .json({ mensajeError: 'Recaudación no encontrada' });
    }

    // 1) Borrar movimiento de caja asociado
    await MovimientosCajaModel.destroy({
      where: { id: recaudacion.movimiento_caja_id },
      transaction: t
    });

    // 2) Borrar registro de recaudación
    await CajaRecaudacionesModel.destroy({
      where: { id },
      transaction: t
    });

    await t.commit();

    return res.json({
      message: 'Recaudación eliminada correctamente',
      data: { id }
    });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(500).json({ mensajeError: error.message });
  }
};
