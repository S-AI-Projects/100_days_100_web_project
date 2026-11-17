// -----------------------------
// TMDb & LOCAL FIXTURE CONFIG
// -----------------------------
function getApiKey() {
  if (typeof window !== 'undefined' && window.TMDB_API_KEY) {
    return window.TMDB_API_KEY;
  }
  return '';
}

function getMovieDiscoverApi() {
  const key = getApiKey();
  return key
    ? `https://api.themoviedb.org/3/discover/movie?api_key=${key}&sort_by=vote_average.desc&vote_count.gte=500&include_adult=false`
    : null;
}

const IMAGE_RESOURCES_API = 'https://image.tmdb.org/t/p/w400';

// -----------------------------
// CURATED LOCAL FALLBACK DATASET
// -----------------------------
const LOCAL_FALLBACK_MOVIES = [
  {
    id: 27205,
    title: 'Inception',
    overview: 'Cobb, a skilled thief who commits corporate espionage by infiltrating subconscious minds, is offered a chance to regain his old life.',
    release_date: '2010-07-15',
    vote_average: 8.4,
    poster_path: '/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    genre_ids: [28, 878, 12],
  },
  {
    id: 157336,
    title: 'Interstellar',
    overview: 'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations of human space travel.',
    release_date: '2014-11-05',
    vote_average: 8.4,
    poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    genre_ids: [12, 18, 878],
  },
  {
    id: 155,
    title: 'The Dark Knight',
    overview: 'Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent against the Joker.',
    release_date: '2008-07-16',
    vote_average: 8.5,
    poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    genre_ids: [28, 80, 18],
  },
  {
    id: 129,
    title: 'Spirited Away',
    overview: 'A young girl wanders into a world ruled by gods, witches, and spirits where humans are changed into beasts.',
    release_date: '2001-07-20',
    vote_average: 8.5,
    poster_path: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
    genre_ids: [16, 14, 12],
  },
  {
    id: 496243,
    title: 'Parasite',
    overview: 'All unemployed, Ki-taek’s family takes peculiar interest in the wealthy Parks for their livelihood until they get entangled in an unexpected incident.',
    release_date: '2019-05-30',
    vote_average: 8.5,
    poster_path: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    genre_ids: [35, 18, 53],
  },
  {
    id: 120467,
    title: 'The Grand Budapest Hotel',
    overview: 'The adventures of Gustave H, a legendary concierge at a famous European hotel, and Zero Moustafa, the lobby boy who becomes his trusted friend.',
    release_date: '2014-02-26',
    vote_average: 8.1,
    poster_path: '/eWdyYQreja6JGCzqHWX9NZkt5BW.jpg',
    genre_ids: [35, 12],
  },
  {
    id: 680,
    title: 'Pulp Fiction',
    overview: 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.',
    release_date: '1994-09-10',
    vote_average: 8.5,
    poster_path: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    genre_ids: [80, 53],
  },
  {
    id: 493065,
    title: "Won't You Be My Neighbor?",
    overview: 'An exploration of the life, lessons, and legacy of iconic children’s television host Fred Rogers.',
    release_date: '2018-06-08',
    vote_average: 8.0,
    poster_path: '/7m3wD6YwVwF31n3tN4iE8F1aQzM.jpg',
    genre_ids: [99],
  },
  {
    id: 419430,
    title: 'Get Out',
    overview: 'Chris and his girlfriend Rose have reached the meet-the-parents stage of dating, but something deeply disturbing lurks beneath the surface.',
    release_date: '2017-02-24',
    vote_average: 7.6,
    poster_path: '/mZssoqH9T8W7Yyq7d1i3dYkK9J3.jpg',
    genre_ids: [27, 9648],
  },
  {
    id: 694,
    title: 'The Shining',
    overview: 'Jack Torrance accepts a caretaker job at the Overlook Hotel, where he, his wife Wendy, and their son Danny are snowed in with a sinister presence.',
    release_date: '1980-05-23',
    vote_average: 8.2,
    poster_path: '/b33nnKl1GSFbao8l3Oi5q0n2FAP.jpg',
    genre_ids: [27, 53],
  },
  {
    id: 546554,
    title: 'Knives Out',
    overview: 'When renowned crime novelist Harlan Thrombey is found dead at his estate, inquisitive Detective Benoit Blanc is mysteriously enlisted to investigate.',
    release_date: '2019-11-27',
    vote_average: 7.9,
    poster_path: '/pThyQovXQrw2m0s9x82twj48Jq4.jpg',
    genre_ids: [35, 80, 9648],
  },
  {
    id: 1417,
    title: "Pan's Labyrinth",
    overview: 'In 1944 post-Civil War Spain, a young girl fascinated with fairy tales is sent along with her pregnant mother to live with her new stepfather.',
    release_date: '2006-08-25',
    vote_average: 7.7,
    poster_path: '/7y80A6Qy64yZ06P6E89H3c9L9s1.jpg',
    genre_ids: [14, 18],
  },
];

