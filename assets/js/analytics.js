/* assets/js/analytics.js
   Lazy Google Analytics 4 (gtag) loader. Only loads when a Measurement ID is
   present in site.config.js. Loads the script with a low priority, after
   window 'load', so it never blocks first paint or the match data fetch.

   Custom events sent (all visible in GA4 real-time & standard reports):
   - page_view            (auto by gtag on init)
   - language_change      { from, to }
   - match_open           { id, stage, status }
   - filter_change        { key, value }
   - team_search          { query_length }
   - section_view         { id }  (on scroll into view of #matches etc.)
*/

import { SITE } from "./site.config.js";

let gtagFn = null;
let ready = false;

export function initAnalytics() {
  const id = SITE.ga4MeasurementId?.trim();
  if (!id || id === "") return false;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtagFn = gtag;
  gtag("js", new Date());
  gtag("config", id, {
    anonymize_ip: true,
    send_page_view: true,
  });

  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
  document.head.appendChild(s);
  ready = true;

  // consent-light: default analytics allowed. Replace with a CMP banner if you
  // serve users in EU/UK (GDPR) — see SEO.md for quick upgrade path.
  return true;
}

export function track(event, params = {}) {
  if (!ready || !gtagFn) return;
  gtagFn("event", event, params);
}

export function setLanguageAnalytics(from, to) {
  track("language_change", { from, to });
}

/* Wait for window load so GA script never competes with initial render. */
export function bootAnalyticsOnLoad() {
  window.addEventListener("load", () => initAnalytics(), { once: true });
}