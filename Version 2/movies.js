// --- CONFIGURATION ---
const apiKey = '40664e0a730f30c936ce5660f9dae424';
const apiUrl = 'https://api.themoviedb.org/3';
const posterBasePath = 'https://image.tmdb.org/t/p/w500';
const placeholderImage = 'https://placehold.co/500x750/1F2937/FFFFFF?text=No+Image';

// --- STATE ---
let currentPage = 1;
let currentSort = 'popularity.desc';
let currentGenre = '';
let isSearchActive = false;
let debounceTimeout;

// --- DOM ELEMENTS ---
const moviesGrid = document.getElementById('moviesGrid');
const sortFilters = document.getElementById('sortFilters');
const genreFilters = document.getElementById('genreFilters');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const loadMoreWrapper = document.getElementById('loadMoreWrapper');
const movieSearchInput = document.getElementById('movieSearchInput');
const filterControlsWrapper = document.getElementById('filterControlsWrapper');
const resultsTitle = document.getElementById('resultsTitle');


// --- DATA ---
const sortOptions = [
    { value: 'popularity.desc', text: 'Popularity' },
    { value: 'release_date.desc', text: 'Release Date' },
    { value: 'vote_average.desc', text: 'Rating' },
    { value: 'revenue.desc', text: 'Revenue' }
];

// --- API FUNCTIONS ---
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Network error: ${response.status}`);
        return response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

// --- DISPLAY FUNCTIONS ---
function createContentCard(item) {
    const card = document.createElement('div');
    card.className = 'card bg-gray-800 rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-300 cursor-pointer';
    const posterUrl = item.poster_path ? `${posterBasePath}${item.poster_path}` : placeholderImage;
    const title = item.title || item.name;
    const releaseDate = item.release_date || item.first_air_date;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

    card.innerHTML = `
        <div class="relative">
            <img src="${posterUrl}" alt="${title}" class="w-full h-auto object-cover aspect-w-2 aspect-h-3" onerror="this.onerror=null;this.src='${placeholderImage}';">
            <div class="absolute top-2 right-2 rating-badge">
                <svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                <span>${rating}</span>
            </div>
        </div>
        <div class="p-3">
            <h3 class="font-semibold truncate">${title}</h3>
            <p class="text-sm text-gray-400">${year}</p>
        </div>`;
    
    card.addEventListener('click', () => {
        window.location.href = `movie-details.html?id=${item.id}`;
    });
    return card;
}

// --- CORE FUNCTIONALITY ---
async function discoverAndDisplayMovies(page = 1, shouldAppend = false) {
    let url = `${apiUrl}/discover/movie?api_key=${apiKey}&language=en-US&sort_by=${currentSort}&page=${page}&vote_count.gte=100`;
    
    if (currentGenre) {
        url += `&with_genres=${currentGenre}`;
    }

    const data = await fetchData(url);
    if (data && data.results) {
        if (!shouldAppend) {
            moviesGrid.innerHTML = '';
        }
        const validResults = data.results.filter(item => item.poster_path);
        validResults.forEach(movie => {
            const card = createContentCard(movie);
            moviesGrid.appendChild(card);
        });
    }
}

async function searchMovies(query, page = 1, shouldAppend = false) {
    const url = `${apiUrl}/search/movie?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(query)}&page=${page}`;
    const data = await fetchData(url);

    if (data && data.results) {
        if (!shouldAppend) {
            moviesGrid.innerHTML = '';
        }
        if (data.results.length === 0 && !shouldAppend) {
            moviesGrid.innerHTML = `<p class="col-span-full text-center text-gray-400">No results found for "${query}".</p>`;
        } else {
            const validResults = data.results.filter(item => item.poster_path);
            validResults.forEach(movie => {
                const card = createContentCard(movie);
                moviesGrid.appendChild(card);
            });
        }
    }
}

function createFilterButtons(container, options, initialValue, type) {
    container.innerHTML = '';
    options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'filter-btn';
        button.textContent = option.text;
        button.dataset.value = option.value;
        button.dataset.type = type;
        if (option.value === initialValue) {
            button.classList.add('active');
        }
        container.appendChild(button);
    });
}

async function populateGenres() {
    const url = `${apiUrl}/genre/movie/list?api_key=${apiKey}&language=en-US`;
    const data = await fetchData(url);
    if (data && data.genres) {
        const genreOptions = [{ value: '', text: 'All Genres' }, ...data.genres.map(g => ({ value: g.id, text: g.name }))];
        createFilterButtons(genreFilters, genreOptions, currentGenre, 'genre');
    }
}

// --- EVENT HANDLERS ---
function handleFilterChange() {
    isSearchActive = false;
    movieSearchInput.value = '';
    currentPage = 1;
    filterControlsWrapper.classList.remove('hidden');
    resultsTitle.textContent = 'Discover Movies';
    loadMoreWrapper.classList.remove('hidden');
    discoverAndDisplayMovies(currentPage, false);
}

function handleSearch() {
    const query = movieSearchInput.value.trim();
    if(query) {
        isSearchActive = true;
        currentPage = 1;
        filterControlsWrapper.classList.add('hidden');
        resultsTitle.textContent = `Search Results for "${query}"`;
        loadMoreWrapper.classList.remove('hidden');
        searchMovies(query, currentPage, false);
    } else {
        handleFilterChange(); // Reset to discover view if search is cleared
    }
}

sortFilters.addEventListener('click', (e) => {
    const target = e.target.closest('.filter-btn');
    if (target && target.dataset.type === 'sort') {
        sortFilters.querySelector('.active').classList.remove('active');
        target.classList.add('active');
        currentSort = target.dataset.value;
        handleFilterChange();
    }
});

genreFilters.addEventListener('click', (e) => {
    const target = e.target.closest('.filter-btn');
    if (target && target.dataset.type === 'genre') {
        genreFilters.querySelector('.active').classList.remove('active');
        target.classList.add('active');
        currentGenre = target.dataset.value;
        handleFilterChange();
    }
});

movieSearchInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        handleSearch();
    }, 500);
});

loadMoreBtn.addEventListener('click', () => {
    currentPage++;
    if (isSearchActive) {
        searchMovies(movieSearchInput.value.trim(), currentPage, true);
    } else {
        discoverAndDisplayMovies(currentPage, true);
    }
});

// --- INITIALIZATION ---
async function initialize() {
    createFilterButtons(sortFilters, sortOptions, currentSort, 'sort');
    await populateGenres();
    await discoverAndDisplayMovies(currentPage);
    resultsTitle.textContent = 'Discover Movies';
}

document.addEventListener('DOMContentLoaded', initialize);
