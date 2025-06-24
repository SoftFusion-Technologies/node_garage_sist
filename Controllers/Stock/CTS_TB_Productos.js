/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 21 / 06 / 2025
 * Versión: 2.0
 *
 * Descripción:
 * Este archivo contiene controladores CRUD para productos,
 * ahora con categoría relacionada por FK.
 */

// Importar modelo de productos y categoría
import MD_TB_Productos from '../../Models/Stock/MD_TB_Productos.js';
import { CategoriasModel } from '../../Models/Stock/MD_TB_Categorias.js';
import { StockModel } from '../../Models/Stock/MD_TB_Stock.js';

const ProductosModel = MD_TB_Productos.ProductosModel;

// Obtener todos los productos con categoría incluida
export const OBRS_Productos_CTS = async (req, res) => {
  try {
    const productos = await ProductosModel.findAll({
      include: {
        model: CategoriasModel,
        as: 'categoria',
        attributes: ['id', 'nombre']
      }
    });
    res.json(productos);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Obtener un solo producto por ID con su categoría
export const OBR_Producto_CTS = async (req, res) => {
  try {
    const producto = await ProductosModel.findByPk(req.params.id, {
      include: {
        model: CategoriasModel,
        as: 'categoria',
        attributes: ['id', 'nombre']
      }
    });

    if (!producto) {
      return res.status(404).json({ mensajeError: 'Producto no encontrado' });
    }

    res.json(producto);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Crear un nuevo producto
export const CR_Producto_CTS = async (req, res) => {
  const { nombre, descripcion, categoria_id, precio, imagen_url, estado } =
    req.body;

  try {
    const nuevo = await ProductosModel.create({
      nombre,
      descripcion,
      categoria_id,
      precio: parseFloat(precio),
      imagen_url,
      estado
    });

    res.json({ message: 'Producto creado correctamente', producto: nuevo });
  } catch (error) {
    console.error('❌ Error en CR_Producto_CTS:', error);
    res.status(500).json({ mensajeError: error.message });
  }
};

// Eliminar un producto si no tiene stock
export const ER_Producto_CTS = async (req, res) => {
  const { id } = req.params;

  try {
    const tieneStock = await StockModel.findOne({ where: { producto_id: id } });

    if (tieneStock) {
      return res.status(409).json({
        mensajeError:
          'Este producto tiene stock asociado. ¿Desea eliminarlo de todas formas incluyendo el stock?'
      });
    }

    const eliminado = await ProductosModel.destroy({ where: { id } });

    if (!eliminado) {
      return res.status(404).json({ mensajeError: 'Producto no encontrado' });
    }

    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Actualizar un producto
export const UR_Producto_CTS = async (req, res) => {
  const { id } = req.params;

  try {
    const [updated] = await ProductosModel.update(req.body, {
      where: { id }
    });

    if (updated === 1) {
      const actualizado = await ProductosModel.findByPk(id, {
        include: {
          model: CategoriasModel,
          as: 'categoria',
          attributes: ['id', 'nombre']
        }
      });

      res.json({ message: 'Producto actualizado correctamente', actualizado });
    } else {
      res.status(404).json({ mensajeError: 'Producto no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};
