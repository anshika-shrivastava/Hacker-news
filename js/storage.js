/**
 * storage.js
 * ----------
 * Thin wrapper around chrome.storage.local for reading and writing
 * cached Hacker News stories and the last-updated timestamp.
 */

const STORAGE_KEY_STORIES = "hn_stories";
const STORAGE_KEY_UPDATED = "hn_last_updated";

/**
 * Save stories and a timestamp to local storage.
 * @param {Object[]} stories — Array of story objects.
 * @returns {Promise<void>}
 */
export async function saveStories(stories) {
    await chrome.storage.local.set({
        [STORAGE_KEY_STORIES]: stories,
        [STORAGE_KEY_UPDATED]: Date.now(),
    });
}

/**
 * Retrieve cached stories from local storage.
 * @returns {Promise<Object[]>} Array of story objects (empty array if none cached).
 */
export async function getStories() {
    const result = await chrome.storage.local.get(STORAGE_KEY_STORIES);
    return result[STORAGE_KEY_STORIES] || [];
}

/**
 * Retrieve the timestamp of the last successful fetch.
 * @returns {Promise<number|null>} Unix-epoch milliseconds, or null if never fetched.
 */
export async function getLastUpdated() {
    const result = await chrome.storage.local.get(STORAGE_KEY_UPDATED);
    return result[STORAGE_KEY_UPDATED] || null;
}
