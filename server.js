import express from 'express';
import cors from 'cors';
import movies from './routes/movies.js';
import authRoutes from './routes/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// middlewares
app.use(cors());
app.use(express.json()); // ⬅️ חובה ל-login/register

// routes
app.use('/api/movies', movies);
app.use('/api/auth', authRoutes); // ⬅️ חדש

// test route (אופציונלי)
app.get('/', (req, res) => {
  res.send('API is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
