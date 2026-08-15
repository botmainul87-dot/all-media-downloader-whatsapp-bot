// ================================
// All Media Downloader — WhatsApp Bot
// Config — CODEX-M41NUL
// ================================

module.exports = {
  // Same backend used by the web app (index.html -> API_SERVERS)
  API_SERVERS: [
    { base: 'https://all-media-downloader-api.onrender.com', key: 'm41nul' },
    { base: 'https://all-media-downloader-api-0rts.onrender.com', key: 'm41nul' },
  ],

  // Set this in Render's Environment Variables to use pairing-code login
  // (login by typing your number instead of scanning a QR).
  // Format: full number with country code, no + and no spaces. e.g. 8801XXXXXXXXX
  PAIRING_NUMBER: process.env.PAIRING_NUMBER || '',

  // Port for the small web dashboard (QR / pairing code / status)
  PORT: process.env.PORT || 3000,

  // Folder where the WhatsApp login session is stored so you don't
  // have to re-scan/re-pair every time the bot restarts.
  SESSION_DIR: process.env.SESSION_DIR || './session',

  // Max video size the bot will attempt to send directly (WhatsApp caps
  // media around 64-100MB depending on type/client). Keep a safety margin.
  MAX_VIDEO_MB: 90,
};
