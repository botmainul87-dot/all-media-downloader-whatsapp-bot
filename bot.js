// ================================
// All Media Downloader — WhatsApp Bot Core
// CODEX-M41NUL
// ================================

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('atexovi-baileys');
const pino = require('pino');
const { PAIRING_NUMBER, SESSION_DIR, MAX_VIDEO_MB } = require('./config');
const { detectPlatform, fetchVideoInfo, streamVideo } = require('./lib/api');

// Shared state the web dashboard reads from
const state = {
  status: 'starting',   // starting | qr | pairing | connected | disconnected
  qr: null,             // raw qr string (dashboard renders it as an image)
  pairingCode: null,
  phoneNumber: null,
};

let sock = null;
let pairingRequested = false;

async function startBot(onStateChange) {
  const { state: authState, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: authState,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
  });

  // Pairing-code login: only requested once per registration attempt,
  // and only if not already registered. We guard with `pairingRequested`
  // so a reconnect loop doesn't keep invalidating the previous code before
  // the user has a chance to enter it.
  if (PAIRING_NUMBER && !sock.authState.creds.registered && !pairingRequested) {
    pairingRequested = true;
    try {
      // WhatsApp needs the socket to settle before it will hand out a
      // pairing code — requesting immediately after creation causes 428/405.
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const code = await sock.requestPairingCode(PAIRING_NUMBER.replace(/[^0-9]/g, ''));
      state.pairingCode = code;
      state.status = 'pairing';
      state.phoneNumber = PAIRING_NUMBER;
      onStateChange && onStateChange(state);
      console.log(`\nPAIRING CODE: ${code}\nOpen WhatsApp > Linked Devices > Link with phone number, then enter this code.\n`);
    } catch (err) {
      console.error('Failed to request pairing code:', err.message);
      pairingRequested = false; // allow a retry on the next connection attempt
    }
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !PAIRING_NUMBER) {
      state.qr = qr;
      state.status = 'qr';
      onStateChange && onStateChange(state);
    }

    if (connection === 'open') {
      state.status = 'connected';
      state.qr = null;
      state.pairingCode = null;
      onStateChange && onStateChange(state);
      console.log('WhatsApp connected.');
    }

    if (connection === 'close') {
      state.status = 'disconnected';
      onStateChange && onStateChange(state);
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed.', statusCode, 'Reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(() => startBot(onStateChange), 8000);
      } else {
        console.log('Logged out. Delete the session folder and restart to re-login.');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const from = msg.key.remoteJid;
      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        '';
      if (!text) continue;
      handleMessage(from, text.trim()).catch((err) => {
        console.error('handleMessage error:', err);
      });
    }
  });

  return sock;
}

async function handleMessage(from, text) {
  if (/^(hi|hello|hey|start|\/start)$/i.test(text)) {
    await sock.sendMessage(from, {
      text:
        'All Media Downloader Bot\n\n' +
        'Send a TikTok, Instagram, or Facebook link and I will download and send the video.\n\n' +
        'Just paste the link.',
    });
    return;
  }

  const platform = detectPlatform(text);
  if (!platform) {
    // Ignore messages that aren't links / greetings, so the bot doesn't spam
    // every random chat message with an error.
    if (/https?:\/\//i.test(text)) {
      await sock.sendMessage(from, {
        text: "That doesn't look like a TikTok, Instagram, or Facebook link. Please check and send again.",
      });
    }
    return;
  }

  await sock.sendMessage(from, { text: 'Checking the link, please wait...' });

  let info;
  try {
    info = await fetchVideoInfo(text);
  } catch (err) {
    await sock.sendMessage(from, { text: `Error: ${err.message}` });
    return;
  }

  const { data, server } = info;
  const captionLine = data.caption ? `\nCaption: ${data.caption.slice(0, 200)}` : '';
  const sizeLine = data.size ? `\nSize: ${data.size}` : '';
  const durationLine = data.duration ? `\nDuration: ${data.duration}` : '';

  await sock.sendMessage(from, {
    text: `Video found.${captionLine}${sizeLine}${durationLine}\n\nDownloading and sending now...`,
  });

  try {
    const buffer = await streamVideo(data, server, platform);
    const sizeMB = buffer.length / (1024 * 1024);

    if (sizeMB > MAX_VIDEO_MB) {
      await sock.sendMessage(from, {
        text: `The video is ${sizeMB.toFixed(1)}MB, too large to send directly on WhatsApp. Direct link:\n${data.video_url || 'Link available via app.'}`,
      });
      return;
    }

    await sock.sendMessage(from, {
      video: buffer,
      caption: data.caption ? data.caption.slice(0, 1000) : undefined,
      mimetype: 'video/mp4',
    });
  } catch (err) {
    console.error('Video send error:', err);
    await sock.sendMessage(from, {
      text: 'There was a problem downloading or sending the video. Please try again in a moment.',
    });
  }
}

function getState() {
  return state;
}

// Called from the dashboard when the user types a number and submits the form.
// Requests a fresh pairing code from the already-running socket.
async function requestPairing(phoneNumber) {
  if (!sock) {
    throw new Error('Bot is not ready yet. Please wait a moment and try again.');
  }
  if (sock.authState?.creds?.registered) {
    throw new Error('Already connected. Log out first to link a different number.');
  }
  const cleaned = phoneNumber.replace(/[^0-9]/g, '');
  if (!cleaned) {
    throw new Error('Please enter a valid phone number with country code.');
  }
  const code = await sock.requestPairingCode(cleaned);
  pairingRequested = true;
  state.pairingCode = code;
  state.status = 'pairing';
  state.phoneNumber = cleaned;
  state.qr = null;
  return code;
}

module.exports = { startBot, getState, requestPairing };
