import crypto from "node:crypto";
import { redis, send, isAdmin, authorizeUrl } from "../_lib.js";

/* Admin only: returns the Spotify sign-in link used to connect the account once. */
export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  if (!isAdmin(req)) return send(res, 401, { error: "The admin key is missing or wrong." });
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return send(res, 500, { error: "Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in Vercel first." });
  }
  const state = crypto.randomBytes(16).toString("hex");
  await redis("SET", "spotify:state:" + state, "1", "EX", 600);
  return send(res, 200, { url: authorizeUrl(req, state) });
}
