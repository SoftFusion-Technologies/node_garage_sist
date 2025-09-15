/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 02 / 08 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (CTS_TB_Combos.js) contiene controladores para manejar operaciones CRUD sobre la tabla de combos.
 *
 * Tema: Controladores - Combos
 * Capa: Backend
 */

import { CombosModel } from '../../Models/Combos/MD_TB_Combos.js';
import db from '../../DataBase/db.js';
import { Op } from 'sequelize';

// Obtener combos con paginación
export const OBRS_Combos_CTS = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,         // page size por defecto
      pageSize,           // alias soportado
      offset,             // si viene, prioriza
      q = '',             // búsqueda por nombre
      estado              // 'activo' | 'inactivo'
    } = req.query;

    const size = parseInt(pageSize ?? limit, 10) || 12;
    const pg   = parseInt(page, 10) || 1;
    const off  = offset !== undefined ? Math.max(0, parseInt(offset, 10)) : (pg - 1) * size;

    const where = {};
    if (q && q.trim()) {
      where.nombre = { [Op.like]: `%${q.trim()}%` };
    }
    if (estado && ['activo', 'inactivo'].includes(estado)) {
      where.estado = estado;
    }

    const { rows, count } = await CombosModel.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      limit: size,
      offset: off
    });

    const totalPages = Math.max(1, Math.ceil(count / size));
    const currentPage = offset !== undefined ? Math.floor(off / size) + 1 : pg;

    res.json({
      data: rows,
      meta: {
        total: count,
        page: currentPage,
        pageSize: size,
        offset: off,
        totalPages
      }
    });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Obtener un solo combo por ID
export const OBR_Combo_CTS = async (req, res) => {
  try {
    const combo = await CombosModel.findByPk(req.params.id);
    if (!combo)
      return res.status(404).json({ mensajeError: 'Combo no encontrado' });
    res.json(combo);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Crear un nuevo combo
export const CR_Combo_CTS = async (req, res) => {
  const { nombre, descripcion, precio_fijo, cantidad_items, estado } = req.body;

  // Validaciones
  if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 3) {
    return res.status(400).json({ mensajeError: 'Nombre mínimo 3 caracteres.' });
  }
  const precio = Number(precio_fijo);
  if (!Number.isFinite(precio) || precio <= 0) {
    return res.status(400).json({ mensajeError: 'precio_fijo debe ser > 0.' });
  }
  const cant = parseInt(cantidad_items, 10);
  if (!Number.isInteger(cant) || cant <= 0) {
    return res.status(400).json({ mensajeError: 'cantidad_items debe ser entero > 0.' });
  }
  if (estado && !['activo','inactivo'].includes(estado)) {
    return res.status(400).json({ mensajeError: "estado inválido (activo|inactivo)." });
  }

  try {
    const nuevoCombo = await CombosModel.create({
      nombre: nombre.trim(),
      descripcion: descripcion ?? null,
      precio_fijo: precio,
      cantidad_items: cant,
      estado: estado || 'activo'
    });
    res.json({ message: 'Combo creado correctamente', combo: nuevoCombo });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Actualizar un combo
export const UR_Combo_CTS = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio_fijo, cantidad_items, estado } = req.body;

  // Validaciones (solo si vienen)
  const payload = {};
  if (nombre !== undefined) {
    if (typeof nombre !== 'string' || nombre.trim().length < 3)
      return res.status(400).json({ mensajeError: 'Nombre mínimo 3 caracteres.' });
    payload.nombre = nombre.trim();
  }
  if (descripcion !== undefined) payload.descripcion = descripcion;

  if (precio_fijo !== undefined) {
    const precio = Number(precio_fijo);
    if (!Number.isFinite(precio) || precio <= 0)
      return res.status(400).json({ mensajeError: 'precio_fijo debe ser > 0.' });
    payload.precio_fijo = precio;
  }

  if (cantidad_items !== undefined) {
    const cant = parseInt(cantidad_items, 10);
    if (!Number.isInteger(cant) || cant <= 0)
      return res.status(400).json({ mensajeError: 'cantidad_items debe ser entero > 0.' });
    payload.cantidad_items = cant;
  }

  if (estado !== undefined) {
    if (!['activo','inactivo'].includes(estado))
      return res.status(400).json({ mensajeError: "estado inválido (activo|inactivo)." });
    payload.estado = estado;
  }

  try {
    const [updated] = await CombosModel.update(payload, { where: { id } });
    if (updated === 1) {
      const actualizado = await CombosModel.findByPk(id);
      res.json({ message: 'Combo actualizado correctamente', actualizado });
    } else {
      res.status(404).json({ mensajeError: 'Combo no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Eliminar un combo
export const ER_Combo_CTS = async (req, res) => {
  try {
    const eliminado = await CombosModel.destroy({
      where: { id: req.params.id }
    });

    if (!eliminado) {
      return res.status(404).json({ mensajeError: 'Combo no encontrado' });
    }

    res.json({ message: 'Combo eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Buscar combos por nombre (autosuggest)
export const SEARCH_Combos_CTS = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) return res.json([]);

    const combos = await CombosModel.findAll({
      where: {
        nombre: { [Op.like]: `%${query.trim()}%` }
      },
      order: [['nombre', 'ASC']]
    });

    if (combos.length > 0) return res.json(combos);
    return res
      .status(404)
      .json({ mensajeError: 'No se encontraron resultados' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};
