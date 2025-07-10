// --- CONFIGURATION ---
const apiKey = '40664e0a730f30c936ce5660f9dae424';
const apiUrl = 'https://api.themoviedb.org/3';
const posterBasePath = 'https://image.tmdb.org/t/p/w500';
const placeholderImage = 'https://placehold.co/500x281/1F2937/FFFFFF?text=No+Image';
let currentTvState = {};
let autoplayTimer = null;

// --- DOM ELEMENTS ---
const playerVideoContainer = document.getElementById('playerVideoContainer');
const detailsPoster = document.getElementById('detailsPoster');
const detailsTitle = document.getElementById('detailsTitle');
const detailsMeta = document.getElementById('detailsMeta');
const detailsOverview = document.getElementById('detailsOverview');
const episodeControls = document.getElementById('episodeControls');
const seasonSelector = document.getElementById('seasonSelector');
const episodeSelector = document.getElementById('episodeSelector');
const prevEpisodeButton = document.getElementById('prevEpisodeButton');
const nextEpisodeButton = document.getElementById('nextEpisodeButton');
const likeBtn = document.getElementById('likeBtn');
const favoriteBtn = document.getElementById('favoriteBtn');
const episodeDetailsContainer = document.getElementById('episodeDetailsContainer');
const episodeImage = document.getElementById('episodeImage');
const episodeTitle = document.getElementById('episodeTitle');
const episodeOverview = document.getElementById('episodeOverview');
const autoplayToggle = document.getElementById('autoplayToggle');
const lastWatchedTracker = document.getElementById('lastWatchedTracker');
const lastWatchedEpisodeText = document.getElementById('lastWatchedEpisodeText');
const relatedContentSection = document.getElementById('relatedContentSection');
const relatedGrid = document.getElementById('relatedGrid');

// --- LOCAL STORAGE HELPERS ---
const FAVORITES_KEY = 'streamverse-favorites';
const LIKES_KEY = 'streamverse-likes';
const AUTOPLAY_KEY = 'streamverse-autoplay';
const WATCH_HISTORY_KEY = 'streamverse-watch-history';

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

function getWatchHistory() {
    return JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY)) || {};
}

function setLastWatched(showId, season, episode) {
    const history = getWatchHistory();
    history[showId] = { season, episode };
    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
}

function getLastWatched(showId) {
    const history = getWatchHistory();
    return history[showId] || null;
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

// --- PLAYER & DETAILS PAGE LOGIC ---
async function setupTvPlayer(tvId, details, startSeason, startEpisode) {
    episodeControls.style.display = 'flex';
    episodeDetailsContainer.classList.remove('hidden');
    
    const validSeasons = details.seasons.filter(s => s.season_number > 0);
    currentTvState.seasons = validSeasons;
    
    populateSeasonSelector(validSeasons, startSeason);
    await updateEpisodeSelector(startSeason, startEpisode);
    await updateVideoPlayer(tvId, startSeason, startEpisode);
}

async function initializePlayerPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const mediaType = urlParams.get('type');
    const id = parseInt(urlParams.get('id'));

    if (!mediaType || !id) {
        detailsTitle.textContent = "Content not found.";
        return;
    }
    
    const isAutoplayEnabled = localStorage.getItem(AUTOPLAY_KEY) === 'true';
    autoplayToggle.checked = isAutoplayEnabled;
    
    currentTvState.id = id;
    currentTvState.type = mediaType;

    const detailsUrl = `${apiUrl}/${mediaType}/${id}?api_key=${apiKey}&append_to_response=credits,videos,recommendations`;
    const details = await fetchData(detailsUrl);
    if (!details) return;

    detailsPoster.src = details.poster_path ? `${posterBasePath}${details.poster_path}` : placeholderImage.replace('500x750', '500x750');
    detailsTitle.textContent = details.title || details.name;
    detailsOverview.textContent = details.overview || 'No overview available.';
    
    const year = details.release_date || details.first_air_date ? new Date(details.release_date || details.first_air_date).getFullYear() : 'N/A';
    const genres = details.genres.map(g => g.name).join(', ');
    const rating = details.vote_average ? details.vote_average.toFixed(1) : 'N/A';
    detailsMeta.innerHTML = `<span class="flex items-center"><svg class="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg><span>${rating}</span></span><span>|</span><span>${year}</span><span>|</span><span>${genres}</span>`;

    if (mediaType === 'tv') {
        const lastWatched = getLastWatched(id);
        
        if (lastWatched) {
            lastWatchedTracker.classList.remove('hidden');
            lastWatchedEpisodeText.textContent = `Continue from S${lastWatched.season}, E${lastWatched.episode}?`;
            
            document.getElementById('resumeYes').onclick = () => {
                lastWatchedTracker.classList.add('hidden');
                setupTvPlayer(id, details, lastWatched.season, lastWatched.episode);
            };

            document.getElementById('resumeNo').onclick = () => {
                lastWatchedTracker.classList.add('hidden');
                setupTvPlayer(id, details, 1, 1);
            };
        } else {
            setupTvPlayer(id, details, 1, 1);
        }
    } else { 
        episodeControls.style.display = 'none';
        episodeDetailsContainer.classList.add('hidden');
        lastWatchedTracker.classList.add('hidden');
        updateVideoPlayer(id);
    }
    
    updateActionButtonsState();
    
    if (details.recommendations && details.recommendations.results.length > 0) {
        relatedContentSection.classList.remove('hidden');
        displayRelatedContent(details.recommendations.results, mediaType);
    }
}

