/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 21 / 06 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (relaciones.js) define todas las relaciones entre los modelos Sequelize del sistema.
 *
 * Tema: Relaciones entre modelos
 * Capa: Backend
 */

// Importaciones de modelos
import { StockModel } from './Stock/MD_TB_Stock.js';
import { ProductosModel } from './Stock/MD_TB_Productos.js';
import { TallesModel } from './Stock/MD_TB_Talles.js';
import { LocalesModel } from './Stock/MD_TB_Locales.js';
import { LugaresModel } from './Stock/MD_TB_Lugares.js';
import { EstadosModel } from './Stock/MD_TB_Estados.js';
import { CategoriasModel } from './Stock/MD_TB_Categorias.js';

// RELACIONES MODULO DE VENTAS
import { VentasModel } from './Ventas/MD_TB_Ventas.js';
import { UserModel } from './MD_TB_Users.js';
import { ClienteModel } from './MD_TB_Clientes.js';
import { DetalleVentaModel } from './Ventas/MD_TB_DetalleVenta.js';
import { VentaMediosPagoModel } from './Ventas/MD_TB_VentaMediosPago.js';
import { MediosPagoModel } from './Ventas/MD_TB_MediosPago.js';
import { CajaModel } from './Ventas/MD_TB_Caja.js';
import { MovimientosCajaModel } from './Ventas/MD_TB_MovimientosCaja.js';

// RELACIONES MODULO DE VENTAS

// Relaciones de Stock con otras tablas

StockModel.belongsTo(LugaresModel, { foreignKey: 'lugar_id' });
StockModel.belongsTo(EstadosModel, { foreignKey: 'estado_id' });

StockModel.belongsTo(ProductosModel, { foreignKey: 'producto_id', as: 'producto' });
StockModel.belongsTo(TallesModel, { foreignKey: 'talle_id', as: 'talle' });
StockModel.belongsTo(LocalesModel, { foreignKey: 'local_id', as: 'local' }); // Opcional

// (Opcional) Si más adelante necesitás las relaciones inversas:
ProductosModel.hasMany(StockModel, { foreignKey: 'producto_id' });
TallesModel.hasMany(StockModel, { foreignKey: 'talle_id' });
LocalesModel.hasMany(StockModel, { foreignKey: 'local_id' });
LugaresModel.hasMany(StockModel, { foreignKey: 'lugar_id' });
EstadosModel.hasMany(StockModel, { foreignKey: 'estado_id' });
// Relación Producto pertenece a Categoría
ProductosModel.belongsTo(CategoriasModel, {
  foreignKey: 'categoria_id',
  as: 'categoria'
});

// (Opcional) Si querés ver qué productos tiene una categoría
CategoriasModel.hasMany(ProductosModel, {
  foreignKey: 'categoria_id',
  as: 'productos'
});

// RELACIONES MODULO DE VENTAS
VentasModel.belongsTo(ClienteModel, {
  foreignKey: 'cliente_id',
  as: 'cliente'
}); // <-- AGREGA as
VentasModel.belongsTo(UserModel, { foreignKey: 'usuario_id', as: 'usuario' }); // <-- AGREGA as
VentasModel.belongsTo(LocalesModel, { foreignKey: 'local_id', as: 'local' }); // <-- AGREGA as

ClienteModel.hasMany(VentasModel, { foreignKey: 'cliente_id' });
UserModel.hasMany(VentasModel, { foreignKey: 'usuario_id' });
LocalesModel.hasMany(VentasModel, { foreignKey: 'local_id' });

DetalleVentaModel.belongsTo(VentasModel, {
  foreignKey: 'venta_id',
  as: 'venta'
}); // Opcional, si querés inversa
DetalleVentaModel.belongsTo(StockModel, { foreignKey: 'stock_id' });

VentasModel.hasMany(DetalleVentaModel, {
  foreignKey: 'venta_id',
  as: 'detalles'
});
VentasModel.hasMany(VentaMediosPagoModel, {
  foreignKey: 'venta_id',
  as: 'venta_medios_pago' // Usa el nombre que prefieras, pero sé consistente
});

StockModel.hasMany(DetalleVentaModel, { foreignKey: 'stock_id' });

VentaMediosPagoModel.belongsTo(VentasModel, { foreignKey: 'venta_id' });
VentaMediosPagoModel.belongsTo(MediosPagoModel, {
  foreignKey: 'medio_pago_id'
});

// (Opcional) Relaciones en relaciones.js:
CajaModel.belongsTo(LocalesModel, { foreignKey: 'local_id' });
CajaModel.belongsTo(UserModel, { foreignKey: 'usuario_id' });

// (Opcional) Relaciones en relaciones.js:
MovimientosCajaModel.belongsTo(CajaModel, { foreignKey: 'caja_id' });

// RELACIONES MODULO DE VENTAS
