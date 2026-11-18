import { redis, exchangeCode, syncPlays } from "../_lib.js";

function page(res, status, title, text) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<body style="font:18px/1.5 system-ui,sans-serif;background:#1d2038;color:#dfe2f5;padding:32px 16px;max-width:560px;margin:auto">
<h1 style="font-size:24px">${title}</h1><p>${text}</p><p><a style="color:#f7c548" href="/">Back to the site</a></p></body>`);
}

export default async function handler(req, res) {
  const { code, state, error } = req.query;
  if (error) return page(res, 400, "Spotify was not connected", "Spotify said: " + String(error).replace(/[<>&"]/g, ""));
  if (!code || !state || !(await redis("GETDEL", "spotify:state:" + String(state)))) {
    return page(res, 400, "Spotify was not connected", "This sign-in link expired. Start again from the admin page.");
  }
  try {
    await exchangeCode(req, String(code));
    const saved = await syncPlays().catch(() => 0);
    return page(res, 200, "Spotify connected", `Saved your last ${saved} plays. Your top songs will fill in as you listen.`);
  } catch (e) {
    console.error(e);
    return page(res, 500, "Spotify was not connected", "Check that the Client ID, Client Secret and redirect address match the Spotify dashboard.");
  }
}
