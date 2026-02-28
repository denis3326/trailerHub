// controllers/userController.js
import jwt from 'jsonwebtoken';
import pool from '../db.js';

// פונקציית helper לאימות token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.log('Token verification error:', error.message);
    return null;
  }
};

// קבלת פרופיל משתמש
export const getProfile = async (req, res) => {
  try {
    // קבלת ה-token מה-header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('Profile endpoint called, token exists:', !!token);

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'נדרשת הרשאה. אנא התחבר מחדש.' 
      });
    }

    // וידוא ה-token
    const userData = verifyToken(token);
    if (!userData) {
      return res.status(403).json({ 
        success: false,
        message: 'טוקן לא תקין או שפג תוקפו.' 
      });
    }

    const userId = userData.id;
    console.log('User ID from token:', userId);

    // קבלת נתוני המשתמש מהעמודות הקיימות
    const userRes = await pool.query(
      `SELECT id, name, email, level, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'משתמש לא נמצא' 
      });
    }

    const user = userRes.rows[0];
    console.log('User found in DB:', user);

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

    // ערכים ברירת מחדל
    const experience = 0;
    const total_score = 0;
    const games_played = 0;
    const average_score = 0;
    const nominee = 'ללא ממליץ';

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        level: levelNumber,
        level_name: user.level,
        experience: experience,
        total_score: total_score,
        nominee: nominee,
        member_since: user.created_at,
        games_played: games_played,
        average_score: average_score
      }
    });

  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ 
      success: false,
      message: 'שגיאה בקבלת פרופיל',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// עדכון level לאחר משחק
export const updateLevel = async (req, res) => {
  try {
    // קבלת ה-token מה-header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'נדרשת הרשאה' 
      });
    }

    // וידוא ה-token
    const userData = verifyToken(token);
    if (!userData) {
      return res.status(403).json({ 
        success: false,
        message: 'טוקן לא תקין' 
      });
    }

    const userId = userData.id;
    const { newLevel } = req.body;

    // ולידציה
    if (!newLevel) {
      return res.status(400).json({
        success: false,
        message: 'חסר שדה: newLevel'
      });
    }

    // עדכון ה-level בלבד
    await pool.query(
      `UPDATE users SET level = $1 WHERE id = $2`,
      [newLevel, userId]
    );

    res.json({
      success: true,
      message: 'רמה עודכנה בהצלחה',
      level: newLevel
    });

  } catch (err) {
    console.error('Update level error:', err);
    res.status(500).json({
      success: false,
      message: 'שגיאה בעדכון רמה'
    });
  }
};

// controllers/userController.js - הוסף פונקציה חדשה

export const updateScore = async (req, res) => {
  try {
    const userId = req.user.id;
    const { score, experience_gained, game_type } = req.body;
    
    if (!score || !experience_gained || !game_type) {
      return res.status(400).json({
        success: false,
        message: 'Missing fields'
      });
    }
    
    // עדכון המשתמש
    const updateRes = await pool.query(
      `UPDATE users 
       SET experience = COALESCE(experience, 0) + $1,
           total_score = COALESCE(total_score, 0) + $2
       WHERE id = $3
       RETURNING level, experience, total_score`,
      [experience_gained, score, userId]
    );
    
    // חישוב רמה חדשה
    const user = updateRes.rows[0];
    const levelMapping = {
      10000: 6,
      6000: 5,
      3000: 4,
      1500: 3,
      500: 2,
      0: 1
    };
    
    let newLevel = 1;
    for (const [exp, level] of Object.entries(levelMapping)) {
      if (user.experience >= parseInt(exp)) {
        newLevel = level;
        break;
      }
    }
    
    // עדכון רמה
    await pool.query(
      `UPDATE users SET level = $1 WHERE id = $2`,
      [newLevel, userId]
    );
    
    // שמירת היסטוריית משחק (אופציונלי)
    try {
      await pool.query(
        `INSERT INTO game_sessions (user_id, game_type, score, experience_gained)
         VALUES ($1, $2, $3, $4)`,
        [userId, game_type, score, experience_gained]
      );
    } catch (sessionError) {
      console.log('Could not save game session:', sessionError.message);
    }
    
    res.json({
      success: true,
      message: 'Score updated successfully',
      user: {
        level: newLevel,
        experience: user.experience,
        total_score: user.total_score
      }
    });
    
  } catch (err) {
    console.error('Update score error:', err);
    res.status(500).json({
      success: false,
      message: 'Error updating score'
    });
  }
};
