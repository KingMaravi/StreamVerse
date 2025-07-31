// --- CONFIGURATION ---
const apiKey = '40664e0a730f30c936ce5660f9dae424';
const apiUrl = 'https://api.themoviedb.org/3';
const posterBasePath = 'https://image.tmdb.org/t/p/w500';
const placeholderImage = 'https://placehold.co/500x750/1F2937/FFFFFF?text=No+Image';

// --- DOM ELEMENTS ---
const playerVideoContainer = document.getElementById('playerVideoContainer');
const detailsPoster = document.getElementById('detailsPoster');
const detailsTitle = document.getElementById('detailsTitle');
const detailsMeta = document.getElementById('detailsMeta');
const detailsOverview = document.getElementById('detailsOverview');
const likeBtn = document.getElementById('likeBtn');
const favoriteBtn = document.getElementById('favoriteBtn');
const relatedGrid = document.getElementById('relatedGrid');
const lastWatchedTracker = document.getElementById('lastWatchedTracker');
const lastWatchedEpisodeText = document.getElementById('lastWatchedEpisodeText');
const resumeYes = document.getElementById('resumeYes');
const resumeNo = document.getElementById('resumeNo');

// Episode specific DOM elements
const episodeControls = document.getElementById('episodeControls');
const prevEpisodeButton = document.getElementById('prevEpisodeButton');
const nextEpisodeButton = document.getElementById('nextEpisodeButton');
const seasonSelector = document.getElementById('seasonSelector');
const episodeSelector = document.getElementById('episodeSelector');
const autoplayToggle = document.getElementById('autoplayToggle');
const episodeDetailsContainer = document.getElementById('episodeDetailsContainer');
const episodeImage = document.getElementById('episodeImage');
const episodeTitle = document.getElementById('episodeTitle');
const episodeOverview = document.getElementById('episodeOverview');

// Tab related DOM elements
const playerTabs = document.getElementById('playerTabs');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

// --- LOCAL STORAGE & STATE ---
const LIKES_KEY = 'streamverse-likes';
const FAVORITES_KEY = 'streamverse-favorites';
const WATCH_HISTORY_KEY = 'streamverse-watch-history';
const AUTOPLAY_KEY = 'streamverse-autoplay';

let currentTvData = null;