function updateActionButtonsState() {
    if (isItemStored(FAVORITES_KEY, currentTvState.id)) {
        favoriteBtn.classList.add('active');
    } else {
        favoriteBtn.classList.remove('active');
    }
    if (isItemStored(LIKES_KEY, currentTvState.id)) {
        likeBtn.classList.add('active');
    } else {
        likeBtn.classList.remove('active');
    }
}

async function updateVideoPlayer(id, season, episode) {
    clearTimeout(autoplayTimer);
    const isTv = season && episode;
    currentTvState.season = season;
    currentTvState.episode = episode;

    if (isTv) {
        setLastWatched(id, season, episode);
    }

    const embedUrl = `https://vidsrc.to/embed/${isTv ? 'tv' : 'movie'}/${id}${isTv ? `/${season}-${episode}` : ''}`;
    playerVideoContainer.innerHTML = `<iframe src="${embedUrl}" frameborder="0" allow="autoplay" allowfullscreen></iframe>`;
    
    if (isTv) {
       const episodeDetails = await updateEpisodeDetails(id, season, episode);
       if (autoplayToggle.checked && episodeDetails && episodeDetails.runtime) {
           const runtimeInMs = episodeDetails.runtime * 60 * 1000;
           autoplayTimer = setTimeout(() => {
               changeEpisode('next');
           }, runtimeInMs);
       }
       updateButtonStates();
    }
}

async function updateEpisodeDetails(tvId, seasonNum, episodeNum) {
    const url = `${apiUrl}/tv/${tvId}/season/${seasonNum}/episode/${episodeNum}?api_key=${apiKey}`;
    const details = await fetchData(url);
    if (details) {
        episodeImage.src = details.still_path ? `${posterBasePath}${details.still_path}` : placeholderImage;
        episodeTitle.textContent = `S${seasonNum} E${episodeNum}: ${details.name || 'TBA'}`;
        episodeOverview.textContent = details.overview || 'No overview available for this episode.';
    }
    return details;
}

function populateSeasonSelector(seasons, selectedSeason) {
    seasonSelector.innerHTML = '';
    seasons.forEach(season => {
        const option = document.createElement('option');
        option.value = season.season_number;
        option.textContent = `Season ${season.season_number}`;
        if (season.season_number == selectedSeason) {
            option.selected = true;
        }
        seasonSelector.appendChild(option);
    });
}

async function updateEpisodeSelector(seasonNumber, selectedEpisode) {
    const url = `${apiUrl}/tv/${currentTvState.id}/season/${seasonNumber}?api_key=${apiKey}`;
    const seasonDetails = await fetchData(url);
    if (!seasonDetails || !seasonDetails.episodes) return;
    const seasonIndex = currentTvState.seasons.findIndex(s => s.season_number == seasonNumber);
    if(seasonIndex !== -1) {
        currentTvState.seasons[seasonIndex].episode_count = seasonDetails.episodes.length;
    }
    episodeSelector.innerHTML = '';
    seasonDetails.episodes.forEach(episode => {
        const option = document.createElement('option');
        option.value = episode.episode_number;
        option.textContent = `Episode ${episode.episode_number}`;
        if (episode.episode_number == selectedEpisode) {
            option.selected = true;
        }
        episodeSelector.appendChild(option);
    });
}

