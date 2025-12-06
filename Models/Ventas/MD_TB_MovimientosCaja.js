/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 01 / 07 / 2025
 * Última Modificación: 05 / 12 / 2025
 * Versión: 1.1
 *
 * Descripción:
 * Este archivo (MD_TB_MovimientosCaja.js) contiene la definición del modelo Sequelize
 * para la tabla 'movimientos_caja', donde se registran todos los ingresos y egresos
 * asociados a una caja determinada.
 *
 * En esta versión se incorpora el campo 'origen' para clasificar el tipo de movimiento
 * (venta, retiro de recaudación, gasto, ajuste, etc.), clave para reportes y módulo
 * de recaudaciones.
 *
 * Tema: Modelos - Movimientos de Caja
 * Capa: Backend
 */

// Importaciones
import dotenv from 'dotenv';
import db from '../../DataBase/db.js';
import { DataTypes } from 'sequelize';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Definición del modelo de la tabla 'movimientos_caja'
export const MovimientosCajaModel = db.define(
  'movimientos_caja',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    caja_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: 'FK a la tabla caja. Identifica la caja asociada al movimiento.'
    },
    tipo: {
      type: DataTypes.ENUM('ingreso', 'egreso'),
      allowNull: false,
      comment:
        'Define si el movimiento incrementa (ingreso) o disminuye (egreso) el saldo de caja.'
    },
    origen: {
      type: DataTypes.ENUM(
        'venta',
        'retiro_recaudacion',
        'gasto',
        'ajuste',
        'otro'
      ),
      allowNull: true,
      defaultValue: 'otro',
      comment:
        'Clasificación funcional del movimiento: venta, retiro de recaudación, gasto, ajuste u otro.'
    },
    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Descripción libre del movimiento para referencia del usuario.'
    },
    monto: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment:
        'Importe del movimiento. Positivo siempre; el signo lo define "tipo".'
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha y hora en la que se registra el movimiento.'
    },
    referencia: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment:
        'Campo auxiliar para guardar referencias externas (ID de venta, código de recaudación, etc.).'
    }
  },
  {
    tableName: 'movimientos_caja',
    timestamps: false
  }
);

export default {
  MovimientosCajaModel
};
