import { redis, send, spotify, spotifyConnected, syncPlays, trackInfo } from "./_lib.js";

const DAY = 864e5;

function rank(plays) {
  const byId = new Map();
  for (const p of plays) {
    const s = byId.get(p.id) || { ...p, plays: 0, last: 0 };
    s.plays++; s.last = Math.max(s.last, p.at);
    byId.set(p.id, s);
  }
  return [...byId.values()].sort((a, b) => b.plays - a.plays || b.last - a.last);
}

export default async function handler(req, res) {
  try {
    if (!(await spotifyConnected())) return send(res, 200, { connected: false }, "s-maxage=30");

    const last = Number(await redis("GET", "spotify:lastSync")) || 0;
    if (Date.now() - last > 10 * 60 * 1000) await syncPlays().catch(e => console.error(e));

    let nowPlaying = null;
    try {
      const cur = await spotify("/me/player/currently-playing");
      if (cur?.is_playing && cur.item?.type === "track") nowPlaying = trackInfo(cur.item);
    } catch (e) { console.error(e); }

    const now = Date.now();
    const raw = await redis("ZRANGEBYSCORE", "plays", now - 14 * DAY, "+inf");
    const plays = raw.map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
    const thisWeek = rank(plays.filter(p => p.at >= now - 7 * DAY));
    const lastWeek = rank(plays.filter(p => p.at < now - 7 * DAY));
    const before = new Map(lastWeek.map((s, i) => [s.id, i + 1]));
    const top = thisWeek.slice(0, 6).map((s, i) => ({
      title: s.title, artist: s.artist, url: s.url, image: s.image, plays: s.plays,
      move: before.has(s.id) ? before.get(s.id) - (i + 1) : "new"
    }));
    const recent = plays.length ? plays[plays.length - 1] : null;
    return send(res, 200, {
      connected: true,
      nowPlaying,
      lastPlayed: recent ? { title: recent.title, artist: recent.artist, url: recent.url, at: recent.at } : null,
      top,
      trackedSince: plays.length ? plays[0].at : null
    }, "s-maxage=30, stale-while-revalidate=120");
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: "Music is unavailable right now." });
  }
}
