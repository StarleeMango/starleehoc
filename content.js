/*
  Everything on the page that Starlee updates by hand lives here.
  Claude updates this file each week from the Monday health report and new field notes.
  Stats run 0-100 and are scored against his own usual week.
*/
window.SITE = {
  notice: "Stats are from his week of Nov 9. Field notes and level are examples for now.",

  links: [
    { label: "Instagram", url: "https://www.instagram.com/starlee_hoc/" },
    { label: "Substack", url: "https://substack.com/@starleemango" },
    { label: "LinkedIn", url: "https://linkedin.com/in/starlee-hoc" },
    { label: "Spotify", url: "" } // paste the Spotify profile link here
  ],

  week: { label: "Week of Nov 9", sleepHours: 6.5 }, // under 7 hours of sleep makes the bird DROWSY

  /*
    How each stat is scored (0-100). 70 means a usual week for him.
    Baseline = his 13-week averages (Aug 17 - Nov 15, 2026): RHR 57.7 bpm, HRV 70.7 ms,
    403 exercise min/week, 9,597 steps/day.
    HP     = average of: sleep (70 + 20 per hour above 7 h), RHR (70 + 4 per bpm below baseline),
             HRV (70 + 1 per % above baseline)
    ATK    = lifting sessions / 3 per week
    DEF    = average of: VO2 max as % of his best (47.9), exercise minutes (70 + 1 per % above baseline)
    SPEED  = 70 + 1 per % of steps above baseline
    SP. ATK / SP. DEF = not tracked yet (value: null shows "??")
    delta = change from the week before (Nov 2 - 8).
  */
  stats: [
    { key: "HP", label: "Recovery", value: 73, delta: 0, avg: "6 h 29 m sleep a night, 52 bpm resting heart rate, 69 ms HRV", note: "Resting heart rate was his best in months, but short weekend nights pulled sleep down. Sleep, resting heart rate and HRV count as one stat." },
    { key: "ATK", label: "Strength", value: 33, delta: -34, avg: "1 tracked lifting session", note: "Lifting sessions out of a target of 3 a week. Only workouts saved to his watch count." },
    { key: "DEF", label: "Endurance", value: 90, delta: 16, avg: "45.5 VO2 max, 459 exercise minutes", note: "VO2 max is back up to 95% of his best, and exercise time beat his usual week." },
    { key: "SP. ATK", label: "Creating", value: null, delta: null, avg: "Not tracked yet", note: "Will count things he made or wrote once his well-being tracking is set up." },
    { key: "SP. DEF", label: "Connection", value: null, delta: null, avg: "Not tracked yet", note: "Will count time with people and time outdoors once his well-being tracking is set up." },
    { key: "SPEED", label: "Movement", value: 67, delta: 17, avg: "9,336 steps a day, 12.5 miles biked", note: "Steps compared with his usual week, including a 20,558-step Saturday. Bike commute shown for context." }
  ],

  log: [
    { title: "Chicken stock, batch 12", tag: "Cooked", date: "Nov 1", xp: 40, text: "Example post. Longer simmer this time and a much better result." },
    { title: "Dinner with friends", tag: "Hangout", date: "Oct 30", xp: 30, text: "Example post. A short note about who came and what happened." },
    { title: "Saturday hike", tag: "Outside", date: "Oct 25", xp: 50, text: "Example post. Eight miles and one good view." }
  ],

  totalXp: 1270 // level = floor(totalXp / 100) + 1
};
