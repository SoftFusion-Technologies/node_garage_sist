// controllers/ventasController.js
import { Op } from 'sequelize';
import { StockModel } from '../../Models/Stock/MD_TB_Stock.js';
import { ProductosModel } from '../../Models/Stock/MD_TB_Productos.js';

export const buscarItemsVenta = async (req, res) => {
  const { query } = req.query;

  try {
    const items = await StockModel.findAll({
      where: {
        cantidad: { [Op.gt]: 0 }, // Solo stock disponible
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

    // Flatten para simplificar el frontend
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
