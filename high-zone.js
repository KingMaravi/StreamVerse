// --- CONFIGURATION ---
const apiKey = '40664e0a730f30c936ce5660f9dae424';
const apiUrl = 'https://api.themoviedb.org/3';
const posterBasePath = 'https://image.tmdb.org/t/p/w500';
const placeholderImage = 'https://placehold.co/500x750/1F2937/FFFFFF?text=No+Image';

// --- DOM ELEMENTS ---
const highZoneGrid = document.getElementById('highZoneGrid');

// --- CURATED MOVIE LIST (Corrected) ---
const highZoneMovieIds = [
    11282, // Harold & Kumar Go to White Castle
    11455, // Cheech & Chong's Up in Smoke
    10189, // Pineapple Express
    9571,  // Dazed and Confused
    115,   // The Big Lebowski
    10634, // Friday
    9490, // Half Baked
    109414,// This Is the End
    8386, // How High
    2294,  // Jay and Silent Bob Strike Back
    9900, // Grandma's Boy
    39939,  // Super Troopers
    8859,  // Dude, Where's My Car?
    1878,  // Fear and Loathing in Las Vegas
    13342, // Fast Times at Ridgemont High
    13168, // Smiley Face
    9899, // Saving Grace
    4964,  // Knocked Up
    104859  // Mac & Devin Go to High School
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
    const title = item.title;
    const year = new Date(item.release_date).getFullYear();
    const rating = item.vote_average.toFixed(1);

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

async function fetchAndDisplayHighZoneMovies() {
    highZoneGrid.innerHTML = ''; // Clear existing grid
    
    const moviePromises = highZoneMovieIds.map(id => {
        const url = `${apiUrl}/movie/${id}?api_key=${apiKey}`;
        return fetchData(url);
    });

    const movies = await Promise.all(moviePromises);

    movies.forEach(movie => {
        if (movie) {
            const card = createContentCard(movie);
            highZoneGrid.appendChild(card);
        }
    });
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', fetchAndDisplayHighZoneMovies);
