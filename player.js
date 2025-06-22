// --- CONFIGURATION ---
const apiKey = '40664e0a730f30c936ce5660f9dae424';
const apiUrl = 'https://api.themoviedb.org/3';
const posterBasePath = 'https://image.tmdb.org/t/p/w500';
const placeholderImage = 'https://placehold.co/500x281/1F2937/FFFFFF?text=No+Image';
let currentTvState = {};

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
const aiSummaryButton = document.getElementById('aiSummaryButton');
const aiVibeButton = document.getElementById('aiVibeButton');
const aiContentContainer = document.getElementById('aiContentContainer');
const aiLoading = document.getElementById('aiLoading');
const likeBtn = document.getElementById('likeBtn');
const favoriteBtn = document.getElementById('favoriteBtn');
const episodeDetailsContainer = document.getElementById('episodeDetailsContainer');
const episodeImage = document.getElementById('episodeImage');
const episodeTitle = document.getElementById('episodeTitle');
const episodeOverview = document.getElementById('episodeOverview');

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

async function callGeminiAPI(prompt) {
    aiLoading.classList.remove('hidden');
    aiContentContainer.classList.add('hidden');
    let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    const geminiApiKey = "";
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
    
    try {
        const response = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Gemini API Error: ${response.status} - ${errorBody}`);
        }
        const result = await response.json();
        if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
            return result.candidates[0].content.parts[0].text;
        } else {
            return "Sorry, I couldn't generate a response right now.";
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return "An error occurred while contacting the AI. Please try again.";
    } finally {
        aiLoading.classList.add('hidden');
    }
}

// --- PLAYER & DETAILS PAGE LOGIC ---
async function initializePlayerPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const mediaType = urlParams.get('type');
    const id = parseInt(urlParams.get('id'));

    if (!mediaType || !id) {
        detailsTitle.textContent = "Content not found.";
        return;
    }
    
    currentTvState.id = id;
    currentTvState.type = mediaType;

    const detailsUrl = `${apiUrl}/${mediaType}/${id}?api_key=${apiKey}&append_to_response=credits`;
    const details = await fetchData(detailsUrl);
    if (!details) return;

    currentTvState.details = details;
    detailsPoster.src = details.poster_path ? `${posterBasePath}${details.poster_path}` : placeholderImage.replace('500x750', '500x750');
    detailsTitle.textContent = details.title || details.name;
    detailsOverview.textContent = details.overview || 'No overview available.';
    
    const year = details.release_date || details.first_air_date ? new Date(details.release_date || details.first_air_date).getFullYear() : 'N/A';
    const genres = details.genres.map(g => g.name).join(', ');
    const rating = details.vote_average ? details.vote_average.toFixed(1) : 'N/A';
    detailsMeta.innerHTML = `<span class="flex items-center"><svg class="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg><span>${rating}</span></span><span>|</span><span>${year}</span><span>|</span><span>${genres}</span>`;

    if (mediaType === 'tv') {
        episodeControls.classList.remove('hidden');
        episodeDetailsContainer.classList.remove('hidden');
        const validSeasons = details.seasons.filter(s => s.season_number > 0);
        currentTvState.seasons = validSeasons;
        populateSeasonSelector(validSeasons);
        await updateEpisodeSelector(1);
        await updateVideoPlayer(id, 1, 1);
    } else {
        episodeControls.classList.add('hidden');
        episodeDetailsContainer.classList.add('hidden');
        updateVideoPlayer(id);
    }
    
    updateActionButtonsState();
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
    const isTv = season && episode;
    currentTvState.season = season;
    currentTvState.episode = episode;
    const embedUrl = `https://vidsrc.to/embed/${isTv ? 'tv' : 'movie'}/${id}${isTv ? `/${season}-${episode}` : ''}`;
    playerVideoContainer.innerHTML = `<iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>`;
    if (isTv) {
       await updateEpisodeDetails(id, season, episode);
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
}


function populateSeasonSelector(seasons) {
    seasonSelector.innerHTML = '';
    seasons.forEach(season => {
        const option = document.createElement('option');
        option.value = season.season_number;
        option.textContent = `Season ${season.season_number}`;
        seasonSelector.appendChild(option);
    });
}

async function updateEpisodeSelector(seasonNumber) {
    // This fetches the full season detail to get the episode count
    const url = `${apiUrl}/tv/${currentTvState.id}/season/${seasonNumber}?api_key=${apiKey}`;
    const seasonDetails = await fetchData(url);

    if (!seasonDetails || !seasonDetails.episodes) return;
    currentTvState.seasons[seasonNumber-1].episode_count = seasonDetails.episodes.length;

    episodeSelector.innerHTML = '';
    seasonDetails.episodes.forEach(episode => {
        const option = document.createElement('option');
        option.value = episode.episode_number;
        option.textContent = `Episode ${episode.episode_number}`;
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
    let seasonIndex = seasons.findIndex(s => s.season_number == season);
    let currentSeason = seasons[seasonIndex];
    
    if (direction === 'next') {
        episode++;
        if (episode > currentSeason.episode_count) {
            if (seasonIndex < seasons.length - 1) {
                seasonIndex++;
                season = seasons[seasonIndex].season_number;
                episode = 1;
                seasonSelector.value = season;
                await updateEpisodeSelector(season);
            }
        }
    } else {
        episode--;
        if (episode < 1) {
            if (seasonIndex > 0) {
                seasonIndex--;
                season = seasons[seasonIndex].season_number;
                await updateEpisodeSelector(season);
                episode = seasons[seasonIndex].episode_count;
            }
        }
    }
    episodeSelector.value = episode;
    await updateVideoPlayer(id, season, episode);
}

document.addEventListener('DOMContentLoaded', initializePlayerPage);
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
    await updateEpisodeSelector(seasonNum);
    await updateVideoPlayer(currentTvState.id, seasonNum, 1);
    episodeSelector.value = 1;
});
episodeSelector.addEventListener('change', async (e) => {
    const episodeNum = e.target.value;
    const seasonNum = seasonSelector.value;
    await updateVideoPlayer(currentTvState.id, seasonNum, episodeNum);
});
prevEpisodeButton.addEventListener('click', () => changeEpisode('prev'));
nextEpisodeButton.addEventListener('click', () => changeEpisode('next'));
aiSummaryButton.addEventListener('click', async () => {
    const { details } = currentTvState;
    if (!details) return;
    const prompt = `Write a short, engaging, and fun summary for: "${details.title || details.name}".`;
    const summary = await callGeminiAPI(prompt);
    aiContentContainer.innerHTML = summary.replace(/\n/g, '<br>');
    aiContentContainer.classList.remove('hidden');
});
aiVibeButton.addEventListener('click', async () => {
    const { details } = currentTvState;
    if (!details) return;
    const prompt = `Describe the "vibe" of "${details.title || details.name}" in a few words and 2-3 emojis.`;
    const vibe = await callGeminiAPI(prompt);
    aiContentContainer.innerHTML = vibe.replace(/\n/g, '<br>');
    aiContentContainer.classList.remove('hidden');
});
