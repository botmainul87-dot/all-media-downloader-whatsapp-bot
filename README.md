# All Media Downloader — WhatsApp Bot

WhatsApp bot for **All Media Downloader** (TikTok / Instagram / Facebook). When a user sends a link, the bot downloads the video and sends it back on WhatsApp. Backend: `all-media-downloader-api.onrender.com` (same API used by the web app).

Built with [Baileys](https://github.com/WhiskeySockets/Baileys) (unofficial WhatsApp Web API — free, no Meta business verification needed).

---

## Structure

```
wa-bot/
├── index.js          # Entry point: web dashboard + starts the bot
├── bot.js            # WhatsApp connection + message handling
├── config.js         # API servers, pairing number, port, session dir
├── lib/api.js         # Calls the All Media Downloader backend
├── package.json
├── .env.example
└── .gitignore
```

---

## Local test (optional, before deploying)

```bash
cd wa-bot
npm install
npm start
```

Open `http://localhost:3000` in a browser to see the QR code (scan it in the WhatsApp app: **Settings > Linked Devices > Link a Device**).

To log in with a phone number instead, create a `.env` file (copy `.env.example`) and set `PAIRING_NUMBER`, then restart — the dashboard will show an 8-digit pairing code.

---

## Deploy on Render

1. **Push this `wa-bot` folder to GitHub** as a new repo.

2. In the Render dashboard, click **New > Web Service** and select your GitHub repo.

3. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free or Starter (Free works, but the free tier sleeps when inactive — use Starter to keep the bot online 24/7)

4. **Environment Variables** (Render dashboard > Environment):
   - `PAIRING_NUMBER` — (optional) your WhatsApp number with country code, e.g. `8801XXXXXXXXX`. Leave empty to use QR code login instead.

5. Once deployed, open the Render URL (e.g. `https://your-bot.onrender.com`):
   - If `PAIRING_NUMBER` is set, a **pairing code** will be shown — enter it in the WhatsApp app.
   - If not set, a **QR code** will be shown — scan it.

6. Once connected, the session is saved in the `session/` folder. Render's **free/ephemeral disk** can be cleared on restart, which means you may need to log in again. For a persistent session, add a **Persistent Disk** on Render (paid feature), or move to storing session data in an external store later.

---

## Bot commands

- `hi` / `hello` / `start` — sends a welcome message
- Any TikTok/Instagram/Facebook link — downloads and sends the video
- Any other text/link is ignored (to avoid spam)

---

## Notes

- This is an **unofficial** WhatsApp API (Baileys), not Meta's official API. Bulk or spam use carries a risk of the number being banned. Fine for personal or moderate use.
- If a video is larger than 90MB, the bot sends a direct link instead of sending the file (this limit can be changed via `MAX_VIDEO_MB` in `config.js`).
- Audio download is not currently supported by the backend, so it is not supported in the bot either — only video is sent.
