/* Shared helpers for the API routes. Files that start with "_" are not routes on Vercel. */
import crypto from "node:crypto";

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

/* One Redis command over the Upstash REST API, e.g. redis("INCR", "cheers"). */
export async function redis(...cmd) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error("Database is not connected");
  const r = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd)
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

export function send(res, status, body, cache = "no-store") {
  res.setHeader("Cache-Control", cache);
  res.status(status).json(body);
}

export function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body;
}

function sameSecret(given, expected) {
  if (!expected || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function isAdmin(req) {
  const h = req.headers.authorization || "";
  return sameSecret(h.replace(/^Bearer /, ""), process.env.ADMIN_TOKEN);
}
export function isCron(req) {
  const h = req.headers.authorization || "";
  return sameSecret(h.replace(/^Bearer /, ""), process.env.CRON_SECRET);
}

/* Visitors are counted by a hash of their IP address, so raw addresses are never stored. */
function visitor(req) {
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  return crypto.createHash("sha256").update(ip + (process.env.ADMIN_TOKEN || "")).digest("hex").slice(0, 16);
}
/* Returns true when this visitor has used up `max` units in the current window. */
export async function overLimit(req, bucket, max, seconds, units = 1) {
  const key = `rl:${bucket}:${visitor(req)}`;
  const used = await redis("INCRBY", key, units);
  if (used === units) await redis("EXPIRE", key, seconds);
  return used > max;
}

export function clean(value, max) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim().slice(0, max);
}

/* Word and link filter. It catches common swears, sexual terms, slurs and links, including simple swaps like "sh1t". */
const STEMS = ["fuck", "shit", "bitch", "cunt", "nigg", "fagg"];
const WORDS = ["ass", "asshole", "bastard", "dick", "cock", "pussy", "slut", "whore", "porn", "porno", "nude", "nudes", "penis", "vagina", "boob", "tit", "blowjob", "horny", "rape", "retard", "kys", "fag", "dyke", "tranny", "chink", "spic", "kike", "gook"];
const stretch = w => w.split("").map(c => c + "+").join("");
const BLOCK = new RegExp("\\b(?:" + [...STEMS.map(w => stretch(w) + "\\w*"), ...WORDS.map(w => stretch(w) + "(?:e?s)?")].join("|") + ")\\b");
const SWAPS = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", "@": "a", $: "s", "!": "i" };
export function isBlocked(text) {
  const plain = String(text).toLowerCase().replace(/[01345@$!]/g, c => SWAPS[c]);
  return BLOCK.test(plain) || /https?:|www\.|\.(com|net|org|io|xyz|ru)\b/.test(plain);
}

/* ---------- Spotify ---------- */
const SCOPES = "user-read-recently-played user-top-read user-read-currently-playing";
export function redirectUri(req) {
  return process.env.SPOTIFY_REDIRECT_URI || `https://${req.headers.host}/api/spotify/callback`;
}
export function authorizeUrl(req, state) {
  const p = new URLSearchParams({
    response_type: "code", client_id: (process.env.SPOTIFY_CLIENT_ID || "").trim(),
    scope: SCOPES, redirect_uri: redirectUri(req), state
  });
  return "https://accounts.spotify.com/authorize?" + p;
}
async function tokenRequest(params) {
  const id = (process.env.SPOTIFY_CLIENT_ID || "").trim();
  const secret = (process.env.SPOTIFY_CLIENT_SECRET || "").trim();
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params)
  });
  const j = await r.json();
  if (!r.ok) throw new Error("Spotify token error: " + (j.error_description || j.error || r.status));
  return j;
}
async function saveTokens(j) {
  if (j.refresh_token) await redis("SET", "spotify:refresh", j.refresh_token);
  await redis("SET", "spotify:access", j.access_token, "EX", Math.max(60, (j.expires_in || 3600) - 120));
}
export async function exchangeCode(req, code) {
  await saveTokens(await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri(req) }));
}
export async function spotifyConnected() {
  return !!(await redis("GET", "spotify:refresh"));
}
async function accessToken(force = false) {
  if (!force) {
    const cached = await redis("GET", "spotify:access");
    if (cached) return cached;
  }
  const refresh = await redis("GET", "spotify:refresh");
  if (!refresh) return null;
  const j = await tokenRequest({ grant_type: "refresh_token", refresh_token: refresh });
  await saveTokens(j);
  return j.access_token;
}
/* GET from the Spotify Web API. Returns null for "nothing to show" (204). */
export async function spotify(path, retry = true) {
  const token = await accessToken(!retry);
  if (!token) return null;
  const r = await fetch("https://api.spotify.com/v1" + path, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401 && retry) return spotify(path, false);
  if (r.status === 204) return null;
  if (!r.ok) throw new Error(`Spotify ${path} returned ${r.status}`);
  return r.json();
}
export function trackInfo(t) {
  const imgs = t.album?.images || [];
  const img = imgs.slice().sort((a, b) => (a.width || 0) - (b.width || 0)).find(i => (i.width || 0) >= 60) || imgs[imgs.length - 1];
  return {
    id: t.id,
    title: t.name,
    artist: (t.artists || []).map(a => a.name).join(", "),
    url: t.external_urls?.spotify || "",
    image: img?.url || ""
  };
}

/* Saves the last 50 plays. Spotify only keeps 50, so this runs on page visits (at most every 10 minutes) and on a daily schedule. */
export async function syncPlays() {
  const j = await spotify("/me/player/recently-played?limit=50");
  if (!j) return 0;
  const args = [];
  for (const item of j.items || []) {
    if (!item.track?.id) continue;
    const t = trackInfo(item.track);
    const at = Date.parse(item.played_at);
    args.push(at, JSON.stringify({ at, id: t.id, title: t.title, artist: t.artist, url: t.url, image: t.image }));
  }
  if (args.length) await redis("ZADD", "plays", ...args);
  await redis("ZREMRANGEBYSCORE", "plays", "-inf", Date.now() - 35 * 864e5);
  await redis("SET", "spotify:lastSync", Date.now());
  return args.length / 2;
}
