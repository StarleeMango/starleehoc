import { redis, send, readBody, overLimit } from "./_lib.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return send(res, 200, { total: Number(await redis("GET", "cheers")) || 0 }, "s-maxage=10, stale-while-revalidate=60");
    }
    if (req.method === "POST") {
      const count = Math.max(1, Math.min(20, Math.floor(Number(readBody(req).count) || 1)));
      if (await overLimit(req, "cheers", 300, 3600, count)) {
        return send(res, 429, { total: Number(await redis("GET", "cheers")) || 0 });
      }
      return send(res, 200, { total: await redis("INCRBY", "cheers", count) });
    }
    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: "Cheers are unavailable right now." });
  }
}
