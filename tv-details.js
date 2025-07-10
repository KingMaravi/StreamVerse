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
const detailsOverview = document.getElementById('detailsOverview');
const userScore = document.getElementById('userScore');
const likeBtn = document.getElementById('likeBtn');
const favoriteBtn = document.getElementById('favoriteBtn');
const playSeriesBtn = document.getElementById('playSeriesBtn');
const watchTrailerBtn = document.getElementById('watchTrailerBtn');
const crewInfo = document.getElementById('crewInfo');
const relatedContentSection = document.getElementById('relatedContentSection');
const relatedGrid = document.getElementById('relatedGrid');
const episodePickerSection = document.getElementById('episodePickerSection');
const seasonTabs = document.getElementById('seasonTabs');
const episodeList = document.getElementById('episodeList');
const trailerModal = document.getElementById('trailerModal');
const trailerTitle = document.getElementById('trailerTitle');
const trailerContainer = document.getElementById('trailerContainer');
const closeTrailerModal = document.getElementById('closeTrailerModal');

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
    const tvId = urlParams.get('id');

    if (!tvId) {
        detailsTitle.textContent = "TV Show not found.";
        return;
    }

    const url = `${apiUrl}/tv/${tvId}?api_key=${apiKey}&append_to_response=recommendations,credits,videos`;
    const data = await fetchData(url);

    if (data) {
        if (data.backdrop_path) {
            detailsBackdrop.style.backgroundImage = `url(${backdropBasePath}${data.backdrop_path})`;
        }

        detailsPoster.src = data.poster_path ? `${posterBasePath}${data.poster_path}` : placeholderImage;
        detailsTitle.innerHTML = `${data.name} <span class="font-normal text-gray-400">(${new Date(data.first_air_date).getFullYear()})</span>`;
        detailsOverview.textContent = data.overview;

        const firstAirDate = new Date(data.first_air_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const seasons = `${data.number_of_seasons} Season(s)`;
        const genres = data.genres.map(g => g.name).join(', ');
        
        detailsMeta.innerHTML = `
            <span>${firstAirDate}</span>
            <span>&bull;</span>
            <span>${genres}</span>
            <span>&bull;</span>
            <span>${seasons}</span>`;
        
        createUserScoreCircle(data.vote_average);

        playSeriesBtn.onclick = () => {
            window.location.href = `player.html?type=tv&id=${tvId}`;
        };

        const creator = data.created_by[0];
        if (creator) {
            const crewMember = document.createElement('div');
            crewMember.innerHTML = `<p class="font-bold">${creator.name}</p><p class="text-sm text-gray-400">Creator</p>`;
            crewInfo.appendChild(crewMember);
        }
        
        // Trailer Logic
        const videos = data.videos.results;
        const officialTrailer = videos.find(video => video.type === 'Trailer' && video.site === 'YouTube');
        const teaser = videos.find(video => video.type === 'Teaser' && video.site === 'YouTube');
        const anyYouTubeVideo = videos.find(video => video.site === 'YouTube');
        const videoToPlay = officialTrailer || teaser || anyYouTubeVideo;

        if (videoToPlay) {
            watchTrailerBtn.classList.remove('hidden');
            watchTrailerBtn.onclick = () => {
                trailerTitle.textContent = `${data.name} - ${videoToPlay.type}`;
                trailerContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoToPlay.key}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
                trailerModal.classList.remove('hidden');
            };
        }

        updateActionButtonsState(tvId);

        favoriteBtn.addEventListener('click', () => {
            toggleStoredItem(FAVORITES_KEY, parseInt(tvId), 'tv');
            updateActionButtonsState(tvId);
        });

        likeBtn.addEventListener('click', () => {
            toggleStoredItem(LIKES_KEY, parseInt(tvId), 'tv');
            updateActionButtonsState(tvId);
        });
        
        if (data.recommendations && data.recommendations.results.length > 0) {
            relatedContentSection.classList.remove('hidden');
            displayRelatedContent(data.recommendations.results);
        }
        
        if (data.seasons && data.seasons.length > 0) {
            initializeEpisodePicker(data.seasons, tvId);
        }
    }
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

function updateActionButtonsState(tvId) {
    if (isItemStored(FAVORITES_KEY, parseInt(tvId))) {
        favoriteBtn.classList.add('active');
    } else {
        favoriteBtn.classList.remove('active');
    }
    if (isItemStored(LIKES_KEY, parseInt(tvId))) {
        likeBtn.classList.add('active');
    } else {
        likeBtn.classList.remove('active');
    }
}

function displayRelatedContent(items) {
    relatedGrid.innerHTML = '';
    const itemsToShow = items.slice(0, 5); 

    itemsToShow.forEach(item => {
        const card = createRelatedContentCard(item);
        relatedGrid.appendChild(card);
    });
}

function createRelatedContentCard(item) {
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

// --- EPISODE PICKER LOGIC ---
function initializeEpisodePicker(seasons, tvId) {
    episodePickerSection.classList.remove('hidden');
    seasonTabs.innerHTML = '';
    const validSeasons = seasons.filter(s => s.season_number > 0);

    validSeasons.forEach((season, index) => {
        const tab = document.createElement('button');
        tab.className = 'season-tab';
        tab.textContent = `Season ${season.season_number}`;
        tab.dataset.seasonNumber = season.season_number;
        if (index === 0) {
            tab.classList.add('active');
        }
        seasonTabs.appendChild(tab);
    });

    seasonTabs.addEventListener('click', (e) => {
        const target = e.target.closest('.season-tab');
        if (target) {
            seasonTabs.querySelector('.active').classList.remove('active');
            target.classList.add('active');
            displayEpisodesForSeason(tvId, target.dataset.seasonNumber);
        }
    });

    if (validSeasons.length > 0) {
        displayEpisodesForSeason(tvId, validSeasons[0].season_number);
    }
}

async function displayEpisodesForSeason(tvId, seasonNumber) {
    episodeList.innerHTML = `<p class="text-center text-gray-400">Loading episodes...</p>`;
    const url = `${apiUrl}/tv/${tvId}/season/${seasonNumber}?api_key=${apiKey}`;
    const data = await fetchData(url);

    if (data && data.episodes) {
        episodeList.innerHTML = '';
        data.episodes.forEach(episode => {
            const card = document.createElement('div');
            card.className = 'episode-card';
            card.onclick = () => {
                window.location.href = `player.html?type=tv&id=${tvId}&season=${seasonNumber}&episode=${episode.episode_number}`;
            };

            const stillUrl = episode.still_path ? `${posterBasePath}${episode.still_path}` : placeholderImage.replace('500x750', '500x281');
            card.innerHTML = `
                <img src="${stillUrl}" alt="${episode.name}" class="w-full md:w-1/4 rounded-lg object-cover">
                <div class="flex-grow">
                    <h4 class="font-bold text-lg">E${episode.episode_number}: ${episode.name}</h4>
                    <p class="text-sm text-gray-400 mt-1">${episode.overview || 'No overview available.'}</p>
                </div>
            `;
            episodeList.appendChild(card);
        });
    }
}

closeTrailerModal.addEventListener('click', () => {
    trailerModal.classList.add('hidden');
    trailerContainer.innerHTML = '';
});

document.addEventListener('DOMContentLoaded', initializeDetailsPage);
