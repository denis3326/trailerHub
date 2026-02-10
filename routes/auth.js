// routes/auth.js
import express from 'express';
import { register, login, verify } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify', verify); // הוסף את זה!

export default router;
