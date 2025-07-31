// --- CONFIGURATION ---
const apiKey = '40664e0a730f30c936ce5660f9dae424';
const apiUrl = 'https://api.themoviedb.org/3';
const posterBasePath = 'https://image.tmdb.org/t/p/w500';
const placeholderImage = 'https://placehold.co/500x750/1F2937/FFFFFF?text=No+Image';

// --- STATE ---
let currentPage = 1;
let currentTimeWindow = 'day'; // 'day' or 'week'

// --- DOM ELEMENTS ---
const trendingGrid = document.getElementById('trendingGrid');
const timeWindowFilters = document.getElementById('timeWindowFilters');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const resultsTitle = document.getElementById('resultsTitle');

// --- DATA ---
const timeWindowOptions = [
    { value: 'day', text: 'Today' },
    { value: 'week', text: 'This Week' }
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
    const mediaType = item.media_type;
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
        if (mediaType === 'movie') {
            window.location.href = `movie-details.html?id=${item.id}`;
        } else if (mediaType === 'tv') {
            window.location.href = `tv-details.html?id=${item.id}`;
        }
    });
    return card;
}

// --- CORE FUNCTIONALITY ---
async function fetchAndDisplayTrending(page = 1, shouldAppend = false) {
    const url = `${apiUrl}/trending/all/${currentTimeWindow}?api_key=${apiKey}&page=${page}`;
    const data = await fetchData(url);

    if (data && data.results) {
        if (!shouldAppend) {
            trendingGrid.innerHTML = '';
        }
        const validResults = data.results.filter(item => item.poster_path && (item.media_type === 'movie' || item.media_type === 'tv'));
        validResults.forEach(item => {
            const card = createContentCard(item);
            trendingGrid.appendChild(card);
        });
    }
}

function createFilterButtons(container, options, initialValue) {
    container.innerHTML = '';
    options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'filter-btn px-4 py-1 text-sm';
        button.textContent = option.text;
        button.dataset.value = option.value;
        if (option.value === initialValue) {
            button.classList.add('active');
        }
        container.appendChild(button);
    });
}

// --- EVENT HANDLERS ---
timeWindowFilters.addEventListener('click', (e) => {
    const target = e.target.closest('.filter-btn');
    if (target && target.dataset.value !== currentTimeWindow) {
        timeWindowFilters.querySelector('.active').classList.remove('active');
        target.classList.add('active');
        currentTimeWindow = target.dataset.value;
        currentPage = 1;
        fetchAndDisplayTrending(currentPage, false);
    }
});

loadMoreBtn.addEventListener('click', () => {
    currentPage++;
    fetchAndDisplayTrending(currentPage, true);
});

// --- INITIALIZATION ---
async function initialize() {
    createFilterButtons(timeWindowFilters, timeWindowOptions, currentTimeWindow);
    await fetchAndDisplayTrending(currentPage);
}

document.addEventListener('DOMContentLoaded', initialize);
