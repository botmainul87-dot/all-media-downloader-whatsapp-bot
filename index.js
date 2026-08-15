// ================================
// All Media Downloader — WhatsApp Bot
// Entry point: web dashboard + bot bootstrap
// CODEX-M41NUL
// ================================

const express = require('express');
const QRCode = require('qrcode');
const { PORT } = require('./config');
const { startBot, getState } = require('./bot');

const app = express();

app.get('/', async (req, res) => {
  const state = getState();
  let qrImg = '';
  if (state.status === 'qr' && state.qr) {
    qrImg = await QRCode.toDataURL(state.qr);
  }

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="refresh" content="5" />
<title>All Media Downloader — WhatsApp Bot</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(circle at 50% 0%, #142a1f 0%, #0b0f10 60%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #eafff2;
    padding: 24px;
  }
  .card {
    width: 100%; max-width: 420px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    backdrop-filter: blur(20px);
    border-radius: 24px;
    padding: 32px 28px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  }
  h1 { font-size: 20px; margin: 0 0 4px; font-weight: 700; }
  p.sub { color: #9fb8ab; font-size: 13px; margin: 0 0 24px; }
  .status {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 14px; border-radius: 999px;
    font-size: 13px; font-weight: 600; margin-bottom: 20px;
  }
  .status.connected { background: rgba(37,211,102,0.15); color: #25d366; }
  .status.qr, .status.pairing { background: rgba(255,193,7,0.15); color: #ffc107; }
  .status.disconnected, .status.starting { background: rgba(255,255,255,0.1); color: #b8c2bd; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
  img.qr { width: 100%; max-width: 260px; border-radius: 16px; margin: 0 auto 20px; display: block; background: #fff; padding: 12px; }
  .code {
    font-size: 32px; letter-spacing: 6px; font-weight: 800;
    background: rgba(255,255,255,0.08); border-radius: 16px;
    padding: 20px; margin-bottom: 16px; color: #25d366;
  }
  .hint { font-size: 13px; color: #9fb8ab; line-height: 1.5; }
  .connected-box { padding: 40px 0; }
  .connected-box .icon { font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #25d366; margin-bottom: 12px; }
</style>
</head>
<body>
  <div class="card">
    <h1>All Media Downloader</h1>
    <p class="sub">WhatsApp Bot Dashboard — CODEX-M41NUL</p>

    ${state.status === 'connected' ? `
      <div class="status connected"><span class="dot"></span>Connected</div>
      <div class="connected-box">
        <div class="icon">CONNECTED</div>
        <p class="hint">Bot is ready. Send a link on WhatsApp to test it.</p>
      </div>
    ` : state.status === 'pairing' && state.pairingCode ? `
      <div class="status pairing"><span class="dot"></span>Waiting for pairing</div>
      <div class="code">${state.pairingCode}</div>
      <p class="hint">Open WhatsApp app, go to Settings &gt; Linked Devices &gt; Link a Device &gt;<br>"Link with phone number instead", then enter this code.<br><br>Number: ${state.phoneNumber}</p>
    ` : state.status === 'qr' && qrImg ? `
      <div class="status qr"><span class="dot"></span>Waiting for scan</div>
      <img class="qr" src="${qrImg}" alt="QR Code" />
      <p class="hint">Open WhatsApp app, go to Settings &gt; Linked Devices &gt; Link a Device, then scan this QR code.</p>
    ` : `
      <div class="status starting"><span class="dot"></span>Starting...</div>
      <p class="hint">Bot is starting, please wait. This page will auto-refresh.</p>
    `}
  </div>
</body>
</html>
  `);
});

app.get('/status', (req, res) => {
  const state = getState();
  res.json({ status: state.status, connected: state.status === 'connected' });
});

app.listen(PORT, () => {
  console.log(`🌐 Dashboard running on port ${PORT}`);
});

startBot(() => {
  // state updates automatically reflected via getState() on next page load
}).catch((err) => {
  console.error('Failed to start bot:', err);
});
