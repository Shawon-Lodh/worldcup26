# SEO & Analytics — setup guide for FIFA World Cup 2026 site

Goal: rank #1 on Google for "World Cup 2026", "World Cup 2026 live scores",
"World Cup groups" etc., and see every visitor's behaviour in Google Analytics.

The repository already contains all the *on-page* SEO work: meta tags,
Open Graph, Twitter cards, structured data (JSON-LD), `hreflang` for
Bangla/English, sitemap.xml, robots.txt, PWA manifest, 404 page, fast render,
and lazy-loaded GA4. What remains is a small set of one-time, free Google
account steps plus pasting a few IDs into `assets/js/site.config.js`.

---

## 0. Find & replace the placeholder URL

Everything uses a placeholder host:

```
https://shawon-lodh.github.io/worldcup26/
```

If your real address differs, do a project-wide find & replace. The places
the URL lives:

| File | Purpose |
| --- | --- |
| `index.html` | canonical, OG, Twitter, hreflang, `og:image`, JSON-LD |
| `sitemap.xml` | every `<loc>` and hreflang link |
| `robots.txt` | `Sitemap:` line |
| `404.html` | "Back to" link |
| `assets/js/site.config.js` | `SITE.url` |
| `README.md` | documentation |

---

## 1. GitHub Pages (publish)

1. Push the repo to GitHub.
2. Repo → **Settings → Pages** → Source **GitHub Actions**.
3. Push to `main` → the workflow in `.github/workflows/deploy.yml`
   publishes automatically at `https://<yourname>.github.io/worldcup26/`.
4. (Optional but better for SEO) Custom domain: **Settings → Pages → Custom
   domain**. Point an `A`/`CNAME` record at your registrar, then tick
   *Enforce HTTPS*. A custom domain lifts click-through rate and trust.

---

## 2. Google Analytics 4 — what the user should do

We use Google Analytics 4 (the current standard). The script is already in
`assets/js/analytics.js`, lazy-loaded after `window.load` so it never
slows the page.

### Create the GA4 property (≈3 minutes)
1. Open <https://analytics.google.com> with your Google account.
2. **Admin → Create account** (if your team doesn't have one) →
   **Create property**.
3. Property name: `World Cup 2026`. Time zone, currency → save.
4. Business details → answers don't matter much → save.
5. **Web** platform → enter the deployed site URL (e.g.
   `https://shawon-lodh.github.io/worldcup26/`) → create stream.
6. Copy the **Measurement ID**, looks like `G-ABC123XYZ`.

### Paste it in
Open `assets/js/site.config.js` and set:

```js
ga4MeasurementId: "G-ABC123XYZ",
```

That's it — the script in `analytics.js` only loads if this ID is set.

### What you'll see inside GA4 (this is exactly the kind of insight you
asked for — "which users, which sections, where they come from"):

- **Realtime** — current live visitors, what they're doing right now.
- **Reports → Acquisition** — *where each visitor came from*: Google
  organic search, direct, social sites (Twitter, Facebook), referral.
- **Reports → Engagement → Pages and screens** — which sections are viewed
  most (`/`, `#matches`, `#groups` … — sent via the `section_view` event).
- **Reports → Engagement → Events** — names + counts for custom events we
  track for you:
  | Event | What it tells you |
  | --- | --- |
  | `page_view` | total views |
  | `language_change` | how many switched EN ⇄ BN, and which way |
  | `section_view` | which part of the page people scroll to |
  | `match_open` | which match detail modal people open (id+stage+status) |
  | `filter_change` | which stage/status filter people choose |
  | `team_search` | how often people search, and roughly how long the queries are |
  | `theme_change` | light vs dark theme usage |
  | `share_match` | which matches people share (id) |
- **Reports → Demographics → Demographic details** — country, city,
  device, browser (after enough traffic and Google signals opt-in).
