/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 01 / 07 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (CTS_TB_Ventas.js) contiene controladores para manejar operaciones CRUD sobre la tabla de ventas.
 *
 * Tema: Controladores - Ventas
 * Capa: Backend
 */

// Importar el modelo
import MD_TB_Ventas from '../../Models/Ventas/MD_TB_Ventas.js';
const VentasModel = MD_TB_Ventas.VentasModel;

import { UserModel } from '../../Models/MD_TB_Users.js';
import { LocalesModel } from '../../Models/Stock/MD_TB_Locales.js';
import { ClienteModel } from '../../Models/MD_TB_Clientes.js';
import { DetalleVentaModel } from '../../Models/Ventas/MD_TB_DetalleVenta.js';
import { StockModel } from '../../Models/Stock/MD_TB_Stock.js';
import { ProductosModel } from '../../Models/Stock/MD_TB_Productos.js';
import { TallesModel } from '../../Models/Stock/MD_TB_Talles.js';
import { VentaDescuentosModel } from '../../Models/Ventas/MD_TB_VentaDescuentos.js';
import { DetalleDevolucionModel } from '../../Models/Ventas/MD_TB_DetalleDevolucion.js';
import { DevolucionesModel } from '../../Models/Ventas/MD_TB_Devoluciones.js';
// Obtener todas las ventas
export const OBRS_Ventas_CTS = async (req, res) => {
  try {
    const ventas = await VentasModel.findAll({
      order: [['id', 'DESC']]
      // include: [{ model: ClienteModel }, { model: UserModel }, { model: LocalesModel }]
    });
    res.json(ventas);
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Obtener una venta por ID
export const OBR_Venta_CTS = async (req, res) => {
  try {
    const venta = await VentasModel.findByPk(req.params.id, {
      include: [
        {
          model: UserModel,
          attributes: ['id', 'nombre']
        },
        {
          model: LocalesModel,
          attributes: ['id', 'nombre']
        },
        {
          model: ClienteModel,
          attributes: ['id', 'nombre', 'dni']
        },
        {
          model: DetalleVentaModel,
          as: 'detalles',
          attributes: [
            'id',
            'venta_id',
            'stock_id',
            'cantidad',
            'precio_unitario',
            'descuento',
            'descuento_porcentaje',
            'precio_unitario_con_descuento'
          ],
          include: [
            {
              model: StockModel,
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
              ]
            }
          ]
        },
        {
          model: VentaDescuentosModel,
          as: 'descuentos'
        },
        // 🔁 Incluimos devoluciones y sus detalles (con vínculo al detalle_venta)
        {
          model: DevolucionesModel,
          as: 'devoluciones',
          attributes: ['id', 'fecha', 'total_devuelto'],
          include: [
            {
              model: DetalleDevolucionModel,
              as: 'detalles',
              attributes: ['id', 'cantidad', 'stock_id', 'detalle_venta_id'],
              include: [
                {
                  model: DetalleVentaModel,
                  as: 'detalle_venta',
                  attributes: ['id', 'cantidad']
                }
              ]
            }
          ]
        }
      ]
    });

    if (!venta) {
      return res.status(404).json({ mensajeError: 'Venta no encontrada' });
    }

    // Verificación rápida en backend (opcional)
    // console.dir(venta.devoluciones, { depth: null });

    res.json(venta);
  } catch (error) {
    console.error('Error al obtener venta:', error);
    res.status(500).json({ mensajeError: error.message });
  }
};


// Crear una nueva venta
export const CR_Venta_CTS = async (req, res) => {
  const {
    fecha,
    cliente_id,
    usuario_id,
    local_id,
    total,
    tipo_comprobante,
    nro_comprobante,
    estado
  } = req.body;

  if (total === undefined || total === null) {
    return res
      .status(400)
      .json({ mensajeError: 'El campo total es obligatorio.' });
  }

  try {
    const nuevaVenta = await VentasModel.create({
      fecha,
      cliente_id,
      usuario_id,
      local_id,
      total,
      tipo_comprobante,
      nro_comprobante,
      estado
    });
    res.json({ message: 'Venta creada correctamente', venta: nuevaVenta });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Eliminar una venta
export const ER_Venta_CTS = async (req, res) => {
  try {
    const eliminado = await VentasModel.destroy({
      where: { id: req.params.id }
    });
    if (!eliminado)
      return res.status(404).json({ mensajeError: 'Venta no encontrada' });

    res.json({ message: 'Venta eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};

// Actualizar una venta
export const UR_Venta_CTS = async (req, res) => {
  const { id } = req.params;

  try {
    const [updated] = await VentasModel.update(req.body, { where: { id } });

    if (updated === 1) {
      const actualizada = await VentasModel.findByPk(id);
      res.json({ message: 'Venta actualizada correctamente', actualizada });
    } else {
      res.status(404).json({ mensajeError: 'Venta no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ mensajeError: error.message });
  }
};
