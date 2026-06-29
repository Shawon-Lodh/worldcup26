/* assets/js/site.config.js
   Central place for site identity / tracking IDs. Fill these in once and the
   rest of the app (SEO tags, sitemap, structured data, GA4) references them.

   Filling in is optional — empty values simply skip the corresponding feature.
   Don't commit real secrets here publicly; GA4 Measurement IDs and Search
   Console tokens are *public* and safe to commit. */

export const SITE = {
  // Final public URL of the deployed site, WITH https and NO trailing slash.
  url: "https://shawon-lodh.github.io/worldcup26",

  name: "FIFA World Cup 2026 — Live Scores & Fixtures",
  shortName: "World Cup 2026",
  description:
    "FIFA World Cup 2026 — live scores, fixtures, group standings, teams & stadiums. Real-time updates across USA, Canada & Mexico.",
  defaultLang: "en",
  supportedLangs: ["en", "bn"],

  // Social share image (absolute URL recommended). 1200x630 PNG.
  ogImage: "https://shawon-lodh.github.io/worldcup26/assets/og.png",

  // ── Google Analytics 4 ─────────────────────────────────
  // GA4 Measurement ID looks like "G-ABC123XYZ". Create at
  // https://analytics.google.com → Admin → Create property → Web.
  // Empty = analytics disabled. Full setup: see SEO.md.
  ga4MeasurementId: "",

  // ── Search Console verification token (HTML-tag method) ─
  // Paste only the content value (e.g. "AbCd123…"). Also set the meta tag in
  // index.html directly with the same value. Empty = not verified yet.
  googleVerification: "fX9WxSy3emi-8nf_U-zmf0Hlfic_TPFxzqS1rGSYq4E",

  // Twitter handle (e.g. "@yourname") — optional, improves Twitter cards.
  twitterHandle: "",
};

export function isLive() {
  return Boolean(SITE.url);
}