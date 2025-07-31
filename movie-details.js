// --- CONFIGURATION ---
const apiKey = '40664e0a730f30c936ce5660f9dae424';
const apiUrl = 'https://api.themoviedb.org/3';
const posterBasePath = 'https://image.tmdb.org/t/p/w500';
const backdropBasePath = 'https://image.tmdb.org/t/p/original';
const placeholderImage = 'https://placehold.co/500x750/1F2937/FFFFFF?text=No+Image';

// --- DOM ELEMENTS ---
const detailsBackdrop = document.getElementById('detailsBackdrop');
const detailsPoster = document.getElementById('detailsPoster');
const detailsTitle = document.getElementById('detailsTitle');
const detailsMeta = document.getElementById('detailsMeta');
const userScore = document.getElementById('userScore');
const likeBtn = document.getElementById('likeBtn');
const favoriteBtn = document.getElementById('favoriteBtn');
const playMovieBtn = document.getElementById('playMovieBtn');
const watchTrailerBtn = document.getElementById('watchTrailerBtn');
const trailerModal = document.getElementById('trailerModal');
const trailerTitle = document.getElementById('trailerTitle');
const trailerContainer = document.getElementById('trailerContainer');
const closeTrailerModal = document.getElementById('closeTrailerModal');

// Tab related DOM elements
const detailsTabs = document.getElementById('detailsTabs');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
const overviewPanel = document.getElementById('overviewPanel');
const collectionPanel = document.getElementById('collectionPanel');
const relatedPanel = document.getElementById('relatedPanel');
const collectionName = document.getElementById('collectionName');
const collectionGrid = document.getElementById('collectionGrid');
const relatedGrid = document.getElementById('relatedGrid');

// --- LOCAL STORAGE HELPERS ---
const FAVORITES_KEY = 'streamverse-favorites';
const LIKES_KEY = 'streamverse-likes';

function getStoredItems(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
}

function toggleStoredItem(key, id, type) {
    let items = getStoredItems(key);
    const itemIndex = items.findIndex(item => item.id === id);
    if (itemIndex > -1) {
        items.splice(itemIndex, 1);
    } else {
        items.push({ id, type });
    }
    localStorage.setItem(key, JSON.stringify(items));
}

function isItemStored(key, id) {
     let items = getStoredItems(key);
     return items.some(item => item.id === id);
}

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

// --- INITIALIZATION ---
async function initializeDetailsPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');

    if (!movieId) {
        detailsTitle.textContent = "Movie not found.";
        return;
    }

    const url = `${apiUrl}/movie/${movieId}?api_key=${apiKey}&append_to_response=recommendations,videos,credits`;
    const data = await fetchData(url);

    if (data) {
        displayMainDetails(data);
        displayOverview(data);
        setupActionButtons(data);
        setupTabSwitching();
        
        if (data.belongs_to_collection) {
            displayCollection(data.belongs_to_collection.id);
        }

        if (data.recommendations && data.recommendations.results.length > 0) {
            displayRelatedContent(data.recommendations.results);
        }
    }
}

