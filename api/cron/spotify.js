import { send, isCron, syncPlays } from "../_lib.js";

/* Runs on Vercel's schedule. Vercel sends CRON_SECRET in the Authorization header. */
export default async function handler(req, res) {
  if (!isCron(req)) return send(res, 401, { error: "Unauthorized" });
  try {
    return send(res, 200, { saved: await syncPlays() });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: String(e.message || e) });
  }
}
