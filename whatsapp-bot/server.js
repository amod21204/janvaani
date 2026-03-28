require('dotenv').config();

const express = require('express');
const twilio = require('twilio');

const app = express();
const port = Number(process.env.PORT) || 3000;
const whatsappNumber = process.env.WHATSAPP_PHONE_NUMBER || '+919370325802';
const welcomeMessage = process.env.WELCOME_MESSAGE || 'Hi! I need help from JanVaani';

// Warn early if Twilio credentials are missing. The sandbox webhook can still be
// tested, but this reminder helps avoid confusion during setup.
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.warn('Warning: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is missing in .env');
}

// Twilio sends webhook payloads as form data.
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(express.static('public'));

// Small helper to normalize incoming text.
function normalizeMessage(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function buildMenuMessage() {
  return [
    'JanVaani Help Menu',
    '1. About',
    '2. Contact',
    '',
    'Reply with 1 or 2.',
  ].join('\n');
}

function getBotReply(message) {
  const normalized = normalizeMessage(message);

  if (!normalized) {
    return 'Please send a message so I can help you.';
  }

  if (normalized === 'hi' || normalized === 'hello' || normalized === 'hey') {
    return 'Hello! How can I help you? Type help to see the menu.';
  }

  if (normalized === 'help' || normalized === 'menu') {
    return buildMenuMessage();
  }

  if (normalized === 'ask question' || normalized === 'question') {
    return 'Please type your question and I will guide you as best as I can.';
  }

  if (normalized === '1' || normalized === 'about') {
    return 'JanVaani is a civic and legal support platform that helps citizens with complaints, guidance, and public service information.';
  }

  if (normalized === '2' || normalized === 'contact') {
    return 'You can contact JanVaani support through the website contact section or reply here with your question.';
  }

  return 'Sorry, I did not understand that. Please type hi or help.';
}

app.get('/', (_req, res) => {
  res.send('JanVaani WhatsApp bot is running.');
});

// Small public config endpoint used by the demo website button.
app.get('/api/config', (_req, res) => {
  res.json({
    whatsappNumber,
    welcomeMessage,
  });
});

// Main WhatsApp webhook.
app.post('/whatsapp', (req, res) => {
  const incomingMessage = req.body.Body || '';
  const from = req.body.From || 'unknown';

  // Beginner-friendly logging so you can see traffic in the terminal.
  console.log(`[${new Date().toISOString()}] Incoming WhatsApp message from ${from}: ${incomingMessage}`);

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(getBotReply(incomingMessage));

  res.type('text/xml');
  res.send(twiml.toString());
});

app.listen(port, () => {
  console.log(`JanVaani WhatsApp bot running on http://localhost:${port}`);
  console.log('Webhook endpoint: /whatsapp');
  console.log(`Website button target number: ${whatsappNumber}`);
});