// -----------------------------
// SAFE STORAGE
// -----------------------------
const memoryStorage = {};
const safeStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStorage[key] ?? null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      memoryStorage[key] = String(value);
    }
  },
};

// -----------------------------
// DOM ELEMENTS
// -----------------------------
const genreTrigger = document.getElementById('genreTrigger');
const genreMenu = document.getElementById('genreMenu');
const genreTriggerLabel = document.getElementById('genreTriggerLabel');
const genreCheckboxes = genreMenu ? genreMenu.querySelectorAll('input[type="checkbox"]') : [];
const findMovieBtn = document.getElementById('findMovieBtn');

const loadingState = document.getElementById('loadingState');
const welcomeState = document.getElementById('welcomeState');
const movieCard = document.getElementById('movieCard');

const moviePoster = document.getElementById('moviePoster');
const movieTitle = document.getElementById('movieTitle');
const movieRating = document.getElementById('movieRating');
const movieReleaseDate = document.getElementById('movieReleaseDate');
const movieOverview = document.getElementById('movieOverview');

const trailerBtn = document.getElementById('trailerBtn');
const rerollBtn = document.getElementById('rerollBtn');
const saveBtn = document.getElementById('saveBtn');

const watchlistSection = document.getElementById('watchlistSection');
const watchlistGrid = document.getElementById('watchlistGrid');
const watchlistCount = document.getElementById('watchlistCount');
const clearWatchlistBtn = document.getElementById('clearWatchlistBtn');

let currentMovie = null;
let activeGenreIds = [];
let watchlist = [];

try {
  watchlist = JSON.parse(safeStorage.getItem('wtw_watchlist') || '[]');
  if (!Array.isArray(watchlist)) watchlist = [];
} catch {
  watchlist = [];
}

// -----------------------------
// DROPDOWN LOGIC
// -----------------------------
function getSelectedGenreIds() {
  return Array.from(genreCheckboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);
}

function updateGenreLabel() {
  const selected = Array.from(genreCheckboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.closest('label').querySelector('span').textContent);

  if (selected.length === 0) {
    genreTriggerLabel.textContent = 'Choose genre(s)…';
    genreTriggerLabel.classList.remove('has-selection');
  } else if (selected.length <= 3) {
    genreTriggerLabel.textContent = selected.join(', ');
    genreTriggerLabel.classList.add('has-selection');
  } else {
    genreTriggerLabel.textContent = `${selected.slice(0, 2).join(', ')} +${selected.length - 2} more`;
    genreTriggerLabel.classList.add('has-selection');
  }
}

if (genreTrigger && genreMenu) {
  genreTrigger.setAttribute('aria-haspopup', 'true');
  genreTrigger.setAttribute('aria-expanded', 'false');

  genreTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = genreMenu.classList.contains('hidden');
    genreMenu.classList.toggle('hidden', !isHidden);
    genreTrigger.classList.toggle('open', isHidden);
    genreTrigger.setAttribute('aria-expanded', String(isHidden));
  });

  document.addEventListener('click', (e) => {
    if (!genreMenu.classList.contains('hidden') && !genreMenu.contains(e.target) && e.target !== genreTrigger) {
      genreMenu.classList.add('hidden');
      genreTrigger.classList.remove('open');
      genreTrigger.setAttribute('aria-expanded', 'false');
    }
  });
}

genreCheckboxes.forEach((cb) => cb.addEventListener('change', updateGenreLabel));

// -----------------------------
// MOVIE FETCH ENGINE
// -----------------------------
async function fetchMovie(genreIds) {
  if (welcomeState) welcomeState.classList.add('hidden');
  if (movieCard) movieCard.classList.add('hidden');
  if (loadingState) loadingState.classList.remove('hidden');

  try {
    const discoverApi = getMovieDiscoverApi();
    let selected = null;

    if (discoverApi) {
      const genreParam = genreIds.join('|');
      const page = Math.floor(Math.random() * 5) + 1;
      const targetUrl = `${discoverApi}&with_genres=${genreParam}&page=${page}`;
      const response = await fetch(targetUrl);
      const payload = await response.json();

      if (!payload.results || payload.results.length === 0) {
        throw new Error('No results returned.');
      }

      selected = payload.results[Math.floor(Math.random() * payload.results.length)];
    } else if (window.__MOVIE_FIXTURES__ && Array.isArray(window.__MOVIE_FIXTURES__) && window.__MOVIE_FIXTURES__.length > 0) {
      selected = window.__MOVIE_FIXTURES__[Math.floor(Math.random() * window.__MOVIE_FIXTURES__.length)];
    } else {
      // Local fallback dataset
      const parsedIds = genreIds.map((id) => parseInt(id, 10));
      const matched = LOCAL_FALLBACK_MOVIES.filter((m) =>
        parsedIds.some((gid) => m.genre_ids.includes(gid))
      );
      const candidates = matched.length > 0 ? matched : LOCAL_FALLBACK_MOVIES;
      selected = candidates[Math.floor(Math.random() * candidates.length)];
    }

    currentMovie = selected;
    populateMovieCard(selected);
  } catch {
    if (loadingState) loadingState.classList.add('hidden');
    if (welcomeState) welcomeState.classList.remove('hidden');
    alert('Could not fetch movies. Please try a different genre selection.');
  }
}

