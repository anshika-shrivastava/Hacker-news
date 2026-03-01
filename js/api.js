/**
 * api.js
 * ------
 * Handles all communication with the Hacker News Firebase API.
 * Exports helper functions to fetch top story IDs and individual story details.
 */

const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";

/**
 * Fetch the array of top-story IDs (sorted by rank).
 * @returns {Promise<number[]>} Array of story IDs.
 */
export async function fetchTopStoryIds() {
  const response = await fetch(`${HN_API_BASE}/topstories.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch top stories: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch the details of a single story by its ID.
 * @param {number} id — The Hacker News item ID.
 * @returns {Promise<Object>} Story object with title, url, score, by, time, etc.
 */
export async function fetchStoryById(id) {
  const response = await fetch(`${HN_API_BASE}/item/${id}.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch story ${id}: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch the top N stories with full details.
 * @param {number} count — Number of stories to retrieve (default 5).
 * @returns {Promise<Object[]>} Array of story objects.
 */
export async function fetchTopStories(count = 5) {
  const ids = await fetchTopStoryIds();
  const topIds = ids.slice(0, count);

  // Fetch all stories in parallel for speed
  const stories = await Promise.all(topIds.map((id) => fetchStoryById(id)));

  // Return only the fields we care about
  return stories.map((story) => ({
    id: story.id,
    title: story.title,
    url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
    score: story.score,
    by: story.by,
    time: story.time,
    descendants: story.descendants || 0,
  }));
}
