/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 02 / 08 / 2025
 * Última Modificación: 14 / 09 / 2025
 * Versión: 1.1
 *
 * Descripción:
 * Modelo Sequelize para la tabla de productos, categorías y talles habilitados en un combo.
 *
 * Tema: Modelos - Combos
 * Capa: Backend
 */

import dotenv from 'dotenv';
import db from '../../DataBase/db.js';
import { DataTypes } from 'sequelize';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

export const ComboProductosPermitidosModel = db.define(
  'combo_productos_permitidos',
  {
    combo_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'combos',
        key: 'id'
      }
    },
    producto_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'productos',
        key: 'id'
      }
    },
    categoria_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categorias',
        key: 'id'
      }
    },
    talle_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'talles',
        key: 'id'
      }
    }
  },
  {
    tableName: 'combo_productos_permitidos',
    timestamps: false,
    indexes: [
      {
        unique: true,
        name: 'ux_combo_prod_talle',
        fields: ['combo_id', 'producto_id', 'talle_id']
      }
    ]
  }
);

export default {
  ComboProductosPermitidosModel
};
