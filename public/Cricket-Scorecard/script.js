// =====================================
// CONFIGURATION
// =====================================

// Get a free API key from:
// https://api.cricapi.com/

const API_KEY = "YOUR_API_KEY_HERE";

// Set to false after adding a valid API key
const USE_MOCK_DATA = true;

// =====================================
// MOCK DATA
// =====================================

const mockMatches = [
  {
    id: 1,
    name: "India vs Australia, 1st Test",
    matchType: "Test",
    status: "Day 3: India lead by 150 runs",
    venue: "Border-Gavaskar Trophy",
    date: "2026-06-05",
    teams: ["India", "Australia"],
    score: "IND 350 & 120/2 | AUS 320",
    isLive: true
  },
  {
    id: 2,
    name: "England vs South Africa, 3rd ODI",
    matchType: "ODI",
    status: "Innings Break",
    venue: "Lord's Cricket Ground",
    date: "2026-06-05",
    teams: ["England", "South Africa"],
    score: "ENG 280/8 (50 ov)",
    isLive: true
  },
  {
    id: 3,
    name: "Pakistan vs New Zealand, 1st T20I",
    matchType: "T20",
    status: "Match starts tomorrow",
    venue: "Gaddafi Stadium",
    date: "2026-06-06",
    teams: ["Pakistan", "New Zealand"],
    score: "N/A",
    isLive: false
  },
  {
    id: 4,
    name: "West Indies vs Sri Lanka, 2nd Test",
    matchType: "Test",
    status: "Upcoming",
    venue: "Kensington Oval",
    date: "2026-06-10",
    teams: ["West Indies", "Sri Lanka"],
    score: "N/A",
    isLive: false
  }
];

const recentMatches = [
  {
    id: 5,
    name: "India vs England, 2nd ODI",
    matchType: "ODI",
    status: "India won by 45 runs",
    venue: "Edgbaston, Birmingham",
    date: "2026-06-03",
    teams: ["India", "England"],
    score: "IND 310/6 (50 ov) | ENG 265/10 (48.2 ov)",
    isLive: false,
    isCompleted: true
  },
  {
    id: 6,
    name: "Australia vs South Africa, 1st T20I",
    matchType: "T20",
    status: "Australia won by 6 wickets",
    venue: "Melbourne Cricket Ground",
    date: "2026-06-02",
    teams: ["Australia", "South Africa"],
    score: "SA 158/7 (20 ov) | AUS 159/4 (18.3 ov)",
    isLive: false,
    isCompleted: true
  },
  {
    id: 7,
    name: "Pakistan vs Sri Lanka, 3rd Test",
    matchType: "Test",
    status: "Match drawn",
    venue: "National Stadium, Karachi",
    date: "2026-05-30",
    teams: ["Pakistan", "New Zealand"],
    score: "PAK 450/8 & 210/5 | NZ 400/10 & 180/6",
    isLive: false,
    isCompleted: true
  },
  {
    id: 8,
    name: "West Indies vs Bangladesh, 2nd ODI",
    matchType: "ODI",
    status: "Bangladesh won by 3 wickets",
    venue: "Sabina Park, Kingston",
    date: "2026-05-28",
    teams: ["West Indies", "Bangladesh"],
    score: "WI 245/9 (50 ov) | BAN 246/7 (49.1 ov)",
    isLive: false,
    isCompleted: true
  },
  {
    id: 9,
    name: "Sri Lanka vs Afghanistan, 1st T20I",
    matchType: "T20",
    status: "Afghanistan won by 8 runs",
    venue: "R.Premadasa Stadium, Colombo",
    date: "2026-05-25",
    teams: ["Sri Lanka", "Afghanistan"],
    score: "AFG 182/5 (20 ov) | SL 174/8 (20 ov)",
    isLive: false,
    isCompleted: true
  }
];

// =====================================
// DOM ELEMENTS
// =====================================

const liveMatchesContainer =
  document.getElementById("live-matches");