function populateMovieCard(movie) {
  if (loadingState) loadingState.classList.add('hidden');
  if (movieCard) movieCard.classList.remove('hidden');

  if (movieTitle) movieTitle.textContent = movie.title;
  if (movieRating) {
    const rating = typeof movie.vote_average === 'number' ? movie.vote_average.toFixed(1) : movie.vote_average;
    movieRating.textContent = `⭐ ${rating}`;
  }
  if (movieReleaseDate) {
    movieReleaseDate.textContent = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
  }
  if (movieOverview) {
    movieOverview.textContent = movie.overview || 'No synopsis available for this title.';
  }

  if (moviePoster) {
    if (movie.poster_path) {
      moviePoster.src = movie.poster_path.startsWith('http')
        ? movie.poster_path
        : `${IMAGE_RESOURCES_API}${movie.poster_path}`;
      moviePoster.style.display = 'block';
    } else {
      moviePoster.src = 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400&auto=format&fit=crop';
    }
  }

  if (saveBtn) {
    const isSaved = watchlist.some((m) => m.id === movie.id);
    saveBtn.textContent = isSaved ? '♥ Saved' : '♡ Save';
    saveBtn.classList.toggle('saved', isSaved);
  }
}

// -----------------------------
// USER ACTIONS
// -----------------------------
if (findMovieBtn) {
  findMovieBtn.addEventListener('click', () => {
    const ids = getSelectedGenreIds();
    if (ids.length === 0) {
      alert('Please select at least one genre first.');
      return;
    }
    if (genreMenu) genreMenu.classList.add('hidden');
    if (genreTrigger) {
      genreTrigger.classList.remove('open');
      genreTrigger.setAttribute('aria-expanded', 'false');
    }
    activeGenreIds = ids;
    fetchMovie(activeGenreIds);
  });
}

if (rerollBtn) {
  rerollBtn.addEventListener('click', () => {
    if (activeGenreIds.length === 0) return;
    fetchMovie(activeGenreIds);
  });
}

if (trailerBtn) {
  trailerBtn.addEventListener('click', () => {
    if (!currentMovie) return;
    const year = currentMovie.release_date ? currentMovie.release_date.split('-')[0] : '';
    const query = encodeURIComponent(`${currentMovie.title} ${year} official trailer`);
    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank', 'noopener');
  });
}

if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    if (!currentMovie) return;
    const idx = watchlist.findIndex((m) => m.id === currentMovie.id);
    if (idx === -1) {
      watchlist.push({
        id: currentMovie.id,
        title: currentMovie.title,
        poster_path: currentMovie.poster_path,
        vote_average: currentMovie.vote_average,
        release_date: currentMovie.release_date,
      });
      saveBtn.textContent = '♥ Saved';
      saveBtn.classList.add('saved');
    } else {
      watchlist.splice(idx, 1);
      saveBtn.textContent = '♡ Save';
      saveBtn.classList.remove('saved');
    }
    persistAndRenderWatchlist();
  });
}

if (clearWatchlistBtn) {
  clearWatchlistBtn.addEventListener('click', () => {
    watchlist = [];
    persistAndRenderWatchlist();
  });
}

function persistAndRenderWatchlist() {
  safeStorage.setItem('wtw_watchlist', JSON.stringify(watchlist));
  renderWatchlist();
}

function renderWatchlist() {
  if (!watchlistGrid || !watchlistSection) return;

  watchlistGrid.innerHTML = '';
  watchlistSection.classList.toggle('hidden', watchlist.length === 0);
  if (watchlistCount) watchlistCount.textContent = watchlist.length;

  watchlist.forEach((movie) => {
    const item = document.createElement('div');
    item.className = 'watchlist-item';

    const img = document.createElement('img');
    const posterPath = movie.poster_path || '';
    img.src = posterPath.startsWith('http')
      ? posterPath
      : posterPath
        ? `${IMAGE_RESOURCES_API}${posterPath}`
        : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400&auto=format&fit=crop';
    img.alt = movie.title;

    const title = document.createElement('div');
    title.className = 'wl-title';
    title.textContent = movie.title;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'wl-remove';
    removeBtn.textContent = '✕';
    removeBtn.setAttribute('aria-label', `Remove ${movie.title} from watchlist`);
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      watchlist = watchlist.filter((m) => m.id !== movie.id);
      persistAndRenderWatchlist();
      if (currentMovie && currentMovie.id === movie.id && saveBtn) {
        saveBtn.textContent = '♡ Save';
        saveBtn.classList.remove('saved');
      }
    });

    item.appendChild(img);
    item.appendChild(title);
    item.appendChild(removeBtn);
    watchlistGrid.appendChild(item);
  });
}

// -----------------------------
// INITIAL RENDER
// -----------------------------
renderWatchlist();
