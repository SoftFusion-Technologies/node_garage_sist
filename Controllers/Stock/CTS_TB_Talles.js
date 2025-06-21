/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 21 / 06 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (CTS_TB_Talles.js) contiene controladores para manejar operaciones CRUD sobre la tabla de talles.
 *
 * Tema: Controladores - Talles
 * Capa: Backend
 */

// Importar el modelo
import MD_TB_Talles from '../../Models/Stock/MD_TB_Talles.js';
const TallesModel = MD_TB_Talles.TallesModel;

// Obtener todos los talles
export const OBRS_Talles_CTS = async (req, res) => {
  try {
    const talles = await TallesModel.findAll();
    res.json(talles);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Obtener un solo talle por ID
export const OBR_Talle_CTS = async (req, res) => {
  try {
    const talle = await TallesModel.findByPk(req.params.id);
    if (!talle) {
      return res.status(404).json({ mensajeError: 'Talle no encontrado' });
    }
    res.json(talle);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Crear un nuevo talle
export const CR_Talle_CTS = async (req, res) => {
  const { nombre } = req.body;

  if (!nombre) {
    return res
      .status(400)
      .json({ mensajeError: 'El nombre del talle es obligatorio' });
  }

  try {
    const nuevo = await TallesModel.create({ nombre });
    res.json({ message: 'Talle creado correctamente', talle: nuevo });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Eliminar un talle
export const ER_Talle_CTS = async (req, res) => {
  try {
    const eliminado = await TallesModel.destroy({
      where: { id: req.params.id }
    });

    if (!eliminado) {
      return res.status(404).json({ mensajeError: 'Talle no encontrado' });
    }

    res.json({ message: 'Talle eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Actualizar un talle
export const UR_Talle_CTS = async (req, res) => {
  const { id } = req.params;

  try {
    const [updated] = await TallesModel.update(req.body, {
      where: { id }
    });

    if (updated === 1) {
      const actualizado = await TallesModel.findByPk(id);
      res.json({ message: 'Talle actualizado correctamente', actualizado });
    } else {
      res.status(404).json({ mensajeError: 'Talle no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};
