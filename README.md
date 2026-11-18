# starleehoc.com

Starlee's personal site: a pixel bird whose stats follow his week, field notes, public notes and cheers, and his top Spotify songs.

## Files
- `index.html` – the home page
- `content.js` – stats, field notes, level and links. Edit this to update the page.
- `admin.html` – private page for connecting Spotify and removing notes (starleehoc.com/admin.html)
- `api/` – server routes for notes, cheers and Spotify
- `vercel.json` – a once-a-day job that saves recent Spotify plays

## Settings to add in Vercel (Project → Settings → Environment Variables)
| Name | Value |
|---|---|
| SPOTIFY_CLIENT_ID | From the Spotify developer dashboard |
| SPOTIFY_CLIENT_SECRET | From the Spotify developer dashboard. Never share it. |
| ADMIN_TOKEN | A long password you make up. Used on the admin page. |
| CRON_SECRET | Another long password you make up. Vercel uses it for the daily job. |
| KV_REST_API_URL, KV_REST_API_TOKEN | Added automatically when you connect an Upstash Redis database in Vercel's Storage tab |

Redeploy after adding or changing settings.

## Spotify redirect address
`https://starleehoc.com/api/spotify/callback`

## How songs are counted
Spotify only returns your last 50 plays. The site saves them whenever someone visits (at most every 10 minutes) and once a day. The top 6 counts saved plays from the past 7 days, and the arrows compare against the 7 days before that.
