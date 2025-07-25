// Importaciones
import dotenv from 'dotenv';
import db from '../../DataBase/db.js';
import { DataTypes } from 'sequelize';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

export const MovimientosCajaPendientesModel = db.define(
  'movimientos_caja_pendientes',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    local_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    tipo: {
      type: DataTypes.ENUM('ingreso', 'egreso'),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    monto: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    fecha: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    referencia: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    tableName: 'movimientos_caja_pendientes',
    timestamps: false
  }
);

export default MovimientosCajaPendientesModel;