// controllers/ventasController.js
import { Op, Sequelize } from 'sequelize';
import { StockModel } from '../../Models/Stock/MD_TB_Stock.js';
import { ProductosModel } from '../../Models/Stock/MD_TB_Productos.js';
import { TallesModel } from '../../Models/Stock/MD_TB_Talles.js';

/** 1. Búsqueda simple por SKU o nombre, sin agrupación (detalle por talle) */
export const buscarItemsVenta = async (req, res) => {
  const { query } = req.query;

  try {
    const items = await StockModel.findAll({
      where: {
        cantidad: { [Op.gt]: 0 },
        [Op.or]: [
          { codigo_sku: { [Op.like]: `%${query}%` } },
          { '$producto.nombre$': { [Op.like]: `%${query}%` } }
        ]
      },
      include: [
        {
          model: ProductosModel,
          as: 'producto',
          attributes: ['id', 'nombre', 'precio']
        }
      ],
      limit: 20
    });

    const respuesta = items.map((s) => ({
      stock_id: s.id,
      producto_id: s.producto.id,
      nombre: `${s.producto.nombre} (${s.codigo_sku || 'sin SKU'})`,
      precio: parseFloat(s.producto.precio),
      talla_id: s.talle_id,
      cantidad_disponible: s.cantidad,
      codigo_sku: s.codigo_sku
    }));

    res.json(respuesta);
  } catch (error) {
    console.error('Error en búsqueda de stock:', error);
    res.status(500).json({ message: 'Error en búsqueda' });
  }
};

/** 2. Búsqueda agrupada por producto con stock total, sin detalle de talles */
export const buscarItemsVentaAgrupado = async (req, res) => {
  const { query } = req.query;

  try {
    const items = await StockModel.findAll({
      attributes: [
        'producto_id',
        [Sequelize.fn('SUM', Sequelize.col('cantidad')), 'cantidad_total']
      ],
      where: {
        cantidad: { [Op.gt]: 0 }
      },
      include: [
        {
          model: ProductosModel,
          as: 'producto',
          attributes: ['id', 'nombre', 'precio']
        }
      ],
      group: [
        'producto_id',
        'producto.id',
        'producto.nombre',
        'producto.precio'
      ],
      having: Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.col('producto.nombre')),
        {
          [Op.like]: `%${query?.toLowerCase() || ''}%`
        }
      ),
      limit: 20
    });

    const respuesta = items.map((s) => ({
      producto_id: s.producto_id,
      nombre: s.producto.nombre,
      precio: parseFloat(s.producto.precio),
      cantidad_total: parseInt(s.get('cantidad_total'), 10)
    }));

    res.json(respuesta);
  } catch (error) {
    console.error('Error en búsqueda agrupada de stock:', error);
    res.status(500).json({ message: 'Error en búsqueda' });
  }
};

/** 3. Búsqueda detallada con talles y stock para selección exacta */
export const buscarItemsVentaDetallado = async (req, res) => {
  const { query } = req.query;

  try {
    const items = await StockModel.findAll({
      where: {
        cantidad: { [Op.gt]: 0 },
        [Op.or]: [
          { codigo_sku: { [Op.like]: `%${query}%` } },
          { '$producto.nombre$': { [Op.like]: `%${query}%` } }
        ]
      },
      include: [
        {
          model: ProductosModel,
          as: 'producto',
          attributes: ['id', 'nombre', 'precio']
        },
        {
          model: TallesModel,
          as: 'talle',
          attributes: ['id', 'nombre']
        }
      ],
      limit: 50
    });

    // Devolver con detalle por talle
    const respuesta = items.map((s) => ({
      stock_id: s.id,
      producto_id: s.producto.id,
      nombre: s.producto.nombre,
      precio: parseFloat(s.producto.precio),
      talle_id: s.talle_id,
      talle_nombre: s.talle?.nombre || 'Sin talle',
      cantidad_disponible: s.cantidad,
      codigo_sku: s.codigo_sku
    }));

    res.json(respuesta);
  } catch (error) {
    console.error('Error en búsqueda detallada de stock:', error);
    res.status(500).json({ message: 'Error en búsqueda detallada' });
  }
};
