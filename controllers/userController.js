// controllers/userController.js
import pool from '../db.js';

// קבלת פרופיל משתמש
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

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

    // מיפוי level מחרוזת למספר לוגיקה בפרונט
    const levelMapping = {
      'Nominee': 1,
      'Award Winner': 2,
      'Acclaimed Critic': 3,
      'Festival Judge': 4,
      'Academy Member': 5,
      'Oscar Legend': 6
    };

    const levelNumber = levelMapping[user.level] || 1;

    // ערכים ברירת מחדל לנתונים שלא קיימים בדאטאבייס
    const experience = 0;
    const total_score = 0;
    const games_played = 0;
    const average_score = 0;

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        level: levelNumber, // מספר לפרונט
        level_name: user.level, // מחרוזת מהדאטאבייס
        experience: experience,
        total_score: total_score,
        nominee: 'ללא ממליץ',
        member_since: user.created_at,
        games_played: games_played,
        average_score: average_score
      }
    });

  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ 
      success: false,
      message: 'שגיאה בקבלת פרופיל' 
    });
  }
};

// עדכון level לאחר משחק (אם תרצה לעדכן בבאק-אנד)
export const updateLevel = async (req, res) => {
  try {
    const userId = req.user.id;
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
