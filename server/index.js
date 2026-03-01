/**
 * index.js
 * --------
 * Express server that receives requests from the Chrome extension
 * and sends WhatsApp messages via Twilio.
 *
 * Endpoints:
 *   POST /api/send-news  — Send top stories to a phone number via WhatsApp.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { sendNewsWhatsApp } = require("./whatsapp");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// --- Health check -----------------------------------------------------------
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Send news via WhatsApp -------------------------------------------------
app.post("/api/send-news", async (req, res) => {
    try {
        const { phone, stories } = req.body;

        // Validate inputs
        if (!phone) {
            return res.status(400).json({ error: "Phone number is required." });
        }
        if (!stories || !Array.isArray(stories) || stories.length === 0) {
            return res.status(400).json({ error: "Stories array is required and must not be empty." });
        }

        // Basic phone number validation (must start with + and country code)
        const phoneRegex = /^\+[1-9]\d{6,14}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                error: "Invalid phone number format. Use international format like +91XXXXXXXXXX",
            });
        }

        console.log(`[Server] Sending ${stories.length} stories to ${phone} via WhatsApp…`);
        const result = await sendNewsWhatsApp(phone, stories);
        res.json(result);
    } catch (error) {
        console.error("[Server] WhatsApp sending failed:", error.message);
        res.status(500).json({
            error: "Failed to send WhatsApp message. " + error.message,
            details: error.message,
        });
    }
});

// --- Start server -----------------------------------------------------------
app.listen(PORT, () => {
    console.log(`\n🚀 HN News Server running on http://localhost:${PORT}`);
    console.log(`   POST /api/send-news — Send stories via WhatsApp\n`);
});
