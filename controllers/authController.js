// controllers/authController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

export const register = async (req, res) => {
  console.log('BODY:', req.body);

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ 
      success: false,
      message: 'חסרים שדות: שם, אימייל וסיסמה' 
    });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    // level יהיה "Nominee" כמחרוזת
    const level = "Nominee";

    const result = await pool.query(
      `INSERT INTO users (name, email, password, level) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, email, level`,
      [name, email, hashed, level]
    );

    const user = result.rows[0];

    // יצירת token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        name: user.name,
        level: user.level 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      success: true,
      message: 'משתמש נוצר בהצלחה',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        level: user.level, // "Nominee"
        experience: 0, // ברירת מחדל בפרונט
        total_score: 0, // ברירת מחדל בפרונט
        nominee: 'ללא ממליץ', // ברירת מחדל בפרונט
        member_since: new Date().toISOString() // ברירת מחדל בפרונט
      },
      token: token
    });

  } catch (err) {
    console.error('Register error:', err);
    
    if (err.code === '23505') { // duplicate email
      return res.status(409).json({ 
        success: false,
        message: 'אימייל זה כבר בשימוש' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'שגיאה בהרשמה' 
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      message: 'חסרים שדות: אימייל וסיסמה' 
    });
  }

  try {
    const userRes = await pool.query(
      `SELECT id, name, email, password, level, created_at
       FROM users WHERE email = $1`,
      [email]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: 'אימייל או סיסמה לא נכונים' 
      });
    }

    const user = userRes.rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ 
        success: false,
        message: 'אימייל או סיסמה לא נכונים' 
      });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        name: user.name,
        level: user.level 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // הסרת הסיסמה מהתשובה
    const { password: _, ...userWithoutPassword } = user;

    res.json({ 
      success: true,
      message: 'התחברת בהצלחה',
      user: {
        ...userWithoutPassword,
        experience: 0, // ברירת מחדל
        total_score: 0, // ברירת מחדל
        nominee: 'ללא ממליץ', // ברירת מחדל
        member_since: user.created_at || new Date().toISOString()
      },
      token: token 
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      message: 'שגיאה בהתחברות' 
    });
  }
};