function updateButtonStates() {
    const { season, episode, seasons } = currentTvState;
    const seasonIndex = seasons.findIndex(s => s.season_number == season);
    if (seasonIndex === -1) return;
    const currentSeason = seasons[seasonIndex];
    prevEpisodeButton.disabled = season == 1 && episode == 1;
    nextEpisodeButton.disabled = seasonIndex === seasons.length - 1 && episode >= currentSeason.episode_count;
}

async function changeEpisode(direction) {
    let { id, season, episode, seasons } = currentTvState;
    season = parseInt(season);
    episode = parseInt(episode);
    let seasonIndex = seasons.findIndex(s => s.season_number == season);
    let currentSeason = seasons[seasonIndex];
    
    if (direction === 'next') {
        if(nextEpisodeButton.disabled) return;
        episode++;
        if (episode > currentSeason.episode_count) {
            if (seasonIndex < seasons.length - 1) {
                seasonIndex++;
                season = seasons[seasonIndex].season_number;
                episode = 1;
                await updateEpisodeSelector(season, episode);
            }
        }
    } else {
        episode--;
        if (episode < 1) {
            if (seasonIndex > 0) {
                seasonIndex--;
                season = seasons[seasonIndex].season_number;
                await updateEpisodeSelector(season, 1); 
                episode = seasons[seasonIndex].episode_count;
            }
        }
    }
    seasonSelector.value = season;
    episodeSelector.value = episode;
    await updateVideoPlayer(id, season, episode);
}

function displayRelatedContent(items, originalMediaType) {
    relatedGrid.innerHTML = '';
    const itemsToShow = items.slice(0, 5); 

    itemsToShow.forEach(item => {
        const card = createRelatedContentCard(item, originalMediaType);
        relatedGrid.appendChild(card);
    });
}

function createRelatedContentCard(item, originalMediaType) {
    const card = document.createElement('div');
    card.className = 'card bg-gray-800 rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-300 cursor-pointer';
    const posterUrl = item.poster_path ? `${posterBasePath}${item.poster_path}` : placeholderImage.replace('500x281', '500x750');
    const itemMediaType = item.media_type || originalMediaType;
    const title = item.title || item.name;
    const releaseDate = item.release_date || item.first_air_date;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

    card.innerHTML = `
        <div class="relative">
            <img src="${posterUrl}" alt="${title}" class="w-full h-auto object-cover aspect-w-2 aspect-h-3" onerror="this.onerror=null;this.src='${placeholderImage.replace('500x281', '500x750')}';">
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
        window.location.href = `player.html?type=${itemMediaType}&id=${item.id}`;
    });
    return card;
}

document.addEventListener('DOMContentLoaded', initializePlayerPage);
autoplayToggle.addEventListener('change', (e) => {
    localStorage.setItem(AUTOPLAY_KEY, e.target.checked);
    if (e.target.checked && currentTvState.type === 'tv') {
        updateVideoPlayer(currentTvState.id, currentTvState.season, currentTvState.episode);
    } else {
        clearTimeout(autoplayTimer);
    }
});
favoriteBtn.addEventListener('click', () => {
    toggleStoredItem(FAVORITES_KEY, currentTvState.id, currentTvState.type);
    updateActionButtonsState();
});
likeBtn.addEventListener('click', () => {
    toggleStoredItem(LIKES_KEY, currentTvState.id, currentTvState.type);
    updateActionButtonsState();
});
seasonSelector.addEventListener('change', async (e) => {
    const seasonNum = e.target.value;
    await updateEpisodeSelector(seasonNum, 1);
    await updateVideoPlayer(currentTvState.id, seasonNum, 1);
});
episodeSelector.addEventListener('change', async (e) => {
    const episodeNum = e.target.value;
    const seasonNum = seasonSelector.value;
    await updateVideoPlayer(currentTvState.id, seasonNum, episodeNum);
});
prevEpisodeButton.addEventListener('click', () => changeEpisode('prev'));
nextEpisodeButton.addEventListener('click', () => changeEpisode('next'));
