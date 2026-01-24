import express from 'express';
import { tmdb } from '../services/tmdb.js';

const router = express.Router();

// -------------------
// SEARCH MOVIES - מוסיפים את החיפוש כאן
// -------------------
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ 
        error: 'Query parameter is required' 
      });
    }
    
    // חיפוש סרטים ב-TMDB
    const data = await tmdb(
      `/search/movie?query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false`
    );
    
    if (!data || !data.results) {
      return res.status(500).json({ error: 'No data from TMDB' });
    }
    
    res.json(data.results);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ 
      error: 'Failed to search movies',
      details: err.message 
    });
  }
});

// -------------------
// Popular movies
// -------------------
router.get('/popular', async (req, res) => {
  try {
    const data = await tmdb('/movie/popular?language=en-US');
    if (!data || !data.results) return res.status(500).json({ error: 'No data from TMDB' });
    res.json(data.results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch popular movies' });
  }
});

// -------------------
// Movies by category
// -------------------
router.get('/category/:category', async (req, res) => {
  const { category } = req.params;
  const page = req.query.page || 1;

  // וידוא שהקטגוריה תקינה
  const validCategories = ['popular', 'top_rated', 'upcoming', 'now_playing'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  try {
    const data = await tmdb(
      `/movie/${category}?language=en-US&page=${page}`
    );

    res.json(data?.results || []);
  } catch (e) {
    console.error(e);
    res.status(500).json([]);
  }
});


// -------------------
// Specific movie extra routes (must be before /:id)
// -------------------

// Trailer / Videos
router.get('/:id/videos', async (req, res) => {
  try {
    const data = await tmdb(`/movie/${req.params.id}/videos`);
    res.json(data?.results || []);
  } catch (e) {
    console.error(e);
    res.json([]);
  }
});

// Cast
router.get('/:id/cast', async (req, res) => {
  try {
    const data = await tmdb(`/movie/${req.params.id}/credits`);
    res.json(data?.cast || []);
  } catch (e) {
    console.error(e);
    res.json([]);
  }
});

// Watch providers
router.get('/:id/watch', async (req, res) => {
  try {
    const data = await tmdb(`/movie/${req.params.id}/watch/providers`);
    // לדוגמה: ישראל IL
    res.json(data?.results?.IL || null);
  } catch (e) {
    console.error(e);
    res.json(null);
  }
});

// -------------------
// Single movie by ID (last, after all other routes)
// -------------------
router.get('/:id', async (req, res) => {
  try {
    const data = await tmdb(`/movie/${req.params.id}?language=en-US`);
    if (!data) return res.status(404).json({ error: 'Movie not found' });
    res.json(data);
  } catch (err) {
    console.error('Error fetching movie:', err);
    res.status(500).json({ error: 'Failed to fetch movie' });
  }
});

export default router;
