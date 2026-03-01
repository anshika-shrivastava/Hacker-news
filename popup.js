/**
 * popup.js
 * --------
 * Reads cached stories from chrome.storage and renders them as cards.
 * Handles manual refresh and keyword search via HN Algolia API.
 */

import { getStories, getLastUpdated, saveStories } from "./js/storage.js";
import { fetchTopStories, searchStories } from "./js/api.js";

// --- DOM references ---------------------------------------------------------
const newsContainer = document.getElementById("news-container");
const loadingEl = document.getElementById("loading");
const lastUpdatedEl = document.getElementById("last-updated");
const refreshBtn = document.getElementById("refresh-btn");
const searchInput = document.getElementById("search-input");
const clearSearchBtn = document.getElementById("clear-search-btn");

// --- State ------------------------------------------------------------------
let searchTimeout = null;
let isSearchMode = false;

// --- Helpers ----------------------------------------------------------------

/**
 * Convert a Unix timestamp (seconds) to a human-readable "time ago" string.
 * @param {number} unixSeconds
 * @returns {string}
 */
function timeAgo(unixSeconds) {
    const seconds = Math.floor(Date.now() / 1000 - unixSeconds);
    if (seconds < 60) return "just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

/**
 * Format a timestamp to a readable date string.
 * @param {number} ms — Milliseconds since epoch.
 * @returns {string}
 */
function formatTimestamp(ms) {
    const date = new Date(ms);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Extract the hostname from a URL for display.
 * @param {string} url
 * @returns {string}
 */
function extractDomain(url) {
    try {
        const hostname = new URL(url).hostname;
        return hostname.replace(/^www\./, "");
    } catch {
        return "";
    }
}

// --- SVG icons (inline to avoid extra files) --------------------------------

const ICONS = {
    points: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    comment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
};

// --- Rendering --------------------------------------------------------------

/**
 * Create a story card element.
 * @param {Object} story
 * @param {number} index — 0-based rank
 * @returns {HTMLAnchorElement}
 */
function createStoryCard(story, index) {
    const card = document.createElement("a");
    card.className = "story-card";
    card.href = story.url;
    card.target = "_blank";
    card.rel = "noopener";
    card.title = story.title;

    card.innerHTML = `
    <div class="story-rank">${index + 1}</div>
    <div class="story-body">
      <div class="story-title">${escapeHtml(story.title)}</div>
      <div class="story-meta">
        <span class="meta-item score-highlight">${ICONS.points} ${story.score}</span>
        <span class="meta-item">${ICONS.user} ${escapeHtml(story.by)}</span>
        <span class="meta-item">${ICONS.clock} ${timeAgo(story.time)}</span>
        <span class="meta-item">${ICONS.comment} ${story.descendants}</span>
      </div>
    </div>
  `;

    return card;
}

/**
 * Render an array of stories into the container.
 * @param {Object[]} stories
 * @param {string} [label] — Optional label to show above the cards (e.g. "Search results")
 */
function renderStories(stories, label) {
    // Remove loading indicator and previous cards
    loadingEl.classList.add("hidden");

    // Remove existing cards, labels, and messages
    newsContainer.querySelectorAll(".story-card, .error-message, .search-label, .no-results").forEach((el) => el.remove());

    // Add label if provided
    if (label) {
        const labelEl = document.createElement("div");
        labelEl.className = "search-label";
        labelEl.textContent = label;
        newsContainer.appendChild(labelEl);
    }

    if (!stories || stories.length === 0) {
        if (isSearchMode) {
            const noRes = document.createElement("div");
            noRes.className = "no-results";
            noRes.innerHTML = `<div class="no-results-emoji">🔍</div><p>No stories found for this search.<br>Try a different keyword.</p>`;
            newsContainer.appendChild(noRes);
        } else {
            const errDiv = document.createElement("div");
            errDiv.className = "error-message";
            errDiv.innerHTML = `<p>No stories cached yet.</p><button id="retry-btn">Retry</button>`;
            newsContainer.appendChild(errDiv);
            errDiv.querySelector("#retry-btn").addEventListener("click", handleRefresh);
        }
        return;
    }

    stories.forEach((story, i) => {
        newsContainer.appendChild(createStoryCard(story, i));
    });
}

/**
 * Update the "Last updated" footer text.
 */
async function updateTimestamp() {
    const ts = await getLastUpdated();
    if (ts) {
        lastUpdatedEl.textContent = `Updated: ${formatTimestamp(ts)}`;
    }
}

/**
 * Basic HTML-entity escaper to prevent XSS from story titles/authors.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// --- Search -----------------------------------------------------------------

/**
 * Perform a search and render results.
 * @param {string} query
 */
async function handleSearch(query) {
    if (!query || query.trim().length === 0) {
        // Clear search — go back to cached top stories
        isSearchMode = false;
        clearSearchBtn.classList.add("hidden");
        const stories = await getStories();
        renderStories(stories);
        await updateTimestamp();
        return;
    }

    isSearchMode = true;
    clearSearchBtn.classList.remove("hidden");

    // Show loading state
    newsContainer.querySelectorAll(".story-card, .error-message, .search-label, .no-results").forEach((el) => el.remove());
    loadingEl.classList.remove("hidden");

    try {
        const results = await searchStories(query.trim(), 5);
        renderStories(results, `Results for "${query.trim()}"`);
    } catch (err) {
        console.error("[HN Popup] Search failed:", err);
        loadingEl.classList.add("hidden");
        const errDiv = document.createElement("div");
        errDiv.className = "error-message";
        errDiv.innerHTML = `<p>Search failed. Please try again.</p>`;
        newsContainer.appendChild(errDiv);
    }
}

/**
 * Debounced search handler — waits 400ms after the user stops typing.
 */
function onSearchInput() {
    clearTimeout(searchTimeout);
    const query = searchInput.value;

    if (!query) {
        clearSearchBtn.classList.add("hidden");
    } else {
        clearSearchBtn.classList.remove("hidden");
    }

    searchTimeout = setTimeout(() => handleSearch(query), 400);
}

/**
 * Clear the search input and go back to top stories.
 */
function clearSearch() {
    searchInput.value = "";
    clearSearchBtn.classList.add("hidden");
    handleSearch("");
}

searchInput.addEventListener("input", onSearchInput);
clearSearchBtn.addEventListener("click", clearSearch);

// --- Manual refresh ---------------------------------------------------------

async function handleRefresh() {
    refreshBtn.classList.add("spinning");
    try {
        if (isSearchMode && searchInput.value.trim()) {
            // Re-run the current search
            const results = await searchStories(searchInput.value.trim(), 5);
            renderStories(results, `Results for "${searchInput.value.trim()}"`);
        } else {
            // Refresh top stories
            const stories = await fetchTopStories(5);
            await saveStories(stories);
            renderStories(stories);
            await updateTimestamp();
        }
    } catch (err) {
        console.error("[HN Popup] Refresh failed:", err);
    } finally {
        refreshBtn.classList.remove("spinning");
    }
}

refreshBtn.addEventListener("click", handleRefresh);

// --- SMS notification -------------------------------------------------------

const phoneInput = document.getElementById("phone-input");
const sendSmsBtn = document.getElementById("send-sms-btn");
const smsStatus = document.getElementById("sms-status");

const SERVER_URL = "https://hn-news-api.blogapp.workers.dev";

/**
 * Show a status message with a type (sending, success, error).
 */
function showSmsStatus(message, type) {
    smsStatus.textContent = message;
    smsStatus.className = `sms-status ${type}`;
}

/**
 * Collect the currently displayed stories and send them via SMS.
 */
async function handleSendSMS() {
    const phone = phoneInput.value.trim();

    if (!phone) {
        showSmsStatus("Please enter your WhatsApp number.", "error");
        return;
    }

    // Validate phone format
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
        showSmsStatus("Use international format: +91XXXXXXXXXX", "error");
        return;
    }

    // Collect stories currently visible in the popup
    let stories;
    if (isSearchMode && searchInput.value.trim()) {
        stories = await searchStories(searchInput.value.trim(), 5);
    } else {
        stories = await getStories();
    }

    if (!stories || stories.length === 0) {
        showSmsStatus("No stories to send. Load some first!", "error");
        return;
    }

    // Disable button and show sending state
    sendSmsBtn.disabled = true;
    showSmsStatus("Sending SMS…", "sending");

    try {
        const response = await fetch(`${SERVER_URL}/api/send-news`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, stories }),
        });

        const data = await response.json();

        if (response.ok) {
            showSmsStatus("✅ WhatsApp message sent!", "success");
        } else {
            showSmsStatus(`❌ ${data.error || "Failed to send message."}`, "error");
        }
    } catch (error) {
        console.error("[HN Popup] SMS failed:", error);
        showSmsStatus("❌ Server not running. Start: cd server && npm start", "error");
    } finally {
        sendSmsBtn.disabled = false;
    }
}

sendSmsBtn.addEventListener("click", handleSendSMS);

// --- Initial load -----------------------------------------------------------

(async () => {
    const stories = await getStories();
    renderStories(stories);
    await updateTimestamp();
})();
