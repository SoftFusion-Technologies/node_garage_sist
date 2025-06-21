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

// Relaciones de Stock con otras tablas
StockModel.belongsTo(ProductosModel, { foreignKey: 'producto_id' });
StockModel.belongsTo(TallesModel, { foreignKey: 'talle_id' });
StockModel.belongsTo(LocalesModel, { foreignKey: 'local_id' });
StockModel.belongsTo(LugaresModel, { foreignKey: 'lugar_id' });
StockModel.belongsTo(EstadosModel, { foreignKey: 'estado_id' });

// (Opcional) Si más adelante necesitás las relaciones inversas:
ProductosModel.hasMany(StockModel, { foreignKey: 'producto_id' });
TallesModel.hasMany(StockModel, { foreignKey: 'talle_id' });
LocalesModel.hasMany(StockModel, { foreignKey: 'local_id' });
LugaresModel.hasMany(StockModel, { foreignKey: 'lugar_id' });
EstadosModel.hasMany(StockModel, { foreignKey: 'estado_id' });
