/**
 * Boredom Buster — Application Script
 *
 * Provides:
 * - Activity generation with multi-attribute filtering (Category, Participants, Budget)
 * - Session history and persistent favourites
 * - Activity completion tracking and milestone badges
 * - Accessible Dark/Light theme toggling with preference persistence
 * - Debounced toast notification engine with strict timer cancellation
 * - DOM lifecycle management with idempotent initialization and teardown:
 *     - window.BoredomBuster.init() / window.initBoredomBuster()
 *     - window.BoredomBuster.cleanup() / window.cleanupBoredomBuster()
 *     - Duplicate event listener protection via AbortController
 *     - Active timer tracking ensuring zero dangling handles
 */

(() => {
  // -----------------------------
  // SAFE STORAGE WRAPPER
  // -----------------------------
  const memoryFallback = {};
  const storage = {
    getItem(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return memoryFallback[key] ?? null;
      }
    },
    setItem(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        memoryFallback[key] = String(value);
      }
    },
    removeItem(key) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        delete memoryFallback[key];
      }
    },
  };

  // -----------------------------
  // TIMER LIFECYCLE MANAGEMENT
  // -----------------------------
  const activeTimers = new Set();

  function setManagedTimeout(callback, delay) {
    let timerId = null;
    timerId = setTimeout(() => {
      activeTimers.delete(timerId);
      callback();
    }, delay);
    activeTimers.add(timerId);
    return timerId;
  }

  function clearManagedTimeout(timerId) {
    if (timerId !== null && timerId !== undefined) {
      clearTimeout(timerId);
      activeTimers.delete(timerId);
    }
  }

  function clearAllTimers() {
    for (const id of activeTimers) {
      clearTimeout(id);
    }
    activeTimers.clear();
  }

  // -----------------------------
  // CURATED DATASET (OFFLINE FIRST)
  // -----------------------------
  const ACTIVITIES = [
    {
      activity: "Organize your digital photos into folders",
      type: "busywork",
      participants: 1,
      cost: "free",
    },
    {
      activity: "Clean out your browser bookmarks and open tabs",
      type: "busywork",
      participants: 1,
      cost: "free",
    },
    {
      activity: "Cook a homemade signature pasta dish",
      type: "cooking",
      participants: 1,
      cost: "cheap",
    },
    {
      activity: "Bake fresh chocolate chip cookies",
      type: "cooking",
      participants: 2,
      cost: "cheap",
    },
    {
      activity: "Host a retro board game night with friends",
      type: "social",
      participants: 4,
      cost: "cheap",
    },
    {
      activity: "Organize a group video call with old friends",
      type: "social",
      participants: 4,
      cost: "free",
    },
    {
      activity: "Take a scenic nature walk in a nearby park",
      type: "recreational",
      participants: 1,
      cost: "free",
    },
    {
      activity: "Go for an afternoon bicycle ride around town",
      type: "recreational",
      participants: 2,
      cost: "free",
    },
    {
      activity: "Stargaze from your backyard or window sill",
      type: "relaxation",
      participants: 1,
      cost: "free",
    },
    {
      activity: "Practice a 15-minute guided mindfulness meditation",
      type: "relaxation",
      participants: 1,
      cost: "free",
    },
    {
      activity: "Start learning 20 essential words in a new language",
      type: "education",
      participants: 1,
      cost: "free",
    },
    {
      activity: "Watch a high-rated documentary on deep ocean life",
      type: "education",
      participants: 1,
      cost: "free",
    },
    {
      activity: "Build a desk organizer using recycled cardboard scraps",
      type: "diy",
      participants: 1,
      cost: "cheap",
    },
    {
      activity: "Learn basic origami and fold 5 paper cranes",
      type: "diy",
      participants: 1,
      cost: "free",
    },
    {
      activity: "Donate gently-used clothing to a local shelter",
      type: "charity",
      participants: 1,
      cost: "free",
    },
    {
      activity: "Write cheerful postcards to residents at a retirement home",
      type: "charity",
      participants: 2,
      cost: "cheap",
    },
    {
      activity: "Curate a 30-track playlist for focused deep work",
      type: "music",
      participants: 1,
      cost: "free",
    },
    {
      activity: "Learn the opening chords to your favorite song",
      type: "music",
      participants: 1,
      cost: "free",
    },
    {
      activity: "Book tickets to an immersive theater production",
      type: "recreational",
      participants: 2,
      cost: "expensive",
    },
    {
      activity: "Reserve a fine dining chef's tasting course",
      type: "cooking",
      participants: 2,
      cost: "expensive",
    },
  ];

  // -----------------------------
  // STATE MANAGEMENT
  // -----------------------------
  let currentActivity = null;
  let history = [];
  let favourites = [];
  let completed = [];

  let abortController = null;
  let isInitialized = false;
  let toastTimer = null;
  let fetchTimer = null;

  function loadState() {
    try {
      history = JSON.parse(storage.getItem("history")) || [];
      if (!Array.isArray(history)) history = [];
    } catch {
      history = [];
    }

    try {
      favourites = JSON.parse(storage.getItem("favourites")) || [];
      if (!Array.isArray(favourites)) favourites = [];
    } catch {
      favourites = [];
    }

    try {
      completed = JSON.parse(storage.getItem("completed")) || [];
      if (!Array.isArray(completed)) completed = [];
    } catch {
      completed = [];
    }
  }

  // -----------------------------
  // TOAST NOTIFICATIONS
  // -----------------------------
  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    clearManagedTimeout(toastTimer);
    toastTimer = null;

    toast.textContent = message;
    toast.classList.add("show");

    toastTimer = setManagedTimeout(() => {
      toast.classList.remove("show");
      toastTimer = null;
    }, 2500);
  }

  // -----------------------------
  // THEME MANAGEMENT
  // -----------------------------
  function getTheme() {
    return storage.getItem("theme") || "dark";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const themeBtn = document.getElementById("themeBtn");
    if (themeBtn) {
      themeBtn.textContent = theme === "dark" ? "🌙" : "☀️";
      themeBtn.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    storage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
    showToast(nextTheme === "dark" ? "🌙 Switched to Dark Mode!" : "☀️ Switched to Light Mode!");
  }

  // -----------------------------
  // ACTIVITY GENERATION & FILTERING
  // -----------------------------
  function generateActivity() {
    const categorySelect = document.getElementById("category");
    const participantsInput = document.getElementById("participants");
    const budgetSelect = document.getElementById("budget");

    const categoryVal = categorySelect ? categorySelect.value.trim().toLowerCase() : "";
    const participantsVal = participantsInput ? parseInt(participantsInput.value, 10) : NaN;
    const budgetVal = budgetSelect ? budgetSelect.value.trim().toLowerCase() : "";

    const filtered = ACTIVITIES.filter((item) => {
      if (categoryVal && item.type.toLowerCase() !== categoryVal) return false;
      if (!Number.isNaN(participantsVal) && participantsVal > 0 && item.participants !== participantsVal) {
        return false;
      }
      if (budgetVal && item.cost.toLowerCase() !== budgetVal) return false;
      return true;
    });

    const activityName = document.getElementById("activityName");
    const pillType = document.getElementById("pillType");
    const pillPeeps = document.getElementById("pillPeeps");
    const pillCost = document.getElementById("pillCost");
    const completeBtn = document.getElementById("completeBtn");

    if (filtered.length > 0) {
      const choice = filtered[Math.floor(Math.random() * filtered.length)];
      currentActivity = choice;

      if (activityName) activityName.textContent = choice.activity;
      if (pillType) pillType.textContent = `Type: ${choice.type}`;
      if (pillPeeps) pillPeeps.textContent = `Peeps: ${choice.participants}`;
      if (pillCost) {
        pillCost.textContent = `Cost: ${choice.cost.charAt(0).toUpperCase() + choice.cost.slice(1)}`;
      }

      // Add to history (deduplicated against immediate consecutive repeat)
      if (history.length === 0 || history[0].activity !== choice.activity) {
        history.unshift({ ...choice, timestamp: Date.now() });
        history = history.slice(0, 20);
        storage.setItem("history", JSON.stringify(history));
        renderHistory();
      }

      // Sync complete button state
      if (completeBtn) {
        const isDone = completed.includes(choice.activity);
        completeBtn.textContent = isDone ? "🎉 Completed!" : "✅ Done";
        completeBtn.disabled = isDone;
      }

      showToast("✨ New activity discovered!");
    } else {
      currentActivity = null;
      if (activityName) {
        activityName.textContent = "No activities found matching those filters! Try tweaking your options.";
      }
      if (pillType) pillType.textContent = "Type: None";
      if (pillPeeps) pillPeeps.textContent = "Peeps: -";
      if (pillCost) pillCost.textContent = "Cost: -";
      if (completeBtn) {
        completeBtn.textContent = "✅ Done";
        completeBtn.disabled = true;
      }
    }
  }

  function handleFetchClick() {
    const fetchBtn = document.getElementById("fetchBtn");
    clearManagedTimeout(fetchTimer);
    fetchTimer = null;

    if (fetchBtn) {
      fetchBtn.textContent = "Seeking...";
    }

    fetchTimer = setManagedTimeout(() => {
      generateActivity();
      if (fetchBtn) {
        fetchBtn.textContent = "Find Activity";
      }
      fetchTimer = null;
    }, 150);
  }

  // -----------------------------
  // FAVOURITES & HISTORY RENDERING
  // -----------------------------
  function renderHistory() {
    const historyList = document.getElementById("historyList");
    if (!historyList) return;

    historyList.innerHTML = "";

    if (history.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.className = "empty-notice";
      emptyLi.textContent = "No history yet. Generate an activity!";
      historyList.appendChild(emptyLi);
      return;
    }

    history.forEach((item) => {
      const li = document.createElement("li");
      li.className = "history-item";

      const titleSpan = document.createElement("span");
      titleSpan.className = "item-title";
      titleSpan.textContent = item.activity;

      const metaSmall = document.createElement("small");
      metaSmall.className = "item-meta";
      metaSmall.textContent = `[${item.type} • ${item.cost}]`;

      li.appendChild(titleSpan);
      li.appendChild(document.createTextNode(" "));
      li.appendChild(metaSmall);
      historyList.appendChild(li);
    });

    filterLists();
  }

  function renderFavourites() {
    const favList = document.getElementById("favList");
    if (!favList) return;

    favList.innerHTML = "";

    if (favourites.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.className = "empty-notice";
      emptyLi.textContent = "No favourites saved yet. Click 🤍 to favourite!";
      favList.appendChild(emptyLi);
      return;
    }

    favourites.forEach((item) => {
      const li = document.createElement("li");
      li.className = "fav-item";

      const titleSpan = document.createElement("span");
      titleSpan.className = "item-title";
      titleSpan.textContent = item.activity;

      const metaSmall = document.createElement("small");
      metaSmall.className = "item-meta";
      metaSmall.textContent = `[${item.type} • ${item.cost}]`;

      li.appendChild(titleSpan);
      li.appendChild(document.createTextNode(" "));
      li.appendChild(metaSmall);
      favList.appendChild(li);
    });

    filterLists();
  }

  function toggleFavourite() {
    if (!currentActivity) {
      showToast("❌ Generate an activity first!");
      return;
    }

    const idx = favourites.findIndex((f) => f.activity === currentActivity.activity);
    if (idx >= 0) {
      favourites.splice(idx, 1);
      showToast("Removed from favourites");
    } else {
      favourites.push({ ...currentActivity });
      showToast("Added to favourites ❤️");
    }

    storage.setItem("favourites", JSON.stringify(favourites));
    renderFavourites();
  }

  function copyActivity() {
    if (!currentActivity) {
      showToast("❌ No activity to copy!");
      return;
    }

    const text = `${currentActivity.activity} (${currentActivity.type}, ${currentActivity.cost})`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    showToast("📋 Copied to clipboard!");
  }

  // -----------------------------
  // COMPLETION & MILESTONE BADGES
  // -----------------------------
  function renderProgress() {
    const completedCountEl = document.getElementById("completedCount");
    if (completedCountEl) {
      completedCountEl.textContent = completed.length;
    }

    const badges = document.querySelectorAll(".badges .badge");
    badges.forEach((badge) => {
      const target = parseInt(badge.getAttribute("data-target"), 10);
      if (completed.length >= target) {
        badge.classList.remove("locked");
        badge.classList.add("unlocked");
      } else {
        badge.classList.add("locked");
        badge.classList.remove("unlocked");
      }
    });
  }

  function markComplete() {
    if (!currentActivity) {
      showToast("❌ Generate an activity first!");
      return;
    }

    if (completed.includes(currentActivity.activity)) {
      showToast("🧠 You've already completed this activity!");
      return;
    }

    completed.push(currentActivity.activity);
    storage.setItem("completed", JSON.stringify(completed));

    const completeBtn = document.getElementById("completeBtn");
    if (completeBtn) {
      completeBtn.textContent = "🎉 Completed!";
      completeBtn.disabled = true;
    }

    renderProgress();
    showToast("🎉 Marked completed! Great job!");
  }

  // -----------------------------
  // TABS & FILTER ENGINE
  // -----------------------------
  function switchTab(e) {
    const targetTabBtn = e.currentTarget;
    const tabName = targetTabBtn.dataset.tab;

    document.querySelectorAll(".tabs .tab").forEach((btn) => {
      btn.classList.toggle("active", btn === targetTabBtn);
    });

    const histPanel = document.getElementById("tab-history");
    const favPanel = document.getElementById("tab-favourites");

    if (histPanel) histPanel.classList.toggle("active", tabName === "history");
    if (favPanel) favPanel.classList.toggle("active", tabName === "favourites");

    filterLists();
  }

  function filterLists() {
    const searchInput = document.getElementById("activitySearch");
    const filterCat = document.getElementById("filterCategory");
    const filterCost = document.getElementById("filterCost");
    const resultsCount = document.getElementById("resultsCount");

    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const cat = filterCat ? filterCat.value.trim().toLowerCase() : "";
    const cost = filterCost ? filterCost.value.trim().toLowerCase() : "";

    const activeTab = document.querySelector(".tabs .tab.active")?.dataset.tab || "history";
    const listEl = activeTab === "favourites" ? document.getElementById("favList") : document.getElementById("historyList");

    if (!listEl) return;

    const items = listEl.querySelectorAll("li:not(.empty-notice)");
    let visibleCount = 0;

    items.forEach((item) => {
      const text = item.textContent.toLowerCase();
      const matchesQuery = !query || text.includes(query);
      const matchesCat = !cat || text.includes(cat);
      const matchesCost = !cost || text.includes(cost);

      if (matchesQuery && matchesCat && matchesCost) {
        item.style.display = "";
        visibleCount++;
      } else {
        item.style.display = "none";
      }
    });

    if (resultsCount) {
      resultsCount.textContent = `Showing ${visibleCount} activities`;
    }
  }

  // -----------------------------
  // DOM LIFECYCLE (INIT & CLEANUP)
  // -----------------------------
  function cleanup(fullReset = true) {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    clearManagedTimeout(toastTimer);
    toastTimer = null;
    clearManagedTimeout(fetchTimer);
    fetchTimer = null;
    clearAllTimers();

    const toast = document.getElementById("toast");
    if (toast) {
      toast.classList.remove("show");
    }

    if (fullReset) {
      isInitialized = false;
      document.body.removeAttribute("data-boredom-buster-initialized");
    }
  }

  function init() {
    // If already initialized, cleanly tear down prior listeners & timers first
    if (isInitialized) {
      cleanup(false);
    }

    abortController = new AbortController();
    const { signal } = abortController;

    isInitialized = true;
    document.body.setAttribute("data-boredom-buster-initialized", "true");

    // Unhide UI cards
    const resultBox = document.getElementById("resultBox");
    if (resultBox) {
      resultBox.removeAttribute("hidden");
      resultBox.style.display = "block";
    }

    const extraCard = document.getElementById("extraCard");
    if (extraCard) {
      extraCard.removeAttribute("hidden");
    }

    const progressCard = document.getElementById("progressCard");
    if (progressCard) {
      progressCard.removeAttribute("hidden");
    }

    const activityName = document.getElementById("activityName");
    if (activityName && (!activityName.textContent || activityName.textContent.trim() === "")) {
      activityName.textContent = "Ready! Click the button below.";
    }

    // Load state
    loadState();

    // Theme initialization
    const theme = getTheme();
    applyTheme(theme);

    // Render lists & progress
    renderHistory();
    renderFavourites();
    renderProgress();

    // Attach listeners with AbortSignal
    const themeBtn = document.getElementById("themeBtn");
    if (themeBtn) {
      themeBtn.addEventListener("click", toggleTheme, { signal });
    }

    const fetchBtn = document.getElementById("fetchBtn");
    if (fetchBtn) {
      fetchBtn.addEventListener("click", handleFetchClick, { signal });
    }

    const againBtn = document.getElementById("againBtn");
    if (againBtn) {
      againBtn.addEventListener("click", handleFetchClick, { signal });
    }

    const favBtn = document.getElementById("favBtn");
    if (favBtn) {
      favBtn.addEventListener("click", toggleFavourite, { signal });
    }

    const shareBtn = document.getElementById("shareBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", copyActivity, { signal });
    }

    const completeBtn = document.getElementById("completeBtn");
    if (completeBtn) {
      completeBtn.addEventListener("click", markComplete, { signal });
    }

    document.querySelectorAll(".tabs .tab").forEach((tab) => {
      tab.addEventListener("click", switchTab, { signal });
    });

    const activitySearch = document.getElementById("activitySearch");
    if (activitySearch) {
      activitySearch.addEventListener("input", filterLists, { signal });
    }

    const filterCategory = document.getElementById("filterCategory");
    if (filterCategory) {
      filterCategory.addEventListener("change", filterLists, { signal });
    }

    const filterCost = document.getElementById("filterCost");
    if (filterCost) {
      filterCost.addEventListener("change", filterLists, { signal });
    }
  }

  // -----------------------------
  // PUBLIC API EXPOSURE
  // -----------------------------
  const BoredomBuster = {
    init,
    cleanup,
    isInitialized: () => isInitialized,
    getActiveTimers: () => activeTimers.size,
    getState: () => ({
      currentActivity: currentActivity ? { ...currentActivity } : null,
      history: [...history],
      favourites: [...favourites],
      completed: [...completed],
    }),
    generateActivity,
    toggleTheme,
    showToast,
  };

  window.BoredomBuster = BoredomBuster;
  window.initBoredomBuster = init;
  window.cleanupBoredomBuster = cleanup;

  // Auto-init upon DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
