/**
 * background.js
 * -------------
 * Service worker that orchestrates periodic fetching of Hacker News stories.
 *
 * - On extension install/update → fetch immediately + create a 60-min alarm.
 * - On alarm → fetch and cache the latest 5 stories.
 */

import { fetchTopStories } from "./js/api.js";
import { saveStories } from "./js/storage.js";

const ALARM_NAME = "hn-refresh";
const REFRESH_INTERVAL_MINUTES = 60;
const STORY_COUNT = 5;

/**
 * Fetch the latest stories and persist them to storage.
 */
async function refreshStories() {
    try {
        const stories = await fetchTopStories(STORY_COUNT);
        await saveStories(stories);
        console.log(`[HN Extension] Saved ${stories.length} stories at ${new Date().toLocaleTimeString()}`);
    } catch (error) {
        console.error("[HN Extension] Failed to refresh stories:", error);
    }
}

// --- Event listeners --------------------------------------------------------

/**
 * Runs on first install or extension update.
 * Fetches stories right away and sets up the recurring alarm.
 */
chrome.runtime.onInstalled.addListener(async () => {
    console.log("[HN Extension] Installed — fetching initial stories…");
    await refreshStories();

    // Create a repeating alarm (periodInMinutes must be >= 1 in production)
    chrome.alarms.create(ALARM_NAME, {
        periodInMinutes: REFRESH_INTERVAL_MINUTES,
    });
    console.log(`[HN Extension] Alarm set to fire every ${REFRESH_INTERVAL_MINUTES} minutes.`);
});

/**
 * Fires every time the alarm triggers.
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAME) {
        console.log("[HN Extension] Alarm fired — refreshing stories…");
        await refreshStories();
    }
});
