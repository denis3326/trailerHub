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
       RETURNING id, name, email, level, created_at`,
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
        level_number: 1,
        experience: 0,
        total_score: 0,
        nominee: 'ללא ממליץ',
        member_since: user.created_at
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

    // מיפוי level מחרוזת למספר
    const levelMapping = {
      'Nominee': 1,
      'Award Winner': 2,
      'Acclaimed Critic': 3,
      'Festival Judge': 4,
      'Academy Member': 5,
      'Oscar Legend': 6
    };

    const levelNumber = levelMapping[user.level] || 1;

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
        level_number: levelNumber,
        experience: 0,
        total_score: 0,
        nominee: 'ללא ממליץ',
        member_since: user.created_at
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

// פונקציה לבדיקת token - הוסף את זה!
export const verify = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(200).json({ 
        success: true,
        valid: false,
        message: 'לא סופק token' 
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(200).json({ 
          success: true,
          valid: false,
          message: 'Token לא תקין' 
        });
      }
      
      return res.status(200).json({ 
        success: true,
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          level: user.level
        }
      });
    });

  } catch (err) {
    console.error('Verify token error:', err);
    res.status(500).json({ 
      success: false,
      valid: false,
      message: 'שגיאה בבדיקת token' 
    });
  }
};
