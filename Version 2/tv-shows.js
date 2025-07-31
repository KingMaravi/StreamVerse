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
const tvShowsGrid = document.getElementById('tvShowsGrid');
const sortFilters = document.getElementById('sortFilters');
const genreFilters = document.getElementById('genreFilters');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const loadMoreWrapper = document.getElementById('loadMoreWrapper');
const tvSearchInput = document.getElementById('tvSearchInput');
const filterControlsWrapper = document.getElementById('filterControlsWrapper');
const resultsTitle = document.getElementById('resultsTitle');

// --- DATA ---
const sortOptions = [
    { value: 'popularity.desc', text: 'Popularity' },
    { value: 'first_air_date.desc', text: 'First Aired' },
    { value: 'vote_average.desc', text: 'Rating' }
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
    const title = item.name;
    const releaseDate = item.first_air_date;
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
        window.location.href = `tv-details.html?id=${item.id}`;
    });
    return card;
}

// --- CORE FUNCTIONALITY ---
async function discoverAndDisplayTvShows(page = 1, shouldAppend = false) {
    let url = `${apiUrl}/discover/tv?api_key=${apiKey}&language=en-US&sort_by=${currentSort}&page=${page}&vote_count.gte=100`;
    
    if (currentGenre) {
        url += `&with_genres=${currentGenre}`;
    }

    const data = await fetchData(url);
    if (data && data.results) {
        if (!shouldAppend) {
            tvShowsGrid.innerHTML = '';
        }
        const validResults = data.results.filter(item => item.poster_path);
        validResults.forEach(show => {
            const card = createContentCard(show);
            tvShowsGrid.appendChild(card);
        });
    }
}

async function searchTvShows(query, page = 1, shouldAppend = false) {
    const url = `${apiUrl}/search/tv?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(query)}&page=${page}`;
    const data = await fetchData(url);

    if (data && data.results) {
        if (!shouldAppend) {
            tvShowsGrid.innerHTML = '';
        }
        if (data.results.length === 0 && !shouldAppend) {
            tvShowsGrid.innerHTML = `<p class="col-span-full text-center text-gray-400">No results found for "${query}".</p>`;
        } else {
            const validResults = data.results.filter(item => item.poster_path);
            validResults.forEach(show => {
                const card = createContentCard(show);
                tvShowsGrid.appendChild(card);
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
    const url = `${apiUrl}/genre/tv/list?api_key=${apiKey}&language=en-US`;
    const data = await fetchData(url);
    if (data && data.genres) {
        const genreOptions = [{ value: '', text: 'All Genres' }, ...data.genres.map(g => ({ value: g.id, text: g.name }))];
        createFilterButtons(genreFilters, genreOptions, currentGenre, 'genre');
    }
}

// --- EVENT HANDLERS ---
function handleFilterChange() {
    isSearchActive = false;
    tvSearchInput.value = '';
    currentPage = 1;
    filterControlsWrapper.classList.remove('hidden');
    resultsTitle.textContent = 'Discover TV Shows';
    loadMoreWrapper.classList.remove('hidden');
    discoverAndDisplayTvShows(currentPage, false);
}

function handleSearch() {
    const query = tvSearchInput.value.trim();
    if(query) {
        isSearchActive = true;
        currentPage = 1;
        filterControlsWrapper.classList.add('hidden');
        resultsTitle.textContent = `Search Results for "${query}"`;
        loadMoreWrapper.classList.remove('hidden');
        searchTvShows(query, currentPage, false);
    } else {
        handleFilterChange();
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

tvSearchInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        handleSearch();
    }, 500);
});

loadMoreBtn.addEventListener('click', () => {
    currentPage++;
    if (isSearchActive) {
        searchTvShows(tvSearchInput.value.trim(), currentPage, true);
    } else {
        discoverAndDisplayTvShows(currentPage, true);
    }
});

// --- INITIALIZATION ---
async function initialize() {
    createFilterButtons(sortFilters, sortOptions, currentSort, 'sort');
    await populateGenres();
    await discoverAndDisplayTvShows(currentPage);
    resultsTitle.textContent = 'Discover TV Shows';
}

document.addEventListener('DOMContentLoaded', initialize);
