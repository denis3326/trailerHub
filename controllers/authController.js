import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

export const register = async (req, res) => {
  console.log('BODY:', req.body); // 🔥 חובה לבדיקה

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'missing fields' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
      [name, email, hashed]
    );

    res.status(201).json({ message: 'user created', userId: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'register error' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'missing fields' });
  }

  try {
    const userRes = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ message: 'invalid credentials' });
    }

    const user = userRes.rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ message: 'invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'login error' });
  }
};
