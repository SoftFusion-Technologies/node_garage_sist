/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 01 / 07 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (CTS_TB_Caja.js) contiene controladores para manejar operaciones CRUD sobre la tabla caja.
 *
 * Tema: Controladores - Caja
 * Capa: Backend
 */

// Importar el modelo
import MD_TB_Caja from '../../Models/Ventas/MD_TB_Caja.js';
const CajaModel = MD_TB_Caja.CajaModel;

// Obtener todas las cajas
export const OBRS_Caja_CTS = async (req, res) => {
  try {
    const cajas = await CajaModel.findAll({
      order: [['id', 'DESC']]
      // include: [{ model: LocalesModel }, { model: UserModel }]
    });
    res.json(cajas);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Obtener una caja por ID
export const OBR_Caja_CTS = async (req, res) => {
  try {
    const caja = await CajaModel.findByPk(req.params.id);
    if (!caja)
      return res.status(404).json({ mensajeError: 'Caja no encontrada' });
    res.json(caja);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Crear (abrir) una nueva caja
export const CR_Caja_CTS = async (req, res) => {
  const { local_id, usuario_id, saldo_inicial } = req.body;

  if (!local_id || !usuario_id || saldo_inicial === undefined) {
    return res.status(400).json({
      mensajeError:
        'Faltan campos obligatorios: local_id, usuario_id, saldo_inicial'
    });
  }

  try {
    const nuevaCaja = await CajaModel.create({
      local_id,
      usuario_id,
      saldo_inicial
    });
    res.json({ message: 'Caja abierta correctamente', caja: nuevaCaja });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Eliminar una caja
export const ER_Caja_CTS = async (req, res) => {
  try {
    const eliminado = await CajaModel.destroy({ where: { id: req.params.id } });

    if (!eliminado)
      return res.status(404).json({ mensajeError: 'Caja no encontrada' });

    res.json({ message: 'Caja eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Actualizar/cerrar una caja
export const UR_Caja_CTS = async (req, res) => {
  const { id } = req.params;

  try {
    const [updated] = await CajaModel.update(req.body, { where: { id } });

    if (updated === 1) {
      const actualizada = await CajaModel.findByPk(id);
      res.json({ message: 'Caja actualizada correctamente', actualizada });
    } else {
      res.status(404).json({ mensajeError: 'Caja no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Obtener todas las cajas de un local específico
export const OBRS_CajaByLocal_CTS = async (req, res) => {
  const { id } = req.params;
  try {
    const cajas = await CajaModel.findAll({
      where: { local_id: id },
      order: [['fecha_apertura', 'DESC']]
    });
    res.json(cajas);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};
