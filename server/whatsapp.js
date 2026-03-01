/**
 * whatsapp.js
 * -----------
 * Twilio WhatsApp messaging module.
 * Formats HN stories into a readable WhatsApp message with clickable links
 * and sends it to the provided phone number via WhatsApp.
 */

const twilio = require("twilio");

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const FROM_WHATSAPP = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`;

/**
 * Format stories into a readable WhatsApp message.
 * WhatsApp supports longer messages and rich text, so we can include more details.
 * @param {Object[]} stories — Array of story objects.
 * @returns {string} Formatted message text.
 */
function formatStoriesMessage(stories) {
    let message = "📰 *HN Top News*\n\n";

    stories.forEach((story, i) => {
        message += `*${i + 1}. ${story.title}*\n`;
        message += `⬆ ${story.score} pts | 👤 ${story.by}\n`;
        message += `🔗 ${story.url}\n\n`;
    });

    message += "_Sent from HN News Extension_";
    return message;
}

/**
 * Send a WhatsApp message with the latest stories.
 * @param {string} toNumber — Recipient phone number with country code (e.g. +917676597261).
 * @param {Object[]} stories — Array of story objects.
 * @returns {Promise<Object>} Twilio message response.
 */
async function sendNewsWhatsApp(toNumber, stories) {
    const body = formatStoriesMessage(stories);

    const message = await client.messages.create({
        body: body,
        from: FROM_WHATSAPP,
        to: `whatsapp:${toNumber}`,
    });

    console.log(`[WhatsApp] Sent to ${toNumber} — SID: ${message.sid}`);
    return {
        success: true,
        messageSid: message.sid,
        to: toNumber,
    };
}

module.exports = { sendNewsWhatsApp };
