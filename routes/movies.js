import express from 'express';
import { tmdb } from '../services/tmdb.js';

const router = express.Router();

// Popular movies
router.get('/popular', async (req, res) => {
  try {
    const data = await tmdb('/movie/popular?language=en-US');
    if (!data || !data.results) return res.status(500).json({ error: 'No data from TMDB' });
    res.json(data.results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

// Movies by category
router.get('/category/:category', async (req, res) => {
  const { category } = req.params;
  const validCategories = ['popular', 'top_rated', 'upcoming'];
  if (!validCategories.includes(category)) return res.status(400).json({ error: 'Invalid category' });

  try {
    const data = await tmdb(`/movie/${category}?language=en-US`);
    if (!data || !data.results) return res.status(500).json({ error: 'No data from TMDB' });
    res.json(data.results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

// Single movie by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const data = await tmdb(`/movie/${id}?language=en-US`);
    if (!data) return res.status(404).json({ error: 'Movie not found' });
    res.json(data);
  } catch (err) {
    console.error('Error fetching TMDB movie:', err);
    res.status(500).json({ error: 'Failed to fetch movie' });
  }
});

export default router;
