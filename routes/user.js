// routes/user.js
import express from 'express';
import { getProfile, updateLevel, getUserById } from '../controllers/userController.js'; 

const router = express.Router();

// Route מוגן עם token (אימות בתוך הפונקציה)
router.get('/profile', getProfile);
router.post('/update-level', updateLevel);

// Route ציבורי (ללא token)
router.get('/:id', getUserById);

export default router;
