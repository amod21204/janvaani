<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# JAN-VAANI

A production-hardened AI civic legal copilot that drafts RTI applications, complaint letters, and legal notices through a server-side Gemini integration.

## Run locally

Prerequisites: Node.js 20+

1. Install dependencies:
   `npm install`
2. Create a local `.env` file and set `GEMINI_API_KEY`
3. Start the app:
   `npm run dev`
4. Open `http://localhost:3000`

## Production notes

- Gemini requests are handled by the Express server, so the API key stays off the client.
- Build the frontend with `npm run build`.
- Run the server with `npm start`.
