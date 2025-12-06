/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 05 / 12 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (MD_TB_CajaRecaudaciones.js) contiene la definición del modelo Sequelize
 * para la tabla 'caja_recaudaciones'.
 *
 * La tabla almacena el historial de recaudaciones (retiros de efectivo) realizados
 * desde las distintas cajas por local y usuario, vinculados a su movimiento de caja.
 *
 * Tema: Modelos - Caja / Recaudaciones
 * Capa: Backend
 */

// Importaciones
import dotenv from 'dotenv';
import db from '../../DataBase/db.js';
import { DataTypes } from 'sequelize';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Definición del modelo de la tabla 'caja_recaudaciones'
export const CajaRecaudacionesModel = db.define(
  'caja_recaudaciones',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    caja_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment:
        'FK a la tabla caja. Indica desde qué caja se realiza la recaudación.'
    },
    local_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment:
        'FK a la tabla locales. Indica el local asociado a la recaudación.'
    },
    usuario_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment:
        'FK a la tabla usuarios. Usuario del sistema que registra la recaudación.'
    },
    movimiento_caja_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment:
        'FK a movimientos_caja. Movimiento de egreso asociado (origen = retiro_recaudacion).'
    },
    monto: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Importe recaudado (retirado de la caja) en esta operación.'
    },
    fecha_recaudacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha y hora en la que se registra la recaudación.'
    },
    observaciones: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Texto libre para comentarios internos sobre la recaudación.'
    }
  },
  {
    tableName: 'caja_recaudaciones',
    timestamps: false
  }
);

export default {
  CajaRecaudacionesModel
};
