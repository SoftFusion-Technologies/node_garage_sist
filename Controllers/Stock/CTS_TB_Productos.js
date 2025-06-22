/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 21 / 06 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (CTS_TB_Productos.js) contiene controladores para manejar operaciones CRUD sobre la tabla de productos.
 *
 * Tema: Controladores - Productos
 * Capa: Backend
 *
 * Nomenclatura:
 *   OBR_  obtenerRegistro
 *   OBRS_ obtenerRegistros
 *   CR_   crearRegistro
 *   ER_   eliminarRegistro
 *   UR_   actualizarRegistro
 */

// Importar el modelo
import MD_TB_Productos from '../../Models/Stock/MD_TB_Productos.js';
const ProductosModel = MD_TB_Productos.ProductosModel;

import { StockModel } from '../../Models/Stock/MD_TB_Stock.js'; // Asegurate de tenerlo

// Obtener todos los productos
export const OBRS_Productos_CTS = async (req, res) => {
  try {
    const productos = await ProductosModel.findAll();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Obtener un solo producto por ID
export const OBR_Producto_CTS = async (req, res) => {
  try {
    const producto = await ProductosModel.findByPk(req.params.id);
    if (!producto) {
      return res.status(404).json({ mensajeError: 'Producto no encontrado' });
    }
    res.json(producto);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Crear un nuevo producto
// ✅ Controlador corregido
export const CR_Producto_CTS = async (req, res) => {
  const { nombre, descripcion, categoria, precio, imagen_url, estado } =
    req.body;

  console.log('BODY RECIBIDO:', req.body); // 👈 DEBUG

  try {
    const nuevo = await ProductosModel.create({
      nombre,
      descripcion,
      categoria,
      precio: parseFloat(precio), // 👈 Convertís acá
      imagen_url,
      estado
    });

    res.json({ message: 'Producto creado correctamente', producto: nuevo });
  } catch (error) {
    console.error('❌ Error en CR_Producto_CTS:', error);
    res.status(500).json({ mensajeError: error.message });
  }
};

// Eliminar un producto
export const ER_Producto_CTS = async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si hay stock asociado
    const tieneStock = await StockModel.findOne({ where: { producto_id: id } });

    if (tieneStock) {
      return res.status(409).json({
        mensajeError:
          'Este producto tiene stock asociado. ¿Desea eliminarlo de todas formas incluyendo el stock?'
      });
    }

    // Eliminar el producto directamente si no tiene stock
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
      const actualizado = await ProductosModel.findByPk(id);
      res.json({ message: 'Producto actualizado correctamente', actualizado });
    } else {
      res.status(404).json({ mensajeError: 'Producto no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};
