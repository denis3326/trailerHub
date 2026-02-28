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

    // קבלת נתוני המשתמש - עדכון: הוספנו username לעמודות
    const userRes = await pool.query(
      `SELECT id, username, name, email, level, created_at
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

    // אם level הוא מספר (כטקסט), נמיר אותו למספר ואז לשם רמה
    let levelNumber = 1;
    let levelName = 'Nominee';
    
    if (user.level && !isNaN(user.level)) {
      // אם זה מספר (למשל "1")
      levelNumber = parseInt(user.level);
      const levelNames = {
        1: 'Nominee',
        2: 'Award Winner',
        3: 'Acclaimed Critic',
        4: 'Festival Judge',
        5: 'Academy Member',
        6: 'Oscar Legend'
      };
      levelName = levelNames[levelNumber] || 'Nominee';
    } else {
      // אם זה שם רמה (למשל "Nominee")
      levelName = user.level || 'Nominee';
      levelNumber = levelMapping[levelName] || 1;
    }

    // ערכים ברירת מחדל - אין לנו עמודות לניקוד בדאטאבייס
    const experience = 0;
    const total_score = 0;
    const games_played = 0;
    const average_score = 0;
    const nominee = 'ללא ממליץ';

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        email: user.email,
        level: levelNumber,
        level_name: levelName,
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

    // המרת הרמה החדשה לשם רמה
    const levelNames = {
      1: 'Nominee',
      2: 'Award Winner',
      3: 'Acclaimed Critic',
      4: 'Festival Judge',
      5: 'Academy Member',
      6: 'Oscar Legend'
    };

    const levelName = levelNames[newLevel] || 'Nominee';

    // עדכון ה-level בדאטאבייס
    await pool.query(
      `UPDATE users SET level = $1 WHERE id = $2`,
      [levelName, userId]
    );

    res.json({
      success: true,
      message: 'רמה עודכנה בהצלחה',
      level: newLevel,
      level_name: levelName
    });

  } catch (err) {
    console.error('Update level error:', err);
    res.status(500).json({
      success: false,
      message: 'שגיאה בעדכון רמה'
    });
  }
};

// עדכון ניקוד - גרסה שעובדת עם AsyncStorage בלבד
export const updateScore = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'נדרשת הרשאה' 
      });
    }

    const userData = verifyToken(token);
    if (!userData) {
      return res.status(403).json({ 
        success: false,
        message: 'טוקן לא תקין' 
      });
    }

    const { score, experience_gained, game_type } = req.body;
    
    if (!score || !experience_gained || !game_type) {
      return res.status(400).json({
        success: false,
        message: 'Missing fields'
      });
    }

    // הערה: הניקוד נשמר ב-AsyncStorage בצד הלקוח
    // השרת רק מאשר קבלה ומחזיר תשובה
    
    // אפשר להוסיף כאן שמירה בלוגים או בטבלת game_sessions אם קיימת
    console.log(`User ${userData.id} scored ${score} points in ${game_type}`);

    res.json({
      success: true,
      message: 'Score received successfully',
      note: 'Score is stored locally on device'
    });

  } catch (err) {
    console.error('Update score error:', err);
    res.status(500).json({
      success: false,
      message: 'Error updating score'
    });
  }
};

// פונקציה חדשה: קבלת לידרבורד (אם תרצה בעתיד)
export const getLeaderboard = async (req, res) => {
  try {
    // מכיוון שאין לנו עמודות ניקוד, נחזיר רשימה ריקה או נתוני דמה
    res.json({
      success: true,
      leaderboard: [],
      message: 'Leaderboard feature coming soon'
    });

  } catch (err) {
    console.error('Get leaderboard error:', err);
    res.status(500).json({
      success: false,
      message: 'Error getting leaderboard'
    });
  }
};
