/**
 * HN News API — Cloudflare Worker
 * --------------------------------
 * Receives requests from the Chrome extension and sends
 * WhatsApp messages via Twilio REST API.
 *
 * Secrets (set via `wrangler secret put`):
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_FROM
 */

// --- CORS headers -----------------------------------------------------------
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

// --- Helpers ----------------------------------------------------------------

/**
 * Format stories into a readable WhatsApp message.
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
 * Send a WhatsApp message via Twilio REST API.
 * Uses fetch() instead of the Twilio SDK (not available in Workers).
 */
async function sendWhatsApp(env, toNumber, stories) {
    const body = formatStoriesMessage(stories);
    const from = `whatsapp:${env.TWILIO_WHATSAPP_FROM}`;
    const to = `whatsapp:${toNumber}`;

    // Twilio REST API endpoint
    const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;

    // Basic auth: base64(AccountSID:AuthToken)
    const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: from, To: to, Body: body }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Twilio API error");
    }

    return { success: true, messageSid: data.sid, to: toNumber };
}

// --- Request handler --------------------------------------------------------

async function handleRequest(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === "/api/health" && request.method === "GET") {
        return Response.json(
            { status: "ok", timestamp: new Date().toISOString() },
            { headers: CORS_HEADERS }
        );
    }

    // Send news via WhatsApp
    if (url.pathname === "/api/send-news" && request.method === "POST") {
        try {
            const { phone, stories } = await request.json();

            // Validate inputs
            if (!phone) {
                return Response.json(
                    { error: "Phone number is required." },
                    { status: 400, headers: CORS_HEADERS }
                );
            }
            if (!stories || !Array.isArray(stories) || stories.length === 0) {
                return Response.json(
                    { error: "Stories array is required." },
                    { status: 400, headers: CORS_HEADERS }
                );
            }

            // Validate phone format
            if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
                return Response.json(
                    { error: "Use international format: +91XXXXXXXXXX" },
                    { status: 400, headers: CORS_HEADERS }
                );
            }

            const result = await sendWhatsApp(env, phone, stories);
            return Response.json(result, { headers: CORS_HEADERS });
        } catch (error) {
            return Response.json(
                { error: "Failed to send WhatsApp message. " + error.message },
                { status: 500, headers: CORS_HEADERS }
            );
        }
    }

    // 404
    return Response.json(
        { error: "Not found" },
        { status: 404, headers: CORS_HEADERS }
    );
}

// --- Export ------------------------------------------------------------------

export default {
    fetch: handleRequest,
};
