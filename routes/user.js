// routes/user.js
import express from 'express';
import { getProfile, updateLevel } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// כל ה-routes האלה דורשים הרשאה
router.get('/profile', authenticateToken, getProfile);
router.post('/update-level', authenticateToken, updateLevel);

export default router;
