// controllers/stock/categoriasController.js
/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 23 / 06 / 2025
 * Versión: 1.1  (24 / 06 / 2025)
 *
 * Cambios v1.1:
 *   • OBRS_Categorias_CTS: agrega cantidadProductos
 *   • OBR_Categoria_CTS  : agrega cantidadProductos
 *   • ER_Categoria_CTS   : bloquea/forza eliminación si hay productos
 */

import { Op, fn, col, literal } from 'sequelize';
import { CategoriasModel } from '../../Models/Stock/MD_TB_Categorias.js';
import { ProductosModel } from '../../Models/Stock/MD_TB_Productos.js'; // ⬅️ tu modelo de productos

import {
  parsePagination,
  buildMeta,
  buildLinks,
  buildLikeFilter
} from '../../Utils/pagination.js';

/* =========================================================================
 * GET /categorias  → paginado + búsqueda + orden + count de productos
 * Query: ?page=1&per_page=12&q=ropa&sort=nombre&dir=asc
 * =======================================================================*/
export const OBRS_Categorias_CTS = async (req, res) => {
  try {
    const { page, perPage, limit, offset } = parsePagination(req.query, {
      maxPerPage: 100
    });

    const { q, estado } = req.query;
    let { sort = 'nombre', dir = 'asc' } = req.query;
    dir = String(dir).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    // where
    const where = {};
    if (estado && ['activo', 'inactivo'].includes(estado)) {
      where.estado = estado;
    }
    if (q && q.trim()) {
      where[Op.or] = buildLikeFilter(q, ['nombre', 'descripcion']);
    }

    // nombres de tablas (compatibles con schemas)
    const ct = CategoriasModel.getTableName();
    const pt = ProductosModel.getTableName();
    const catTable = typeof ct === 'string' ? ct : ct.tableName; // e.g. "categorias"
    const prodTable = typeof pt === 'string' ? pt : pt.tableName; // e.g. "productos"

    // subquery para el conteo
    const countLiteral = literal(
      `(SELECT COUNT(*) FROM ${prodTable} p WHERE p.categoria_id = ${catTable}.id)`
    );

    // orden
    const order =
      String(sort) === 'cantidadProductos'
        ? [[countLiteral, dir]]
        : [[sort, dir]]; // nombre/estado/created_at/etc del modelo base

    const { rows, count } = await CategoriasModel.findAndCountAll({
      where,
      limit,
      offset,
      attributes: {
        include: [[countLiteral, 'cantidadProductos']]
      },
      order
    });

    res.json({
      data: rows,
      meta: buildMeta({ page, perPage, total: count }),
      links: buildLinks(req, { page, perPage, total: count })
    });
  } catch (error) {
    console.error('OBRS_Categorias_CTS:', error);
    res.status(500).json({ mensajeError: error.message });
  }
};

// GET /categorias/all  -> array simple para combos/selects
export const OBRS_Categorias_All_CTS = async (req, res) => {
  try {
    const where = {};
    if (req.query.estado) where.estado = req.query.estado; // opcional

    const filas = await CategoriasModel.findAll({
      where,
      attributes: ['id', 'nombre', 'descripcion', 'estado'],
      order: [['nombre', 'ASC']]
    });

    res.json(filas); // <- array directo
  } catch (error) {
    console.error('OBRS_Categorias_All_CTS:', error);
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================================================================
 * 2) Obtener UNA categoría por ID + cantidad de productos
 *    GET /categorias/:id
 * =======================================================================*/
export const OBR_Categoria_CTS = async (req, res) => {
  try {
    const row = await CategoriasModel.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: ProductosModel,
          as: 'productos',
          attributes: [],
          required: false
        }
      ],
      attributes: {
        include: [[fn('COUNT', col('productos.id')), 'cantidadProductos']]
      },
      group: ['categorias.id']
    });

    if (!row) {
      return res.status(404).json({ mensajeError: 'Categoría no encontrada' });
    }

    res.json(row);
  } catch (error) {
    console.error('OBR_Categoria_CTS:', error);
    res.status(500).json({ mensajeError: error.message });
  }
};

/* =========================================================================
 * 3) Crear nueva categoría (sin cambios)
 * =======================================================================*/
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

/* =========================================================================
 * 4) Actualizar categoría (sin cambios relevantes)
 * =======================================================================*/
export const UR_Categoria_CTS = async (req, res) => {
  const { id } = req.params;
  try {
    const [updated] = await CategoriasModel.update(req.body, { where: { id } });
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

/* =========================================================================
 * 5) Eliminar categoría con protección FORZAR
 *    DELETE /categorias/:id?forzar=true
 * =======================================================================*/
export const ER_Categoria_CTS = async (req, res) => {
  const { id } = req.params;
  const forzar = req.query.forzar === 'true';

  try {
    const tieneProductos = await ProductosModel.findOne({
      where: { categoria_id: id }
    });

    // Si tiene productos y NO se fuerza, abortamos
    if (tieneProductos && !forzar) {
      return res.status(409).json({
        mensajeError:
          'Esta CATEGORÍA tiene productos asociados. ¿Desea eliminarla de todas formas?'
      });
    }

    // Si tiene productos y se fuerza, desvinculamos
    if (tieneProductos && forzar) {
      await ProductosModel.update(
        { categoria_id: null },
        { where: { categoria_id: id } }
      );
    }

    const eliminado = await CategoriasModel.destroy({ where: { id } });

    if (!eliminado) {
      return res.status(404).json({ mensajeError: 'Categoría no encontrada' });
    }

    res.json({
      message: tieneProductos
        ? 'Categoría eliminada y productos desvinculados.'
        : 'Categoría eliminada correctamente.'
    });
  } catch (error) {
    console.error('ER_Categoria_CTS:', error);
    res.status(500).json({ mensajeError: error.message });
  }
};