- **Reports → Tech → Tech details** — device & browser breakdown.
- **Reports → Monetisation / Conversions** — only if you set up conversions.
  Suggestion: mark `language_change` and `match_open` as conversions so GA
  surfaces "engaged users" out of the box. Admin → Events → set
  `language_change` and `match_open` mark-as-conversion toggles.
- **Explorations** — funnel and path exploration. Useful e.g. "people who
  searched a team → opened a match modal".
- **Admin → Property settings → Data retention** → set to 14 months for the
  richest history.

### GDPR note (important if you reach EU/UK visitors)
The script ships with `anonymize_ip: true` already. If you expect non-trivial
EU traffic, add a cookie/consent banner before sending page views and call
`gtag('consent','update',…)`. The minimal upgrade path:

```js
// before initAnalytics():
gtag('consent', 'default', { analytics_storage: 'denied',
                             wait_for_update: 500 });
// after a user accepts your banner:
gtag('consent', 'update',  { analytics_storage: 'granted' });
```

---

## 3. Google Search Console — owns the Google ranking story

GA tells you "what users did once they arrived". Search Console tells you
"how you appear in Google, which queries sent clicks, your average
position, and crawl errors". You definitely want both.

### Verify ownership
1. Open <https://search.google.com/search-console>.
2. **Add property** → **URL prefix** → paste your full deployed URL
   (`https://shawon-lodh.github.io/worldcup26/`).
3. Pick the **HTML tag** verification method (easiest for Pages).
4. Google shows you a meta tag like:

   ```html
   <meta name="google-site-verification" content="AbCdEf123…" />
   ```
5. Paste the content value into the existing placeholder in `index.html`:

   ```html
   <meta name="google-site-verification" content="AbCdEf123…" />
   ```

   And/or into `assets/js/site.config.js`:
   ```js
   googleVerification: "AbCdEf123…",
   ```
6. Push, wait for deploy, then **Verify** in Search Console.
7. Do the same for the bare domain if you set up a custom domain.

### Submit the sitemap
- Search Console → **Sitemaps** → enter `sitemap.xml` → **Submit**.
- Status should turn "Success" within a day.

### What you'll see inside Search Console
- **Performance** — the queries people typed that surfaced your site,
  impressions, clicks, CTR, and average position. This is the report that
  tells you "I rank #1 for `World Cup 2026 live score`".
- **Coverage / Pages** — which of your pages Google indexed, and any errors.
- **Core Web Vitals** — your speed/UX signals (we already preconnect
  everything + lazy-render, so expect "good").
- **Sitemaps, Removals, International targeting** — set the
  "International targeting" country if you want a specific audience.

---

## 4. Things that also push you up (off-page)

- **Speed**: page is already tiny and static. Core Web Vitals will be
  green; no action needed.
- **Backlinks**: get one or two reputable sites (a football forum post,
  a Reddit thread, a friend's blog) to link to your URL with anchor
  text like "World Cup 2026 live scores". This is the single most
  impactful ranking lever outside Google Ads.
- **Internal linking**: anchor links in the nav already help Google
  treat each `#section` as a destination.
- **Refresh frequency**: the data re-polls every 15–60s, and the
  `sitemap.xml` marks `#matches` as `hourly`. Google interprets high
  freshness on score pages as "ping me often".
- **Social profiles**: post the OG-share URL on Twitter/WhatsApp-group
  pinned posts — the large image preview drives clicks (and Google
  increasingly weighs social signals).

---

## 5. The one-line checklist (TL;DR)

1. Deploy to GitHub Pages → get final URL.
2. Find & replace the placeholder host with your real URL (everywhere
   above).
3. Create GA4 property → paste Measurement ID in `site.config.js`.
4. Verify Search Console via the meta tag → paste token in
   `index.html`.
5. Submit `sitemap.xml` in Search Console.
6. Get 1–2 backlinks + share OG link socially.

That covers everything from "search → click → arrive → explore → switch
language → open a match modal" measurable end-to-end.