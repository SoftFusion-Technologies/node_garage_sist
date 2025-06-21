import jwt from 'jsonwebtoken';
import db from '../DataBase/db.js';

// Función de login

export const login = async (req, res) => {
  const { email, password } = req.body;

  const sql =
    'SELECT * FROM users WHERE email = :email AND password = :password';
  try {
    const [results, metadata] = await db.query(sql, {
      replacements: { email: email, password: password }
    });
    if (results.length > 0) {
      const user = results[0];
      const token = jwt.sign({ id: user.id, level: user.level }, 'softfusion', {
        expiresIn: '1h'
      });
      return res.json({
        message: 'Success',
        token,
        id: user.id,
        level: user.level,
        name: user.name
      });
    } else {
      return res.json('Fail');
    }
  } catch (err) {
    console.log('Error executing query', err);
    return res.json('Error');
  }
};

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, 'softfusion', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
