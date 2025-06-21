/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 21 / 06 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (CTS_TB_Estados.js) contiene controladores para manejar operaciones CRUD sobre la tabla de estados.
 *
 * Tema: Controladores - Estados
 * Capa: Backend
 */

// Importar el modelo
import MD_TB_Estados from '../../Models/Stock/MD_TB_Estados.js';
const EstadosModel = MD_TB_Estados.EstadosModel;

// Obtener todos los estados
export const OBRS_Estados_CTS = async (req, res) => {
  try {
    const estados = await EstadosModel.findAll();
    res.json(estados);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Obtener un estado por ID
export const OBR_Estado_CTS = async (req, res) => {
  try {
    const estado = await EstadosModel.findByPk(req.params.id);
    if (!estado) {
      return res.status(404).json({ mensajeError: 'Estado no encontrado' });
    }
    res.json(estado);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Crear un nuevo estado
export const CR_Estado_CTS = async (req, res) => {
  const { nombre } = req.body;

  if (!nombre) {
    return res
      .status(400)
      .json({ mensajeError: 'El nombre del estado es obligatorio' });
  }

  try {
    const nuevo = await EstadosModel.create({ nombre });
    res.json({ message: 'Estado creado correctamente', estado: nuevo });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Eliminar un estado
export const ER_Estado_CTS = async (req, res) => {
  try {
    const eliminado = await EstadosModel.destroy({
      where: { id: req.params.id }
    });

    if (!eliminado) {
      return res.status(404).json({ mensajeError: 'Estado no encontrado' });
    }

    res.json({ message: 'Estado eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Actualizar un estado
export const UR_Estado_CTS = async (req, res) => {
  const { id } = req.params;

  try {
    const [updated] = await EstadosModel.update(req.body, {
      where: { id }
    });

    if (updated === 1) {
      const actualizado = await EstadosModel.findByPk(id);
      res.json({ message: 'Estado actualizado correctamente', actualizado });
    } else {
      res.status(404).json({ mensajeError: 'Estado no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};