// --- UTILITY & LOCAL STORAGE FUNCTIONS ---
function getStoredItems(key) {
    try {
        const stored = localStorage.getItem(key);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error(`Error parsing stored items for key "${key}":`, error);
        return [];
    }
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

function setWatchHistory(id, type, season, episode) {
    let history = getStoredItems(WATCH_HISTORY_KEY);
    // Remove existing entry for this item to move it to the top
    history = history.filter(item => item.id !== id);
    
    const historyItem = { id, type, timestamp: Date.now() };
    if (type === 'tv') {
        historyItem.season = season;
        historyItem.episode = episode;
    }
    
    history.unshift(historyItem); // Add to the beginning of the array
    
    // Keep history limited to 20 items
    if (history.length > 20) {
        history.pop();
    }
    
    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
}

function getLastWatchedEpisode(tvId) {
    const history = getStoredItems(WATCH_HISTORY_KEY);
    return history.find(item => item.id === tvId && item.type === 'tv');
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
async function initializePlayer() {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const id = parseInt(urlParams.get('id'));

    if (!type || !id) {
        playerVideoContainer.innerHTML = `<p class="text-center text-xl">Content not found.</p>`;
        return;
    }

    const season = urlParams.get('season');
    const episode = urlParams.get('episode');

    if (type === 'movie') {
        await loadMovie(id);
    } else if (type === 'tv') {
        await loadTvShow(id, season, episode);
    }
    
    setupTabSwitching();
}

// --- MOVIE LOADING ---
async function loadMovie(id) {
    const url = `${apiUrl}/movie/${id}?api_key=${apiKey}&append_to_response=recommendations`;
    const data = await fetchData(url);
    if (data) {
        displayContentDetails(data, 'movie');
        playContent('movie', id);
        updateActionButtonsState(id, 'movie');
        if (data.recommendations && data.recommendations.results.length > 0) {
            displayRelatedContent(data.recommendations.results, 'movie');
        }
        setWatchHistory(id, 'movie');
    }
}

// --- TV SHOW LOADING ---
async function loadTvShow(id, season, episode) {
    const url = `${apiUrl}/tv/${id}?api_key=${apiKey}&append_to_response=recommendations`;
    currentTvData = await fetchData(url);

    if (currentTvData) {
        displayContentDetails(currentTvData, 'tv');
        updateActionButtonsState(id, 'tv');
        
        const lastWatched = getLastWatchedEpisode(id);
        
        // If coming from another page without season/episode, show resume prompt
        if (lastWatched && !season && !episode) {
            showResumePrompt(id, lastWatched.season, lastWatched.episode);
        } else {
            // Use URL params, or last watched, or default to S1E1
            const startSeason = parseInt(season || lastWatched?.season || 1);
            const startEpisode = parseInt(episode || lastWatched?.episode || 1);
            await setupEpisodePlayer(id, startSeason, startEpisode);
        }

        if (currentTvData.recommendations && currentTvData.recommendations.results.length > 0) {
            displayRelatedContent(currentTvData.recommendations.results, 'tv');
        }
    }
}

async function setupEpisodePlayer(id, seasonNum, episodeNum) {
    episodeControls.classList.remove('hidden');
    document.querySelector('.tab-btn[data-tab="episodes"]').classList.remove('hidden');

    await populateSeasonSelector(id, seasonNum);
    await populateEpisodeSelector(id, seasonNum, episodeNum);
    await playContent('tv', id, seasonNum, episodeNum);
    
    setupEpisodeNavButtons(id, seasonNum, episodeNum);
    setWatchHistory(id, 'tv', seasonNum, episodeNum);
}

// --- CORE PLAYER FUNCTION ---
async function playContent(type, id, seasonNum, episodeNum) {
    const embedUrl = type === 'tv' 
        ? `https://vidsrc.to/embed/tv/${id}/${seasonNum}-${episodeNum}`
        : `https://vidsrc.to/embed/movie/${id}`;
        
    playerVideoContainer.innerHTML = `<iframe src="${embedUrl}" frameborder="0" allow="autoplay" allowfullscreen></iframe>`;

    if (type === 'tv') {
        const url = `${apiUrl}/tv/${id}/season/${seasonNum}/episode/${episodeNum}?api_key=${apiKey}`;
        const data = await fetchData(url);
        if (data) {
            episodeDetailsContainer.classList.remove('hidden');
            episodeImage.src = data.still_path ? `${posterBasePath}${data.still_path}` : placeholderImage.replace('500x750', '500x281');
            episodeTitle.textContent = `S${seasonNum} E${episodeNum}: ${data.name}`;
            episodeOverview.textContent = data.overview || 'No overview available.';
            document.title = `Now Playing: ${currentTvData.name} - ${data.name} - StreamVerse`;
        }
    } else {
        const data = await fetchData(`${apiUrl}/movie/${id}?api_key=${apiKey}`);
        document.title = `Now Playing: ${data.title} - StreamVerse`;
    }
}


// --- UI & DISPLAY ---
function displayContentDetails(data, type) {
    detailsPoster.src = data.poster_path ? `${posterBasePath}${data.poster_path}` : placeholderImage;
    const title = data.title || data.name;
    const releaseDate = data.release_date || data.first_air_date;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
    detailsTitle.innerHTML = `${title} <span class="font-normal text-gray-400">(${year})</span>`;
    detailsOverview.textContent = data.overview;

    const genres = data.genres.map(g => g.name).join(', ');
    const runtime = type === 'movie' ? `${data.runtime} min` : `${data.number_of_seasons} Season(s)`;
    detailsMeta.innerHTML = `
        <span>${new Date(releaseDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        <span>&bull;</span>
        <span>${genres}</span>
        <span>&bull;</span>
        <span>${runtime}</span>`;
}

function displayRelatedContent(items, type) {
    relatedGrid.innerHTML = '';
    const itemsToShow = items.slice(0, 10);
    if(itemsToShow.length > 0) {
        document.querySelector('.tab-btn[data-tab="related"]').classList.remove('hidden');
    }

    itemsToShow.forEach(item => {
        const card = createRelatedContentCard(item, type);
        relatedGrid.appendChild(card);
    });
}

function createRelatedContentCard(item, type) {
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
        const detailPage = type === 'movie' ? 'movie-details.html' : 'tv-details.html';
        window.location.href = `${detailPage}?id=${item.id}`;
    });
    return card;
}

function updateActionButtonsState(id, type) {
    const numericId = parseInt(id);
    favoriteBtn.classList.toggle('active', isItemStored(FAVORITES_KEY, numericId));
    likeBtn.classList.toggle('active', isItemStored(LIKES_KEY, numericId));
    
    favoriteBtn.onclick = () => {
        toggleStoredItem(FAVORITES_KEY, numericId, type);
        favoriteBtn.classList.toggle('active');
    };
    likeBtn.onclick = () => {
        toggleStoredItem(LIKES_KEY, numericId, type);
        likeBtn.classList.toggle('active');
    };
}

