/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 02 / 08 / 2025
 * Última Modificación: 14 / 09 / 2025
 * Versión: 1.1
 *
 * Descripción:
 * Controladores CRUD para combo_productos_permitidos con soporte de talle_id.
 *
 * Tema: Controladores - Combos
 * Capa: Backend
 */

// Modelos
import { ComboProductosPermitidosModel } from '../../Models/Combos/MD_TB_ComboProductosPermitidos.js';
import { CombosModel } from '../../Models/Combos/MD_TB_Combos.js';
import { ProductosModel } from '../../Models/Stock/MD_TB_Productos.js';
import { CategoriasModel } from '../../Models/Stock/MD_TB_Categorias.js';
import { TallesModel } from '../../Models/Stock/MD_TB_Talles.js';
// para validar stock del talle:
import { StockModel } from '../../Models/Stock/MD_TB_Stock.js';

import { Op } from 'sequelize';

// Utils simples
const toInt = (v) =>
  v === undefined || v === null || v === '' ? null : parseInt(v, 10);

/* ========================= LISTADOS ========================= */

// Obtener todos
export const OBRS_ComboProductosPermitidos_CTS = async (_req, res) => {
  try {
    const registros = await ComboProductosPermitidosModel.findAll({
      include: [
        { model: CombosModel, as: 'combo' },
        { model: ProductosModel, as: 'producto' },
        { model: CategoriasModel, as: 'categoria' },
        { model: TallesModel, as: 'talle', attributes: ['id', 'nombre'] } // 👈 incluir talle
      ],
      order: [['id', 'DESC']]
    });

    res.json(registros);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Por combo_id
export const OBRS_PermitidosPorCombo_CTS = async (req, res) => {
  const combo_id = toInt(req.params.combo_id);

  try {
    const registros = await ComboProductosPermitidosModel.findAll({
      where: { combo_id },
      include: [
        { model: ProductosModel, as: 'producto' },
        { model: CategoriasModel, as: 'categoria' },
        { model: TallesModel, as: 'talle', attributes: ['id', 'nombre'] }
      ],
      order: [['id', 'ASC']]
    });

    res.json(registros);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* ========================= CREAR ========================= */

export const CR_ComboProductoPermitido_CTS = async (req, res) => {
  const combo_id = toInt(req.body.combo_id);
  const producto_id = toInt(req.body.producto_id);
  const categoria_id = toInt(req.body.categoria_id);
  const talle_id = toInt(req.body.talle_id);

  // Validaciones
  if (!combo_id || (!producto_id && !categoria_id)) {
    return res.status(400).json({
      mensajeError:
        'Debe proporcionar combo_id y producto_id o categoria_id (uno solo).'
    });
  }

  // XOR: no ambos
  if (producto_id && categoria_id) {
    return res.status(400).json({
      mensajeError: 'Envíe producto_id O categoria_id (no ambos).'
    });
  }

  // talle_id sólo si hay producto_id
  if (talle_id && !producto_id) {
    return res.status(400).json({
      mensajeError: 'talle_id sólo es válido cuando se envía producto_id.'
    });
  }

  // (Opcional) validar que el talle exista
  if (talle_id) {
    const existeTalle = await TallesModel.findByPk(talle_id);
    if (!existeTalle) {
      return res.status(400).json({ mensajeError: 'El talle_id no existe.' });
    }
  }

  // validar que el talle pertenezca a ese producto y tenga stock
  if (talle_id) {
    const existeStock = await StockModel.findOne({
      where: { producto_id, talle_id }
    });
    if (!existeStock) {
      return res
        .status(400)
        .json({
          mensajeError: 'El talle no corresponde al producto o no tiene stock.'
        });
    }
  }

  try {
    const nuevo = await ComboProductosPermitidosModel.create({
      combo_id,
      producto_id: producto_id ?? null,
      categoria_id: categoria_id ?? null,
      talle_id: talle_id ?? null
    });

    res
      .status(201)
      .json({ message: 'Registro creado correctamente', registro: nuevo });
  } catch (error) {
    // Único índice (combo_id, producto_id, COALESCE(talle_id,0)) puede arrojar duplicado
    if (
      error?.name === 'SequelizeUniqueConstraintError' ||
      error?.original?.code === 'ER_DUP_ENTRY'
    ) {
      return res.status(409).json({
        mensajeError: 'Ya existe la asignación para ese combo/producto/talle.'
      });
    }
    res.status(500).json({ mensajeError: error.message });
  }
};

/* ========================= ELIMINAR ========================= */

export const ER_ComboProductoPermitido_CTS = async (req, res) => {
  const id = toInt(req.params.id);

  try {
    const eliminado = await ComboProductosPermitidosModel.destroy({
      where: { id }
    });

    if (!eliminado) {
      return res.status(404).json({ mensajeError: 'Registro no encontrado' });
    }

    res.json({ message: 'Registro eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

/* ========================= ACTUALIZAR ========================= */

export const UR_ComboProductoPermitido_CTS = async (req, res) => {
  const id = toInt(req.params.id);
  const producto_id = toInt(req.body.producto_id);
  const categoria_id = toInt(req.body.categoria_id);
  const talle_id = toInt(req.body.talle_id);

  // Si mandan ambos, error
  if (producto_id && categoria_id) {
    return res.status(400).json({
      mensajeError: 'Envíe producto_id O categoria_id (no ambos).'
    });
  }

  // talle sin producto -> error
  if (talle_id && !producto_id) {
    return res.status(400).json({
      mensajeError: 'talle_id sólo es válido cuando se envía producto_id.'
    });
  }

  // (Opcional) validar existencia de talle
  if (talle_id) {
    const existeTalle = await TallesModel.findByPk(talle_id);
    if (!existeTalle) {
      return res.status(400).json({ mensajeError: 'El talle_id no existe.' });
    }
  }

  try {
    const [updated] = await ComboProductosPermitidosModel.update(
      {
        producto_id: producto_id ?? null,
        categoria_id: categoria_id ?? null,
        talle_id: producto_id ? talle_id ?? null : null // si pasaron a categoría, limpiamos talle
      },
      { where: { id } }
    );

    if (updated === 1) {
      const actualizado = await ComboProductosPermitidosModel.findByPk(id, {
        include: [
          { model: ProductosModel, as: 'producto' },
          { model: CategoriasModel, as: 'categoria' },
          { model: TallesModel, as: 'talle', attributes: ['id', 'nombre'] }
        ]
      });
      return res.json({
        message: 'Registro actualizado correctamente',
        actualizado
      });
    }

    res.status(404).json({ mensajeError: 'Registro no encontrado' });
  } catch (error) {
    if (
      error?.name === 'SequelizeUniqueConstraintError' ||
      error?.original?.code === 'ER_DUP_ENTRY'
    ) {
      return res.status(409).json({
        mensajeError: 'Ya existe la asignación para ese combo/producto/talle.'
      });
    }
    res.status(500).json({ mensajeError: error.message });
  }
};
