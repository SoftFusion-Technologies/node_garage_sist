/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 23 / 06 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo contiene los controladores para manejar operaciones CRUD
 * sobre la tabla de categorías.
 *
 * Tema: Controladores - Categorías
 * Capa: Backend
 *
 * Nomenclatura:
 *   OBR_  obtenerRegistro
 *   OBRS_ obtenerRegistros
 *   CR_   crearRegistro
 *   ER_   eliminarRegistro
 *   UR_   actualizarRegistro
 */

// Importar modelo
import { CategoriasModel } from '../../Models/Stock/MD_TB_Categorias.js';

// Obtener todas las categorías
export const OBRS_Categorias_CTS = async (req, res) => {
  try {
    const categorias = await CategoriasModel.findAll();
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Obtener una sola categoría por ID
export const OBR_Categoria_CTS = async (req, res) => {
  try {
    const categoria = await CategoriasModel.findByPk(req.params.id);

    if (!categoria) {
      return res.status(404).json({ mensajeError: 'Categoría no encontrada' });
    }

    res.json(categoria);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Crear nueva categoría
export const CR_Categoria_CTS = async (req, res) => {
  const { nombre, descripcion, estado } = req.body;

  try {
    const nueva = await CategoriasModel.create({
      nombre,
      descripcion,
      estado: estado || 'activo'
    });

    res.json({ message: 'Categoría creada correctamente', categoria: nueva });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Actualizar una categoría
export const UR_Categoria_CTS = async (req, res) => {
  const { id } = req.params;

  try {
    const [updated] = await CategoriasModel.update(req.body, {
      where: { id }
    });

    if (updated === 1) {
      const actualizado = await CategoriasModel.findByPk(id);
      res.json({ message: 'Categoría actualizada', actualizado });
    } else {
      res.status(404).json({ mensajeError: 'Categoría no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Eliminar una categoría
export const ER_Categoria_CTS = async (req, res) => {
  const { id } = req.params;

  try {
    const eliminado = await CategoriasModel.destroy({ where: { id } });

    if (!eliminado) {
      return res.status(404).json({ mensajeError: 'Categoría no encontrada' });
    }

    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};