const upcomingMatchesContainer =
  document.getElementById("upcoming-matches");
const recentMatchesContainer =
  document.getElementById("recent-matches");
const themeBtn =
  document.getElementById("toggleTheme");
const searchInput =
  document.getElementById("searchInput");

// =====================================
// UTILITY FUNCTIONS & ERROR HANDLING
// =====================================

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderErrorState(container, message) {
  if (!container) return;
  container.innerHTML = `
    <div class="error-state" role="alert" aria-live="assertive">
      <span class="error-state__icon" aria-hidden="true">⚠️</span>
      <h3 class="error-state__title">Failed to Load Matches</h3>
      <p class="error-state__message">${escapeHtml(message)}</p>
      <button class="error-state__retry-btn" type="button" onclick="fetchMatches()">🔄 Try Again</button>
    </div>
  `;
}

// =====================================
// FETCH MATCHES
// =====================================

async function fetchMatches() {
  try {
    let matches = [];
    if (USE_MOCK_DATA) {
      await new Promise(resolve =>
        setTimeout(resolve, 800)
      );
      matches = mockMatches;
    } else {
      const response = await fetch(
        `https://api.cricapi.com/v1/currentMatches?apikey=${API_KEY}&offset=0`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
      const data = await response.json();
      matches = data.data || [];
    }
    renderMatches(matches);

  } catch (error) {
    console.error(error);
    renderErrorState(
      liveMatchesContainer,
      "Unable to fetch live cricket scores. Please check your connection and try again."
    );
    renderErrorState(
      upcomingMatchesContainer,
      "Unable to fetch upcoming fixtures. Please check your connection and try again."
    );
    renderErrorState(
      recentMatchesContainer,
      "Unable to fetch recent match results. Please check your connection and try again."
    );
  }
}

// =====================================
// RENDER MATCHES
// =====================================

function renderMatches(matches) {
  liveMatchesContainer.innerHTML = "";
  upcomingMatchesContainer.innerHTML = "";
  recentMatchesContainer.innerHTML = "";

  const liveMatches =
    matches.filter(match =>
      match.isLive || match.matchStarted
    );
  const upcomingMatches =
    matches.filter(match =>
      !match.isLive && !match.matchStarted
    );

  if (!liveMatches.length) {
    liveMatchesContainer.innerHTML =
      '<div class="empty-state" role="status"><p class="empty-state__message">No live matches available at this moment.</p></div>';
  } else {
    liveMatches.forEach(match => {
      liveMatchesContainer.appendChild(
        createMatchCard(match, "live")
      );
    });
  }

  if (!upcomingMatches.length) {
    upcomingMatchesContainer.innerHTML =
      '<div class="empty-state" role="status"><p class="empty-state__message">No upcoming fixtures scheduled.</p></div>';
  } else {
    upcomingMatches.forEach(match => {
      upcomingMatchesContainer.appendChild(
        createMatchCard(match, "upcoming")
      );
    });
  }

  if (!recentMatches.length) {
    recentMatchesContainer.innerHTML =
      '<div class="empty-state" role="status"><p class="empty-state__message">No recent match results available.</p></div>';
  } else {
    recentMatches.forEach(match => {
      recentMatchesContainer.appendChild(
        createMatchCard(match, "recent")
      );
    });
  }

  if (searchInput && searchInput.value.trim()) {
    filterCards(searchInput.value);
  }
}

// =====================================
// CREATE CARD
// =====================================

function createMatchCard(match, type) {
  const card = document.createElement("div");
  card.className =
    `match-card ${type === "live" ? "live-card" : type === "recent" ? "recent-card" : ""}`;

  const badgeClass =
    type === "live" ? "status-live" :
    type === "recent" ? "status-final" :
    "status-upcoming";

  const badgeText =
    type === "live" ? "🔴 LIVE" :
    type === "recent" ? "✅ FINAL" :
    "📅 UPCOMING";

  card.innerHTML = `
    <span class="match-status ${badgeClass}">
      ${badgeText} • ${match.matchType || "Match"}
    </span>
    <h3 class="match-teams">
      ${match.name}
    </h3>
    ${type !== "upcoming"
      ? `<p class="match-score">${match.score}</p>`
      : ""
    }
    <p class="match-info">
      <strong>Status:</strong>
      ${match.status}
    </p>
    <p class="match-info">
      <strong>Venue:</strong>
      ${match.venue}
    </p>
    <p class="match-info">
      <strong>Date:</strong>
      ${new Date(match.date).toLocaleDateString()}
    </p>
  `;
  return card;
}

// =====================================
// THEME MANAGEMENT
// =====================================

function updateButtonText() {
  if (document.body.classList.contains("dark")) {
    themeBtn.textContent = "☀️ Light Mode";
  } else {
    themeBtn.textContent = "🌙 Dark Mode";
  }
}

function loadTheme() {
  const savedTheme =
    localStorage.getItem("theme");
  if (savedTheme) {
    document.body.classList.add(savedTheme);
  } else {
    const prefersDark =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
    document.body.classList.add(
      prefersDark ? "dark" : "light"
    );
  }
  updateButtonText();
}

function toggleTheme() {

  document.body.classList.toggle("dark");
  document.body.classList.toggle("light");
  const currentTheme =
    document.body.classList.contains("dark")
      ? "dark"
      : "light";
  localStorage.setItem(
    "theme",
    currentTheme
  );

  updateButtonText();
}

// =====================================
// SEARCH FILTER & EMPTY STATE
// =====================================

function filterCards(query) {
  const rawQuery = (query || "").trim();
  const normalizedQuery = rawQuery.toLowerCase();

  const sections = [
    { container: liveMatchesContainer, label: "live matches" },
    { container: upcomingMatchesContainer, label: "upcoming fixtures" },
    { container: recentMatchesContainer, label: "recent matches" }
  ];

  sections.forEach(({ container }) => {
    if (!container) return;

    const cards = container.querySelectorAll(".match-card");
    if (!cards.length) return;

    let matchCount = 0;
    cards.forEach(card => {
      const teamEl = card.querySelector(".match-teams");
      const teamText = teamEl ? teamEl.textContent.toLowerCase() : "";
      const isMatch = !normalizedQuery || teamText.includes(normalizedQuery);
      if (isMatch) {
        card.style.display = "";
        matchCount++;
      } else {
        card.style.display = "none";
      }
    });

    // Remove any previously rendered search empty-state
    const prevEmpty = container.querySelector(".empty-state--search");
    if (prevEmpty) {
      prevEmpty.remove();
    }

    // When a search term matches 0 matches, display a clear, accessible empty-state message inside matches containers
    if (normalizedQuery && matchCount === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "empty-state empty-state--search";
      emptyDiv.setAttribute("role", "status");
      emptyDiv.setAttribute("aria-live", "polite");
      emptyDiv.innerHTML = `
        <span class="empty-state__icon" aria-hidden="true">🔍</span>
        <h3 class="empty-state__title">No Matches Found</h3>
        <p class="empty-state__message">No matches found for "<span class="empty-state__query">${escapeHtml(rawQuery)}</span>"</p>
        <p class="empty-state__hint">Try searching with a different team name or keyword.</p>
      `;
      container.appendChild(emptyDiv);
    }
  });
}

// =====================================
// INITIALIZATION
// =====================================

document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadTheme();
    fetchMatches();
    themeBtn.addEventListener(
      "click",
      toggleTheme
    );
    searchInput.addEventListener("input", () => {
      filterCards(searchInput.value);
    });
  }
);

// Expose for testing and external integrations
if (typeof window !== "undefined") {
  window.fetchMatches = fetchMatches;
  window.renderErrorState = renderErrorState;
  window.renderMatches = renderMatches;
  window.filterCards = filterCards;
}