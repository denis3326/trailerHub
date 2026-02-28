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

    // קבלת נתוני המשתמש - כולל experience ו-total_score
    const userRes = await pool.query(
      `SELECT id, username, name, email, level, experience, total_score, created_at
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

    // מיפוי level למספר
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
      const levelMapping = {
        'Nominee': 1,
        'Award Winner': 2,
        'Acclaimed Critic': 3,
        'Festival Judge': 4,
        'Academy Member': 5,
        'Oscar Legend': 6
      };
      levelNumber = levelMapping[levelName] || 1;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        email: user.email,
        level: levelNumber,
        level_name: levelName,
        experience: user.experience || 0,
        total_score: user.total_score || 0,
        nominee: 'ללא ממליץ',
        member_since: user.created_at,
        games_played: Math.floor((user.total_score || 0) / 25),
        average_score: 0
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

// עדכון ניקוד - גרסה שעובדת עם הדאטאבייס
export const updateScore = async (req, res) => {
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
    const { score, experience_gained, game_type } = req.body;
    
    console.log('Updating score for user:', userId, 'score:', score, 'exp:', experience_gained);
    
    if (!score || !experience_gained || !game_type) {
      return res.status(400).json({
        success: false,
        message: 'Missing fields'
      });
    }

    // עדכון הניקוד והניסיון בדאטאבייס
    const updateRes = await pool.query(
      `UPDATE users 
       SET experience = COALESCE(experience, 0) + $1,
           total_score = COALESCE(total_score, 0) + $2
       WHERE id = $3
       RETURNING id, experience, total_score, level`,
      [experience_gained, score, userId]
    );

    const updatedUser = updateRes.rows[0];
    console.log('Updated user:', updatedUser);

    // חישוב רמה חדשה לפי ניקוד
    const totalExp = updatedUser.experience;
    let newLevelNumber = 1;
    let newLevelName = 'Nominee';
    
    if (totalExp >= 10000) {
      newLevelNumber = 6;
      newLevelName = 'Oscar Legend';
    } else if (totalExp >= 6000) {
      newLevelNumber = 5;
      newLevelName = 'Academy Member';
    } else if (totalExp >= 3000) {
      newLevelNumber = 4;
      newLevelName = 'Festival Judge';
    } else if (totalExp >= 1500) {
      newLevelNumber = 3;
      newLevelName = 'Acclaimed Critic';
    } else if (totalExp >= 500) {
      newLevelNumber = 2;
      newLevelName = 'Award Winner';
    }

    // עדכון רמה אם השתנתה
    if (updatedUser.level !== newLevelName) {
      await pool.query(
        `UPDATE users SET level = $1 WHERE id = $2`,
        [newLevelName, userId]
      );
      console.log(`Level updated to ${newLevelName}`);
    }

    // ננסה לשמור היסטוריית משחק (אם הטבלה קיימת)
    try {
      await pool.query(
        `INSERT INTO game_sessions (user_id, game_type, score, experience_gained)
         VALUES ($1, $2, $3, $4)`,
        [userId, game_type, score, experience_gained]
      );
      console.log('Game session saved');
    } catch (sessionError) {
      console.log('Could not save game session (table might not exist):', sessionError.message);
    }

    res.json({
      success: true,
      message: 'Score updated successfully',
      user: {
        experience: updatedUser.experience,
        total_score: updatedUser.total_score,
        level: newLevelNumber,
        level_name: newLevelName
      }
    });

  } catch (err) {
    console.error('Update score error:', err);
    res.status(500).json({
      success: false,
      message: 'Error updating score',
      error: err.message
    });
  }
};

// פונקציה לקבלת לידרבורד
export const getLeaderboard = async (req, res) => {
  try {
    const leaderboardRes = await pool.query(
      `SELECT id, username, name, total_score, experience, level
       FROM users
       ORDER BY total_score DESC
       LIMIT 50`
    );

    res.json({
      success: true,
      leaderboard: leaderboardRes.rows
    });

  } catch (err) {
    console.error('Get leaderboard error:', err);
    res.status(500).json({
      success: false,
      message: 'Error getting leaderboard'
    });
  }
};
