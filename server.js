import express from 'express';
import cors from 'cors';
import movies from './routes/movies.js';
import dotenv from 'dotenv';
dotenv.config();


const app = express();
app.use(cors());

app.use('/api/movies', movies);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
