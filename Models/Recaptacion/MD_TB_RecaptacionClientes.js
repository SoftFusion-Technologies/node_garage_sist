/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 28 / 07 / 2025
 * Versión: 1.1
 *
 * Descripción:
 * Modelo Sequelize para 'recaptacion_clientes' con tracking de envíos WA.
 *
 * Tema: Modelos - Recaptación
 * Capa: Backend
 */

// Importaciones
import dotenv from 'dotenv';
import db from '../../DataBase/db.js';
import { DataTypes } from 'sequelize';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Definición del modelo de la tabla 'recaptacion_clientes'
export const RecaptacionClientesModel = db.define(
  'recaptacion_clientes',
  {
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    campana_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    /* ===== Envío y tracking WA ===== */
    wa_to: {
      type: DataTypes.STRING(20), // E.164
      allowNull: true,
      comment: 'Destino en E.164. Ej: +5493815796507'
    },
    status: {
      type: DataTypes.ENUM(
        'queued',
        'sent',
        'delivered',
        'read',
        'failed',
        'opted_out',
        'blocked'
      ),
      allowNull: false,
      defaultValue: 'queued'
    },
    wa_message_id: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    error_code: {
      type: DataTypes.STRING(32),
      allowNull: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    retries: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    last_event_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    /* ===== Campos originales ===== */
    fecha_envio: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW // en DB: DEFAULT CURRENT_TIMESTAMP
    },
    respuesta: {
      type: DataTypes.STRING(50), // 'comprado','respondido','ignorado','no respondido'
      allowNull: true
    },

    /* ===== NUEVOS: detalle de envío y auditoría ===== */
    mensaje_rendered: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Mensaje final personalizado que se envió al cliente'
    },
    attempt_no: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      comment: 'Número de intento (1, 2, 3...)'
    },
    sent_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Nombre/usuario legible de quien envió'
    },
    sent_by_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'FK a usuarios.id'
    },

    /* ===== Timestamps manuales ===== */
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'recaptacion_clientes',
    timestamps: false, // manejamos created_at/updated_at nosotros
    indexes: [
      {
        name: 'uq_recaptacion_campana_cliente',
        unique: true,
        fields: ['campana_id', 'cliente_id']
      },
      { name: 'idx_rc_status', fields: ['status'] },
      { name: 'idx_rc_camp', fields: ['campana_id'] }
    ],
    scopes: {
      pendientes: { where: { status: 'queued' } },
      enviados: { where: { status: 'sent' } },
      entregados: { where: { status: 'delivered' } }
    }
  }
);

export default {
  RecaptacionClientesModel
};
