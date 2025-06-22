// --- CONFIGURATION ---
const apiKey = '40664e0a730f30c936ce5660f9dae424';
const apiUrl = 'https://api.themoviedb.org/3';
const posterBasePath = 'https://image.tmdb.org/t/p/w500';
const placeholderImage = 'https://placehold.co/500x750/1F2937/FFFFFF?text=No+Image';

// --- DOM ELEMENTS ---
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const searchTypeSelect = document.getElementById('searchType');
const mainContent = document.getElementById('mainContent');
const searchResultsSection = document.getElementById('searchResults');
const searchResultsGrid = document.getElementById('searchResultsGrid');
const featuredMoviesSection = document.getElementById('featuredMovies');
const featuredTvShowsSection = document.getElementById('featuredTvShows');
const featuredMoviesGrid = document.getElementById('featuredMoviesGrid');
const featuredTvShowsGrid = document.getElementById('featuredTvShowsGrid');
const movieFilters = document.getElementById('movieFilters');
const tvFilters = document.getElementById('tvFilters');

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
function createContentCard(item, mediaType) {
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
            <div class="card-overlay absolute inset-0 flex items-center justify-center">
                 <div class="play-button bg-red-500 rounded-full p-4">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>
                 </div>
            </div>
        </div>
        <div class="p-3">
            <h3 class="font-semibold truncate">${title}</h3>
            <p class="text-sm text-gray-400">${year}</p>
        </div>`;
    
    card.addEventListener('click', () => {
        window.location.href = `player.html?type=${mediaType}&id=${item.id}`;
    });
    return card;
}

function displayContent(items, gridContainer, mediaType) {
    gridContainer.innerHTML = '';
    if (!items || items.length === 0) {
         gridContainer.innerHTML = `<p class="col-span-full text-center text-gray-400">No results found.</p>`;
         return;
    }
    items.forEach(item => gridContainer.appendChild(createContentCard(item, mediaType)));
}

async function fetchAndDisplayFeatured(mediaType, filter) {
    const url = `${apiUrl}/${mediaType}/${filter}?api_key=${apiKey}&language=en-US&page=1`;
    const data = await fetchData(url);
    if (data && data.results) {
        const gridContainer = mediaType === 'movie' ? featuredMoviesGrid : featuredTvShowsGrid;
        const validResults = data.results.filter(item => item.poster_path);
        displayContent(validResults.slice(0, 10), gridContainer, mediaType);
    }
}

function showSearchResults() {
    searchResultsSection.classList.remove('hidden');
    featuredMoviesSection.classList.add('hidden');
    featuredTvShowsSection.classList.add('hidden');
}

function showHomepage() {
    searchResultsSection.classList.add('hidden');
    featuredMoviesSection.classList.remove('hidden');
    featuredTvShowsSection.classList.remove('hidden');
}

async function handleSearch() {
    const searchTerm = searchInput.value.trim();
    const searchType = searchTypeSelect.value;
    if (!searchTerm) {
        showHomepage();
        return;
    }
    const url = `${apiUrl}/search/${searchType}?api_key=${apiKey}&query=${encodeURIComponent(searchTerm)}`;
    const data = await fetchData(url);
    if (data) {
        displayContent(data.results, searchResultsGrid, searchType);
        showSearchResults();
    }
}

async function initializeApp() {
    await fetchAndDisplayFeatured('movie', 'popular');
    await fetchAndDisplayFeatured('tv', 'popular');

    movieFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('movie-filter')) {
            movieFilters.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            fetchAndDisplayFeatured('movie', e.target.dataset.filter);
        }
    });

    tvFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('tv-filter')) {
            tvFilters.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            fetchAndDisplayFeatured('tv', e.target.dataset.filter);
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);
searchButton.addEventListener('click', handleSearch);
searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') handleSearch(); });
