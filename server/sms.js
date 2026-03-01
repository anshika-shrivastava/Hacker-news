/**
 * sms.js
 * ------
 * Twilio SMS sending module.
 * Formats HN stories into a concise SMS message (no emojis to stay in GSM-7 encoding)
 * and sends it to the provided phone number.
 */

const twilio = require("twilio");

// Authenticate using Account SID + Auth Token
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;

/**
 * Format stories into a short SMS-friendly message.
 * Avoids emojis to use GSM-7 encoding (160 chars/segment instead of 70).
 * Keeps message under 320 chars (2 segments) for trial account compatibility.
 * @param {Object[]} stories — Array of story objects.
 * @returns {string} Formatted message text.
 */
function formatStoriesMessage(stories) {
    let message = "HN Top News:\n";

    stories.forEach((story, i) => {
        // Truncate title to 50 chars to keep message short
        const title = story.title.length > 50
            ? story.title.substring(0, 47) + "..."
            : story.title;
        message += `\n${i + 1}. ${title}\n${story.url}\n`;
    });

    return message;
}

/**
 * Send an SMS with the latest stories.
 * @param {string} toNumber — Recipient phone number (with country code).
 * @param {Object[]} stories — Array of story objects.
 * @returns {Promise<Object>} Twilio message response.
 */
async function sendNewsSMS(toNumber, stories) {
    const body = formatStoriesMessage(stories);

    console.log(`[SMS] Message length: ${body.length} chars`);

    const message = await client.messages.create({
        body: body,
        from: FROM_NUMBER,
        to: toNumber,
    });

    console.log(`[SMS] Sent to ${toNumber} — SID: ${message.sid}`);
    return {
        success: true,
        messageSid: message.sid,
        to: toNumber,
    };
}

module.exports = { sendNewsSMS };
