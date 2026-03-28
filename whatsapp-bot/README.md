# JanVaani WhatsApp Bot

## Setup

1. Open a terminal in `whatsapp-bot/`
2. Run `npm install`
3. Copy `.env.example` to `.env`
4. Add your Twilio credentials
5. Run `npm run dev`
6. Start ngrok: `ngrok http 3000`
7. Copy the HTTPS forwarding URL
8. In Twilio sandbox settings, set the webhook to:
   `https://your-ngrok-url.ngrok-free.app/whatsapp`
9. Open `http://localhost:3000` to test the website button
10. Use the Twilio sandbox WhatsApp number from your Twilio console to join the sandbox on your phone

## Test

1. Join the Twilio WhatsApp sandbox from your phone
2. Send `hi`
3. Send `help`
4. Send `1` or `2`
5. Click the website button and confirm it opens WhatsApp with the predefined message
