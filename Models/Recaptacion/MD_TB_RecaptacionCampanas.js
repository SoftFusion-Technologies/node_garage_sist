/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 28 / 07 / 2025
 * Versión: 1.1
 *
 * Descripción:
 * Modelo Sequelize para 'recaptacion_campanas' con soporte de plantillas WA,
 * tracking de estado de envío, metadatos y timestamps manuales.
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

// Definición del modelo de la tabla 'recaptacion_campanas'
export const RecaptacionCampanasModel = db.define(
  'recaptacion_campanas',
  {
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fecha_inicio: {
      type: DataTypes.DATE,
      allowNull: false
    },
    fecha_fin: {
      type: DataTypes.DATE,
      allowNull: false
    },
    medio_envio: {
      type: DataTypes.STRING(20), // DB: VARCHAR(20)
      allowNull: false,
      comment: "Canal de envío. Ej: 'email', 'whatsapp', 'sms'",
      validate: {
        isIn: [['email', 'whatsapp', 'sms']]
      }
    },
    mensaje: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'activa',
      validate: {
        isIn: [['activa', 'pausada', 'finalizada']]
      }
    },

    /* ======= NUEVOS CAMPOS PARA WHATSAPP BUSINESS ======= */
    template_name: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: 'Nombre de la plantilla aprobada en WhatsApp (marketing).'
    },
    template_lang: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'es',
      comment: 'Código de idioma de la plantilla, ej: es, es_AR'
    },
    template_vars: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON con variables por defecto o mapping de campos.'
    },
    sender_phone_number_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'phone_number_id del número WABA desde el cual se envía'
    },
    send_status: {
      type: DataTypes.ENUM(
        'draft',
        'queued',
        'sending',
        'paused',
        'finished',
        'failed'
      ),
      allowNull: false,
      defaultValue: 'draft',
      comment: 'Estado general del envío de la campaña'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Usuario que creó la campaña (FK lógica)'
    },

    /* ======= TIMESTAMPS MANUALES ======= */
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true
      // En DB tiene ON UPDATE CURRENT_TIMESTAMP
    }
  },
  {
    tableName: 'recaptacion_campanas',
    timestamps: false, // usamos created_at/updated_at manuales
    indexes: [
      {
        name: 'idx_rcamp_medio_estado',
        fields: ['medio_envio', 'send_status']
      },
      { name: 'idx_rcamp_fechas', fields: ['fecha_inicio', 'fecha_fin'] }
    ],
    defaultScope: {
      // Por si querés excluir 'mensaje' en listados, se podría ajustar acá
    },
    scopes: {
      activas: { where: { estado: 'activa' } },
      whatsapp: { where: { medio_envio: 'whatsapp' } },
      enviables: {
        // rango de fechas vigente
        where: db.Sequelize.and(
          db.Sequelize.literal('NOW() >= fecha_inicio'),
          db.Sequelize.literal('NOW() <= fecha_fin')
        )
      }
    }
  }
);

export default {
  RecaptacionCampanasModel
};