function displayMainDetails(data) {
    if (data.backdrop_path) {
        detailsBackdrop.style.backgroundImage = `url(${backdropBasePath}${data.backdrop_path})`;
    }

    detailsPoster.src = data.poster_path ? `${posterBasePath}${data.poster_path}` : placeholderImage;
    detailsTitle.innerHTML = `${data.title} <span class="font-normal text-gray-400">(${new Date(data.release_date).getFullYear()})</span>`;

    const releaseDate = new Date(data.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const runtime = `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m`;
    const genres = data.genres.map(g => g.name).join(', ');
    
    detailsMeta.innerHTML = `
        <span>${releaseDate}</span>
        <span>&bull;</span>
        <span>${genres}</span>
        <span>&bull;</span>
        <span>${runtime}</span>`;
    
    createUserScoreCircle(data.vote_average);
}

function displayOverview(data) {
    let crewHtml = '';
    const mainCrew = data.credits.crew.filter(c => c.job === 'Director' || c.job === 'Screenplay' || c.job === 'Characters').slice(0, 3);
    mainCrew.forEach(member => {
        crewHtml += `<div><p class="font-bold">${member.name}</p><p class="text-sm text-gray-400">${member.job}</p></div>`;
    });

    overviewPanel.innerHTML = `
        <h2 class="text-2xl font-semibold mb-2">Overview</h2>
        <p class="text-gray-300 mb-8">${data.overview}</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-6">${crewHtml}</div>
    `;
}

function setupActionButtons(data) {
    const movieId = data.id;
    playMovieBtn.onclick = () => {
        window.location.href = `player.html?type=movie&id=${movieId}`;
    };

    const officialTrailer = data.videos.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');
    if (officialTrailer) {
        watchTrailerBtn.classList.remove('hidden');
        watchTrailerBtn.onclick = () => {
            trailerTitle.textContent = `${data.title} - Official Trailer`;
            trailerContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${officialTrailer.key}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            trailerModal.classList.remove('hidden');
        };
    }

    updateActionButtonsState(movieId);
    favoriteBtn.addEventListener('click', () => {
        toggleStoredItem(FAVORITES_KEY, parseInt(movieId), 'movie');
        updateActionButtonsState(movieId);
    });
    likeBtn.addEventListener('click', () => {
        toggleStoredItem(LIKES_KEY, parseInt(movieId), 'movie');
        updateActionButtonsState(movieId);
    });
}


function createUserScoreCircle(score) {
    const percentage = Math.round(score * 10);
    const circumference = 2 * Math.PI * 18;
    const offset = circumference - (percentage / 100) * circumference;
    
    let strokeColor = '#4ade80';
    if (percentage < 70) strokeColor = '#facc15';
    if (percentage < 40) strokeColor = '#f87171';

    userScore.innerHTML = `
        <svg class="w-16 h-16" viewBox="0 0 40 40">
            <circle class="text-gray-700" stroke-width="4" stroke="currentColor" fill="transparent" r="18" cx="20" cy="20" />
            <circle class="progress-ring" stroke-width="4" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                stroke="${strokeColor}" fill="transparent" r="18" cx="20" cy="20" />
        </svg>
        <span class="absolute text-lg font-bold">${percentage}%</span>
    `;
}

function updateActionButtonsState(movieId) {
    if (isItemStored(FAVORITES_KEY, parseInt(movieId))) {
        favoriteBtn.classList.add('active');
    } else {
        favoriteBtn.classList.remove('active');
    }
    if (isItemStored(LIKES_KEY, parseInt(movieId))) {
        likeBtn.classList.add('active');
    } else {
        likeBtn.classList.remove('active');
    }
}

async function displayCollection(collectionId) {
    const url = `${apiUrl}/collection/${collectionId}?api_key=${apiKey}`;
    const collectionData = await fetchData(url);

    if (collectionData && collectionData.parts && collectionData.parts.length > 1) {
        document.querySelector('.tab-btn[data-tab="collection"]').classList.remove('hidden');
        collectionName.textContent = collectionData.name;
        collectionGrid.innerHTML = '';

        collectionData.parts.forEach(movie => {
            const card = createRelatedContentCard(movie);
            collectionGrid.appendChild(card);
        });
    }
}

function displayRelatedContent(items) {
    if(items.length > 0) {
        document.querySelector('.tab-btn[data-tab="related"]').classList.remove('hidden');
    }
    relatedGrid.innerHTML = '';
    const itemsToShow = items.slice(0, 10); 

    itemsToShow.forEach(item => {
        const card = createRelatedContentCard(item);
        relatedGrid.appendChild(card);
    });
}

function createRelatedContentCard(item) {
    const card = document.createElement('div');
    card.className = 'card bg-gray-800 rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-300 cursor-pointer';
    const posterUrl = item.poster_path ? `${posterBasePath}${item.poster_path}` : placeholderImage;
    const title = item.title;
    const releaseDate = item.release_date;
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

function setupTabSwitching() {
    detailsTabs.addEventListener('click', (e) => {
        const clickedTab = e.target.closest('.tab-btn');
        if (!clickedTab) return;

        document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));

        clickedTab.classList.add('active');
        const panelId = clickedTab.dataset.tab + 'Panel';
        document.getElementById(panelId).classList.remove('hidden');
    });
}

closeTrailerModal.addEventListener('click', () => {
    trailerModal.classList.add('hidden');
    trailerContainer.innerHTML = '';
});

document.addEventListener('DOMContentLoaded', initializeDetailsPage);
