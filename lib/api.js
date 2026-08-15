// ================================
// Backend API helper
// Mirrors the failover logic used in index.html (fetchWithFailover)
// ================================

const axios = require('axios');
const { API_SERVERS } = require('../config');

function detectPlatform(url) {
  const u = url.toLowerCase();
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
  return null;
}

// Calls GET /api/download on the first server that responds ok, same as the web app.
async function fetchVideoInfo(url) {
  let lastErr = null;
  for (const server of API_SERVERS) {
    try {
      const apiUrl = `${server.base}/api/download?url=${encodeURIComponent(url)}&api_key=${server.key}`;
      const res = await axios.get(apiUrl, { timeout: 30000, validateStatus: () => true });
      if (res.status >= 200 && res.status < 300 && res.data && res.data.success) {
        return { data: res.data, server };
      }
      lastErr = new Error(friendlyError(res.status, res.data));
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Could not reach the download server.');
}

// Streams the actual video file from /api/proxy-video, same params the web app builds.
async function streamVideo(result, server, platform) {
  let url;
  if (result.proxy_token) {
    url = `${server.base}/api/proxy-video?proxy_token=${encodeURIComponent(result.proxy_token)}&platform=${platform}&api_key=${server.key}`;
  } else if (result.video_url) {
    url = `${server.base}/api/proxy-video?video_url=${encodeURIComponent(result.video_url)}&platform=${platform}&api_key=${server.key}`;
  } else {
    throw new Error('No video source returned for this link.');
  }
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000 });
  return Buffer.from(res.data);
}

function friendlyError(status, data) {
  const detail = ((data && (data.detail || data.error)) || '').toLowerCase();
  if (status === 400) return "That link doesn't look like a valid video URL.";
  if (status === 401) return 'Could not authenticate with the download server.';
  if (status === 422) {
    if (detail.includes('private')) return "This video is private or was deleted.";
    return "Couldn't extract this video — it may be private, deleted, or age-restricted.";
  }
  if (status === 429) return 'Too many requests right now. Please wait and try again.';
  if (status === 502 || status === 503) return 'The source platform is not responding right now.';
  if (!status) return 'Could not reach the download server.';
  return (data && (data.detail || data.error)) || 'Could not fetch this video.';
}

module.exports = { detectPlatform, fetchVideoInfo, streamVideo };
