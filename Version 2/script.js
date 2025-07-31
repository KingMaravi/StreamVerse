// --- CONFIGURATION ---
const apiKey = '40664e0a730f30c936ce5660f9dae424';
const apiUrl = 'https://api.themoviedb.org/3';
const posterBasePath = 'https://image.tmdb.org/t/p/w500';
const backdropBasePath = 'https://image.tmdb.org/t/p/original';
const placeholderImage = 'https://placehold.co/500x750/1F2937/FFFFFF?text=No+Image';

// --- PATCH NOTES CONFIG ---
const PATCH_NOTES_VERSION = '2.0.0';
const PATCH_NOTES_KEY = 'streamverse-patch-notes-seen';

// --- DOM ELEMENTS ---
const featuredMoviesGrid = document.getElementById('featuredMoviesGrid');
const featuredTvShowsGrid = document.getElementById('featuredTvShowsGrid');
const patchNotesModal = document.getElementById('patchNotesModal');
const closePatchNotes = document.getElementById('closePatchNotes');
const dontShowAgainCheckbox = document.getElementById('dontShowAgain');
const heroBanner = document.getElementById('heroBanner');
const heroSlidesWrapper = document.getElementById('heroSlidesWrapper');
const prevSlideBtn = document.getElementById('prevSlideBtn');
const nextSlideBtn = document.getElementById('nextSlideBtn');
const heroDots = document.getElementById('heroDots');


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

// --- HERO BANNER LOGIC ---
async function createHeroBanner() {
    // Defensive check to ensure all banner elements exist before proceeding
    if (!heroBanner || !heroSlidesWrapper || !prevSlideBtn || !nextSlideBtn || !heroDots) {
        console.error("Hero banner elements not found. Skipping banner creation.");
        return;
    }

    const url = `${apiUrl}/trending/all/day?api_key=${apiKey}`;
    const data = await fetchData(url);

    if (!data || !data.results || data.results.length === 0) {
        heroBanner.style.display = 'none';
        return;
    }

    const trendingTitles = data.results.filter(item => item.backdrop_path).slice(0, 7);
    heroSlidesWrapper.innerHTML = '';
    heroDots.innerHTML = '';

    trendingTitles.forEach((item, index) => {
        // Create Slide
        const slide = document.createElement('div');
        slide.className = 'hero-slide';
        const backdropUrl = `${backdropBasePath}${item.backdrop_path}`;
        const title = item.title || item.name || 'Untitled';
        const overview = item.overview || 'No overview available.';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const mediaType = item.media_type || 'movie';

        slide.innerHTML = `
            <img src="${backdropUrl}" alt="${title}" onerror="this.style.display='none'">
            <div class="hero-overlay">
                <h2 class="hero-title">${title}</h2>
                <div class="hero-meta">
                    <span class="rating-badge">
                        <svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <span>${rating}</span>
                    </span>
                    <span class="font-semibold">${mediaType.toUpperCase()}</span>
                </div>
                <p class="hero-overview">${overview}</p>
                <div class="hero-buttons">
                    <button class="play-now" onclick="window.location.href='player.html?type=${mediaType}&id=${item.id}'">Play Now</button>
                    <button class="more-info" onclick="window.location.href='${mediaType === 'movie' ? 'movie-details.html' : 'tv-details.html'}?id=${item.id}'">More Info</button>
                </div>
            </div>
        `;
        heroSlidesWrapper.appendChild(slide);

        // Create Dot
        const dot = document.createElement('button');
        dot.className = 'hero-dot';
        dot.dataset.slide = index;
        if (index === 0) dot.classList.add('active');
        heroDots.appendChild(dot);
    });

    // Carousel Logic
    let currentIndex = 0;
    const slides = heroSlidesWrapper.querySelectorAll('.hero-slide');
    const dots = heroDots.querySelectorAll('.hero-dot');
    const totalSlides = slides.length;

    if (totalSlides <= 1) return; // No need for carousel logic if there's only one slide

    function goToSlide(slideIndex) {
        heroSlidesWrapper.style.transform = `translateX(-${slideIndex * 100}%)`;
        dots.forEach(dot => dot.classList.remove('active'));
        if(dots[slideIndex]) dots[slideIndex].classList.add('active');
        currentIndex = slideIndex;
    }

    function nextSlide() {
        const newIndex = (currentIndex + 1) % totalSlides;
        goToSlide(newIndex);
    }

    function prevSlide() {
        const newIndex = (currentIndex - 1 + totalSlides) % totalSlides;
        goToSlide(newIndex);
    }

    nextSlideBtn.addEventListener('click', nextSlide);
    prevSlideBtn.addEventListener('click', prevSlide);
    heroDots.addEventListener('click', (e) => {
        if (e.target.classList.contains('hero-dot')) {
            const slideIndex = parseInt(e.target.dataset.slide);
            goToSlide(slideIndex);
        }
    });

    setInterval(nextSlide, 7000); // Auto-slide every 7 seconds
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
        </div>
        <div class="p-3">
            <h3 class="font-semibold truncate">${title}</h3>
            <p class="text-sm text-gray-400">${year}</p>
        </div>`;
    
    card.addEventListener('click', () => {
        const destination = mediaType === 'movie' ? 'movie-details.html' : 'tv-details.html';
        window.location.href = `${destination}?id=${item.id}`;
    });
    return card;
}

function displayContent(items, gridContainer, mediaType) {
    if (!gridContainer) return;
    gridContainer.innerHTML = '';
    if (!items || items.length === 0) {
         gridContainer.innerHTML = `<p class="col-span-full text-center text-gray-400">No results found.</p>`;
         return;
    }
    items.forEach(item => gridContainer.appendChild(createContentCard(item, mediaType)));
}

async function fetchAndDisplayFeatured(mediaType, endpoint) {
    const url = `${apiUrl}/${mediaType}/${endpoint}?api_key=${apiKey}&language=en-US&page=1`;
    const data = await fetchData(url);
    if (data && data.results) {
        const gridContainer = mediaType === 'movie' ? featuredMoviesGrid : featuredTvShowsGrid;
        const validResults = data.results.filter(item => item.poster_path);
        displayContent(validResults.slice(0, 10), gridContainer, mediaType);
    }
}

// --- PATCH NOTES LOGIC ---
function handlePatchNotes() {
    if (!patchNotesModal || !closePatchNotes || !dontShowAgainCheckbox) return;

    const lastSeenVersion = localStorage.getItem(PATCH_NOTES_KEY);

    if (lastSeenVersion !== PATCH_NOTES_VERSION) {
        patchNotesModal.classList.remove('hidden');
    }

    closePatchNotes.addEventListener('click', () => {
        if (dontShowAgainCheckbox.checked) {
            localStorage.setItem(PATCH_NOTES_KEY, PATCH_NOTES_VERSION);
        }
        patchNotesModal.classList.add('hidden');
    });
}

// --- INITIALIZATION ---
async function initializeApp() {
    try {
        await createHeroBanner();
        await fetchAndDisplayFeatured('movie', 'popular');
        await fetchAndDisplayFeatured('tv', 'popular');
        handlePatchNotes();
    } catch (error) {
        console.error("Failed to initialize the application:", error);
    }
}

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', initializeApp);
