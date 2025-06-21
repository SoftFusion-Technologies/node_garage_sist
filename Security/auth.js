/*
 * Programador: Benjamin Orellana
 * Fecha actualización: 21 / 06 / 2025
 *
 * Descripción:
 * Autenticación con JWT basada en la tabla 'usuarios'
 */

import jwt from 'jsonwebtoken';
import { UserModel } from '../Models/MD_TB_Users.js';

// Función de login
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await UserModel.findOne({ where: { email, password } }); // ⚠️ en producción usar bcrypt

    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        rol: user.rol
      },
      'softfusion',
      {
        expiresIn: '1h'
      }
    );

    return res.json({
      message: 'Success',
      token,
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      local_id: user.local_id
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Middleware para proteger rutas con token
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // formato: Bearer TOKEN

  if (!token) return res.sendStatus(401); // No autorizado

  jwt.verify(token, 'softfusion', (err, user) => {
    if (err) return res.sendStatus(403); // Token inválido
    req.user = user;
    next();
  });
};
