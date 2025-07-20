/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 01 / 07 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (MD_TB_Ventas.js) contiene la definición del modelo Sequelize para la tabla de ventas.
 *
 * Tema: Modelos - Ventas
 * Capa: Backend
 */

// Importaciones
import dotenv from 'dotenv';
import db from '../../DataBase/db.js';
import { DataTypes } from 'sequelize';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Definición del modelo de la tabla 'ventas'
export const VentasModel = db.define(
  'ventas',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    cliente_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    usuario_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    local_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    tipo_comprobante: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: null
    },
    nro_comprobante: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null
    },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'confirmada'
    },
    descuento_porcentaje: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    recargo_porcentaje: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    }
  },
  {
    timestamps: false,
    createdAt: 'fecha',
    updatedAt: false
  }
);

// (Opcional) Relaciones por fuera del modelo principal, se definen en relaciones.js

export default {
  VentasModel
};
