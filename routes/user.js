import express from 'express';
import { getProfile, updateLevel } from '../controllers/userController.js'; // מחק את getUserById

const router = express.Router();

// כל ה-routes האלה דורשים הרשאה
router.get('/profile', getProfile);
router.post('/update-level', updateLevel);

// אם אתה רוצה route ציבורי, הוסף אותו בנפרד
// router.get('/:id', getUserById);

export default router;
