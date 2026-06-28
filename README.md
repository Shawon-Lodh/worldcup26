# FIFA World Cup 2026 — Live Scores & Fixtures

A fast, responsive, single-page site for the FIFA World Cup 2026 — live match scores,
fixtures, group standings, teams and stadiums. Bangla & English UI, real-time polling.

Live data is pulled from the free public API at [worldcup26.ir](https://worldcup26.ir)
(endpoints under `/get/*` need no API key).

## Features
- Live match scores with automatic polling (15s while a match is live, 60s otherwise)
- All 104 fixtures with stage + status filters (All / Group / R32 / R16 / QF / SF / 3rd / Final)
- Group standings for all 12 groups (live updated), top-2 highlighted
- 48 teams with search
- 16 stadiums with capacity and hosted-match counts
- Countdown to opening match / final
- Bangla & English UI toggle (digit localization, persisted via localStorage)
- Match detail modal with scorers
- Fully responsive, mobile-first, no build step — pure HTML/CSS/ES modules
- GitHub Pages deploy workflow included

## Run locally
Because the site uses ES modules, serve over HTTP (not `file://`):

```sh
bun install -g serve      # or: npx serve .
serve .                   # then open the printed URL
```

## Deploy to GitHub Pages
1. Push this repo to GitHub.
2. Repo Settings → Pages → Source: **GitHub Actions**.
3. Push to `main` — the included workflow (`.github/workflows/deploy.yml`) publishes automatically.

## Project layout
```
index.html
assets/
  css/styles.css
  js/
    api.js         # fetch + cache + live-poll helpers
    i18n.js        # Bangla + English strings, digit conversion, dates
    render.js      # render functions (matches/teams/groups/stadiums/modal/banner)
    main.js        # boot, state, filter/search wiring, polling, countdown
.github/workflows/deploy.yml
```

## API endpoints used
| Endpoint | Returns |
| --- | --- |
| `https://worldcup26.ir/get/games` | 104 matches with scores & scorers |
| `https://worldcup26.ir/get/teams` | 48 teams with flags & codes |
| `https://worldcup26.ir/get/stadiums` | 16 host stadiums |
| `https://worldcup26.ir/get/groups` | 12 group standings tables |

> The API ships `name_en` + `name_fa` (Persian). No Bangla source exists, so team/stadium names use English in both UI locales; the UI chrome, dates and numbers are localized to Bangla when the user switches language.

## License
Data © [worldcup26.ir](https://github.com/rezarahiminia/worldcup2026) (ISC). Frontend code: MIT.