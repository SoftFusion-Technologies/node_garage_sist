/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 01 / 07 / 2025
 * Versión: 1.1
 *
 * Descripción:
 * Modelo Sequelize para la tabla 'clientes' con campos para campañas WhatsApp.
 *
 * Tema: Modelos - Clientes
 * Capa: Backend
 */

// Importaciones
import dotenv from 'dotenv';
import db from '../DataBase/db.js';
import { DataTypes } from 'sequelize';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Definición del modelo de la tabla 'clientes'
export const ClienteModel = db.define(
  'clientes',
  {
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    telefono: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    // NUEVO: teléfono normalizado E.164 (+549...)
    telefono_e164: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Número en formato E.164. Ej: +5493815796507'
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    direccion: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    dni: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    // NUEVO: opt-in / opt-out / bloqueado
    wa_opt_in: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    wa_opt_out_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    wa_blocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    origen_opt_in: {
      type: DataTypes.ENUM('manual', 'web', 'qr', 'compra', 'import'),
      allowNull: true
    },
    fecha_alta: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    fecha_ultima_compra: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'clientes',
    timestamps: false,
    // Nota: timestamps=false => Sequelize no maneja createdAt/updatedAt automáticamente.
    indexes: [
      { name: 'idx_clientes_tel_e164', fields: ['telefono_e164'] },
      { name: 'idx_clientes_wa_optin', fields: ['wa_opt_in'] }
    ],
    defaultScope: {
      // Evita traer emails enormes o datos innecesarios si luego querés ajustar
    },
    scopes: {
      conOptIn: { where: { wa_opt_in: true } },
      conE164: { where: { telefono_e164: { [db.Sequelize.Op.ne]: null } } }
    }
  }
);

export default {
  ClienteModel
};
