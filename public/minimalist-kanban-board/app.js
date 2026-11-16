(function () {
  /**
   * Idempotent initialization function for Minimalist Kanban Board.
   * Guarded with window.__KANBAN_INITIALIZED__ to prevent duplicate
   * event listeners, theme flip-flop on toggle, and redundant DOM updates
   * if the script is evaluated or injected multiple times.
   */
  function initKanban() {
    if (typeof window !== "undefined" && window.__KANBAN_INITIALIZED__) {
      return;
    }
    if (typeof window !== "undefined") {
      window.__KANBAN_INITIALIZED__ = true;
    }

    // Local Storage Keys
    const STORAGE_KEY = "kanban_workspace_cards";

    // Selectors (Source Anchors)
    const todoLane = document.getElementById("todo-lane");
    const progressLane = document.getElementById("progress-lane");
    const doneLane = document.getElementById("done-lane");
    const addCardBtn = document.getElementById("addCardBtn");
    const cardModal = document.getElementById("cardModal");
    const cancelModalBtn = document.getElementById("cancelModalBtn");
    const submitCardBtn = document.getElementById("submitCardBtn");
    const taskTitleInput = document.getElementById("taskTitle");
    const taskTagSelect = document.getElementById("taskTag");
    const themeToggleBtn = document.getElementById("themeToggleBtn");

    const counters = {
      todo: document.getElementById("todo-count"),
      progress: document.getElementById("progress-count"),
      done: document.getElementById("done-count"),
    };

    let cardsData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    // Synchronize and Update Counters
    function updateWorkspaceUI() {
      if (todoLane) todoLane.innerHTML = "";
      if (progressLane) progressLane.innerHTML = "";
      if (doneLane) doneLane.innerHTML = "";

      const counts = { todo: 0, progress: 0, done: 0 };

      cardsData.forEach((card) => {
        if (counts[card.lane] !== undefined) {
          counts[card.lane]++;
        }
        createCardElement(card);
      });

      Object.keys(counters).forEach((lane) => {
        if (counters[lane]) {
          counters[lane].innerText = counts[lane];
        }
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(cardsData));
    }

    // Generate DOM Elements dynamically
    function createCardElement(card) {
      const cardEl = document.createElement("div");
      cardEl.classList.add("kanban-card");
      cardEl.setAttribute("draggable", "true");
      cardEl.setAttribute("data-id", card.id);

      cardEl.innerHTML = `
        <div class="card-header-bar ${card.tag}"></div>
        <div class="card-content">
            <span class="card-title">${escapeHTML(card.title)}</span>
            <button class="delete-card-btn" aria-label="Delete Card">&times;</button>
        </div>
      `;

      cardEl.addEventListener("dragstart", () => cardEl.classList.add("dragging"));
      cardEl.addEventListener("dragend", () => cardEl.classList.remove("dragging"));

      const deleteBtn = cardEl.querySelector(".delete-card-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
          cardsData = cardsData.filter((c) => c.id !== card.id);
          updateWorkspaceUI();
        });
      }

      if (card.lane === "todo" && todoLane) todoLane.appendChild(cardEl);
      if (card.lane === "progress" && progressLane) progressLane.appendChild(cardEl);
      if (card.lane === "done" && doneLane) doneLane.appendChild(cardEl);
    }

    function escapeHTML(str) {
      if (typeof str !== "string") return "";
      return str.replace(
        /[&<>'"]/g,
        (tag) =>
          ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
            tag
          ] || tag,
      );
    }

    // Lane Drag & Drop Setup Hook
    [todoLane, progressLane, doneLane].forEach((zone) => {
      if (!zone) return;

      zone.addEventListener("dragover", (e) => {
        e.preventDefault();
        zone.classList.add("drag-over");
      });

      zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));

      zone.addEventListener("drop", () => {
        zone.classList.remove("drag-over");
        const activeCardEl = document.querySelector(".dragging");
        if (!activeCardEl) return;

        const cardId = activeCardEl.getAttribute("data-id");
        const targetLane = zone.id.replace("-lane", "");

        const cardIndex = cardsData.findIndex((c) => c.id === cardId);
        if (cardIndex !== -1) {
          cardsData[cardIndex].lane = targetLane;
          updateWorkspaceUI();
        }
      });
    });

    if (addCardBtn) {
      addCardBtn.addEventListener("click", () => {
        if (taskTitleInput) taskTitleInput.value = "";
        if (cardModal) cardModal.classList.add("active");
        if (taskTitleInput) taskTitleInput.focus();
      });
    }

    if (cancelModalBtn) {
      cancelModalBtn.addEventListener("click", () => {
        if (cardModal) cardModal.classList.remove("active");
      });
    }

    if (submitCardBtn) {
      submitCardBtn.addEventListener("click", () => {
        if (!taskTitleInput) return;
        const titleText = taskTitleInput.value.trim();
        if (!titleText) return;

        const newCard = {
          id: "card_" + Date.now(),
          title: titleText,
          tag: taskTagSelect ? taskTagSelect.value : "tag-blue",
          lane: "todo",
        };

        cardsData.push(newCard);
        updateWorkspaceUI();
        if (cardModal) cardModal.classList.remove("active");
      });
    }

    updateWorkspaceUI();

    // Theme Toggle Event Listener & System Preference Sync
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
        const nextTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", nextTheme);
        localStorage.setItem("theme", nextTheme);
      });
    }

    // Automatically sync theme if system preference changes and no user override is saved
    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        if (!localStorage.getItem("theme")) {
          const nextTheme = e.matches ? "dark" : "light";
          document.documentElement.setAttribute("data-theme", nextTheme);
        }
      });
    }

    // Expose helpers for testing if needed
    window.updateWorkspaceUI = updateWorkspaceUI;
    window.getCardsData = () => cardsData;
  }

  // Expose initialization function globally on window
  if (typeof window !== "undefined") {
    window.initKanban = initKanban;
  }

  // Automatically initialize when document is ready
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initKanban);
    } else {
      initKanban();
    }
  }
})();
