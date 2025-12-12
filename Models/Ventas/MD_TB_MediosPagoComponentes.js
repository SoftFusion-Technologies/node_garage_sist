/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 12 / 12 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (MD_TB_MediosPagoComponentes.js) contiene la definición del modelo Sequelize
 * para la tabla de relación 'medios_pago_componentes', que permite definir medios de pago
 * compuestos (ej: "Efectivo + Transferencia") mediante N componentes.
 *
 * Tema: Modelos - Medios de Pago (Componentes)
 * Capa: Backend
 */

// Importaciones
import dotenv from 'dotenv';
import db from '../../DataBase/db.js';
import { DataTypes } from 'sequelize';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Definición del modelo de la tabla 'medios_pago_componentes'
export const MediosPagoComponentesModel = db.define(
  'medios_pago_componentes',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    medio_pago_compuesto_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    medio_pago_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    orden: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    activo: {
      type: DataTypes.TINYINT,
      defaultValue: 1
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },

    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default {
  MediosPagoComponentesModel
};