function setupTabSwitching() {
    playerTabs.addEventListener('click', (e) => {
        const clickedTab = e.target.closest('.tab-btn');
        if (!clickedTab) return;

        tabButtons.forEach(tab => tab.classList.remove('active'));
        tabPanels.forEach(panel => panel.classList.add('hidden'));

        clickedTab.classList.add('active');
        const panelId = clickedTab.dataset.tab + 'Panel';
        document.getElementById(panelId).classList.remove('hidden');
    });
}

// --- EPISODE HANDLING ---
async function populateSeasonSelector(tvId, selectedSeason) {
    seasonSelector.innerHTML = '';
    currentTvData.seasons.filter(s => s.season_number > 0).forEach(season => {
        const option = document.createElement('option');
        option.value = season.season_number;
        option.textContent = `Season ${season.season_number}`;
        option.selected = season.season_number === selectedSeason;
        seasonSelector.appendChild(option);
    });
    seasonSelector.onchange = () => {
        const newSeason = parseInt(seasonSelector.value);
        window.location.href = `player.html?type=tv&id=${tvId}&season=${newSeason}&episode=1`;
    };
}

async function populateEpisodeSelector(tvId, seasonNum, selectedEpisode) {
    const url = `${apiUrl}/tv/${tvId}/season/${seasonNum}?api_key=${apiKey}`;
    const seasonData = await fetchData(url);
    if (seasonData && seasonData.episodes) {
        episodeSelector.innerHTML = '';
        seasonData.episodes.forEach(episode => {
            const option = document.createElement('option');
            option.value = episode.episode_number;
            option.textContent = `Episode ${episode.episode_number}: ${episode.name}`;
            option.selected = episode.episode_number === selectedEpisode;
            episodeSelector.appendChild(option);
        });
        episodeSelector.onchange = () => {
            const newEpisode = parseInt(episodeSelector.value);
            window.location.href = `player.html?type=tv&id=${tvId}&season=${seasonNum}&episode=${newEpisode}`;
        };
    }
}

function setupEpisodeNavButtons(tvId, seasonNum, episodeNum) {
    const currentSeason = currentTvData.seasons.find(s => s.season_number === seasonNum);
    const totalEpisodes = currentSeason ? currentSeason.episode_count : 0;

    // Previous button logic
    if (seasonNum <= 1 && episodeNum <= 1) {
        prevEpisodeButton.disabled = true;
    } else {
        prevEpisodeButton.disabled = false;
        prevEpisodeButton.onclick = async () => {
            let prevS = seasonNum, prevE = episodeNum - 1;
            if (prevE < 1) {
                prevS--;
                const prevSeasonData = await fetchData(`${apiUrl}/tv/${tvId}/season/${prevS}?api_key=${apiKey}`);
                prevE = prevSeasonData ? prevSeasonData.episodes.length : 1;
            }
            window.location.href = `player.html?type=tv&id=${tvId}&season=${prevS}&episode=${prevE}`;
        };
    }

    // Next button logic
    const lastSeason = currentTvData.seasons[currentTvData.seasons.length - 1];
    if (seasonNum >= lastSeason.season_number && episodeNum >= totalEpisodes) {
        nextEpisodeButton.disabled = true;
    } else {
        nextEpisodeButton.disabled = false;
        nextEpisodeButton.onclick = () => {
            let nextS = seasonNum, nextE = episodeNum + 1;
            if (nextE > totalEpisodes) {
                nextS++;
                nextE = 1;
            }
            window.location.href = `player.html?type=tv&id=${tvId}&season=${nextS}&episode=${nextE}`;
        };
    }
}

// --- WATCH HISTORY & AUTOPLAY ---
function showResumePrompt(id, season, episode) {
    lastWatchedTracker.classList.remove('hidden');
    lastWatchedEpisodeText.textContent = `Resume from S${season} E${episode}?`;
    resumeYes.onclick = () => {
        window.location.href = `player.html?type=tv&id=${id}&season=${season}&episode=${episode}`;
    };
    resumeNo.onclick = () => {
        lastWatchedTracker.classList.add('hidden');
        setupEpisodePlayer(id, 1, 1); // Start from beginning
    };
}

function initializeAutoplay() {
    const isAutoplayEnabled = localStorage.getItem(AUTOPLAY_KEY) === 'true';
    autoplayToggle.checked = isAutoplayEnabled;
    autoplayToggle.onchange = () => {
        localStorage.setItem(AUTOPLAY_KEY, autoplayToggle.checked);
    };
}

// --- DOM READY ---
document.addEventListener('DOMContentLoaded', () => {
    initializePlayer();
    initializeAutoplay();
});
