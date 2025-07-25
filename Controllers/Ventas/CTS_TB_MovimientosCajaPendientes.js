/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 25 / 07 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (CTS_TB_MovimientosCajaPendientes.js) contiene controladores para manejar operaciones CRUD sobre la tabla movimientos_caja_pendientes.
 *
 * Tema: Controladores - Movimientos de Caja Pendientes
 * Capa: Backend
 */

// Importar el modelo
import MD_TB_MovimientosCajaPendientes from '../../Models/Ventas/MD_TB_MovimientosCajaPendientes.js';
const MovimientosCajaPendientesModel =
  MD_TB_MovimientosCajaPendientes.MovimientosCajaPendientesModel;

// Obtener todos los movimientos pendientes
export const OBRS_MovimientosCajaPendientes_CTS = async (req, res) => {
  try {
    const movimientos = await MovimientosCajaPendientesModel.findAll({
      order: [['id', 'DESC']]
    });
    res.json(movimientos);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Obtener movimientos pendientes por local
export const OBRS_MovimientosCajaPendientesByLocal_CTS = async (req, res) => {
  const { local_id } = req.params;
  try {
    const movimientos = await MovimientosCajaPendientesModel.findAll({
      where: { local_id },
      order: [['id', 'DESC']]
    });
    res.json(movimientos);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Obtener un movimiento pendiente por ID
export const OBR_MovimientoCajaPendiente_CTS = async (req, res) => {
  try {
    const movimiento = await MovimientosCajaPendientesModel.findByPk(
      req.params.id
    );
    if (!movimiento)
      return res
        .status(404)
        .json({ mensajeError: 'Movimiento pendiente no encontrado' });
    res.json(movimiento);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Crear un nuevo movimiento pendiente
export const CR_MovimientoCajaPendiente_CTS = async (req, res) => {
  const { local_id, tipo, descripcion, monto, fecha, referencia } = req.body;

  if (!local_id || !tipo || !monto) {
    return res.status(400).json({
      mensajeError: 'Faltan campos obligatorios: local_id, tipo, monto'
    });
  }

  try {
    const nuevo = await MovimientosCajaPendientesModel.create({
      local_id,
      tipo,
      descripcion,
      monto,
      fecha,
      referencia
    });
    res.json({
      message: 'Movimiento pendiente creado correctamente',
      movimiento: nuevo
    });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Eliminar un movimiento pendiente
export const ER_MovimientoCajaPendiente_CTS = async (req, res) => {
  try {
    const eliminado = await MovimientosCajaPendientesModel.destroy({
      where: { id: req.params.id }
    });

    if (!eliminado)
      return res
        .status(404)
        .json({ mensajeError: 'Movimiento pendiente no encontrado' });

    res.json({ message: 'Movimiento pendiente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Actualizar un movimiento pendiente
export const UR_MovimientoCajaPendiente_CTS = async (req, res) => {
  const { id } = req.params;

  try {
    const [updated] = await MovimientosCajaPendientesModel.update(req.body, {
      where: { id }
    });

    if (updated === 1) {
      const actualizado = await MovimientosCajaPendientesModel.findByPk(id);
      res.json({
        message: 'Movimiento pendiente actualizado correctamente',
        actualizado
      });
    } else {
      res
        .status(404)
        .json({ mensajeError: 'Movimiento pendiente no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};
