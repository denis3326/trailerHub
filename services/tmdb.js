import fetch from 'node-fetch';

const BASE_URL = 'https://api.themoviedb.org/3';

//export async function tmdb(endpoint) {
  //const url = `${BASE_URL}${endpoint}&api_key=${process.env.TMDB_API_KEY}`;
  //const res = await fetch(url);
  //return res.json();
//}

export async function tmdb(endpoint) {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${endpoint}${separator}api_key=${process.env.TMDB_API_KEY}`;

  const res = await fetch(url);
  return res.json();
}

