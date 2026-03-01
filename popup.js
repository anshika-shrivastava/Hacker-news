/**
 * popup.js
 * --------
 * Reads cached stories from chrome.storage and renders them as cards.
 * Also handles the manual refresh button.
 */

import { getStories, getLastUpdated, saveStories } from "./js/storage.js";
import { fetchTopStories } from "./js/api.js";

// --- DOM references ---------------------------------------------------------
const newsContainer = document.getElementById("news-container");
const loadingEl = document.getElementById("loading");
const lastUpdatedEl = document.getElementById("last-updated");
const refreshBtn = document.getElementById("refresh-btn");

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

    const domain = extractDomain(story.url);

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
 */
function renderStories(stories) {
    // Remove loading indicator and previous cards
    loadingEl.classList.add("hidden");

    // Remove existing cards only
    newsContainer.querySelectorAll(".story-card, .error-message").forEach((el) => el.remove());

    if (!stories || stories.length === 0) {
        const errDiv = document.createElement("div");
        errDiv.className = "error-message";
        errDiv.innerHTML = `<p>No stories cached yet.</p><button id="retry-btn">Retry</button>`;
        newsContainer.appendChild(errDiv);
        errDiv.querySelector("#retry-btn").addEventListener("click", handleRefresh);
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

// --- Manual refresh ---------------------------------------------------------

async function handleRefresh() {
    refreshBtn.classList.add("spinning");
    try {
        const stories = await fetchTopStories(5);
        await saveStories(stories);
        renderStories(stories);
        await updateTimestamp();
    } catch (err) {
        console.error("[HN Popup] Refresh failed:", err);
    } finally {
        refreshBtn.classList.remove("spinning");
    }
}

refreshBtn.addEventListener("click", handleRefresh);

// --- Initial load -----------------------------------------------------------

(async () => {
    const stories = await getStories();
    renderStories(stories);
    await updateTimestamp();
})();
