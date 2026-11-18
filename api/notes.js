import crypto from "node:crypto";
import { redis, send, readBody, isAdmin, overLimit, clean, isBlocked } from "./_lib.js";

const parse = raw => { try { return JSON.parse(raw); } catch { return null; } };

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const raw = await redis("LRANGE", "notes", 0, 49);
      return send(res, 200, { notes: raw.map(parse).filter(Boolean) }, "s-maxage=10, stale-while-revalidate=60");
    }
    if (req.method === "POST") {
      const body = readBody(req);
      if (body.website) return send(res, 201, { ok: true }); // hidden field that only bots fill in
      const name = clean(body.name, 40);
      const text = clean(body.text, 280);
      if (!text) return send(res, 400, { error: "Write a note first." });
      if (isBlocked(name + " " + text)) return send(res, 400, { error: "This note can't be posted. Please keep it friendly and leave out links." });
      if (await overLimit(req, "notes", 3, 600)) return send(res, 429, { error: "You've posted a few notes already. Try again in a few minutes." });
      const note = { id: crypto.randomUUID(), name, text, at: new Date().toISOString() };
      await redis("LPUSH", "notes", JSON.stringify(note));
      await redis("LTRIM", "notes", 0, 199);
      return send(res, 201, { note });
    }
    if (req.method === "DELETE") {
      if (!isAdmin(req)) return send(res, 401, { error: "The admin key is missing or wrong." });
      const id = clean(req.query.id, 64);
      const raw = await redis("LRANGE", "notes", 0, 199);
      const match = raw.find(r => parse(r)?.id === id);
      if (!match) return send(res, 404, { error: "That note was not found." });
      await redis("LREM", "notes", 1, match);
      return send(res, 200, { ok: true });
    }
    res.setHeader("Allow", "GET, POST, DELETE");
    return send(res, 405, { error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: "Notes are unavailable right now." });
  }
}
