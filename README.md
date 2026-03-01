# Hacker News Extension with WhatsApp Notifications

A modern Chrome extension that displays the latest top 5 stories from Hacker News, allows searching through HN via Algolia, and sends news directly to your WhatsApp!

## Features
- **Hourly Auto-Refresh:** Always shows the latest 5 HN stories.
- **Instant Search:** Find stories by topic, person, or domain instantly using Algolia.
- **WhatsApp Integration:** Send the currently displayed news list to any WhatsApp number.
- **Serverless Backend:** WhatsApp API is securely hosted on Cloudflare Workers.

## Setup Instructions for Users

If you are a new user installing this extension, you need to join the Twilio WhatsApp Sandbox once before you can receive messages.

### 1. Join the WhatsApp Sandbox (One-time setup)
You only need to do this once per WhatsApp account.

1. **Scan the QR Code** below using your phone's camera, OR
2. Save the contact **+1 (415) 523-8886** and message it on WhatsApp with: `join breathe-within`

![WhatsApp QR Code](images/whatsapp-qr.png)

### 2. Use the Extension
1. Open the extension in Chrome.
2. Search for a topic (optional).
3. Enter your phone number (the one you used to join the sandbox) in the format `+91XXXXXXXXXX` (include country code).
4. Click **Send**!
5. You will instantly receive the news on your WhatsApp.

---

## Developer Guide

### Extension Architecture
- `manifest.json`: V3 manifest with permissions for HN API, Algolia, and Cloudflare Worker.
- `popup.html / css / js`: The UI layer with dark mode and animations.
- `js/api.js`: Handles fetching from `hacker-news.firebaseio.com` and searching via `hn.algolia.com`.
- `js/storage.js`: Caches stories using `chrome.storage.local`.

### Backend Architecture (Cloudflare Workers)
The backend is completely serverless and hosted on Cloudflare Workers. It uses the Twilio REST API to send WhatsApp messages.

- Location: `/worker/src/index.js`
- API Endpoint: `POST https://hn-news-api.blogapp.workers.dev/api/send-news`

#### Managing Cloudflare Secrets
Your Twilio credentials are secure and NOT committed to this repository. They are stored securely in Cloudflare.
If you need to update them, use `wrangler`:

```bash
cd worker
npx wrangler login

npx wrangler secret put TWILIO_ACCOUNT_SID
npx wrangler secret put TWILIO_AUTH_TOKEN
npx wrangler secret put TWILIO_WHATSAPP_FROM
```

#### Deploying Updates to the Backend
```bash
cd worker
npx wrangler deploy
```
