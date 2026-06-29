/* assets/js/seo.js
   Dynamic SEO: updates <title>, <meta description>, OG, Twitter, canonical and
   structured-data based on current hash route and language.
   Search engines that execute JS see unique per-section metadata. */

export const BASE_URL = "https://shawon-lodh.github.io/worldcup26";

const SECTION_SEO = {
  matches: {
    en: {
      title: "World Cup 2026 — Live Scores, Fixtures & Match Schedule",
      description: "World Cup 2026 match fixtures, live scores, and full schedule. Track all 104 matches from group stage to the final. Real-time score updates for every FIFA World Cup 2026 game."
    },
    bn: {
      title: "বিশ্বকাপ ২০২৬ — লাইভ স্কোর, ফিক্সচার ও ম্যাচ সূচি",
      description: "বিশ্বকাপ ২০২৬ এর ফিক্সচার, লাইভ স্কোর ও পূর্ণাঙ্গ সময়সূচী। গ্রুপ পর্ব থেকে ফাইনাল পর্যন্ত ১০৪ ম্যাচ রিয়েল-টাইমে দেখুন।"
    }
  },
  teams: {
    en: {
      title: "World Cup 2026 Teams — All 48 National Teams & Squads",
      description: "Complete list of 48 teams competing in FIFA World Cup 2026. Browse by name, FIFA code, or group. View team flags, group assignments and match history."
    },
    bn: {
      title: "বিশ্বকাপ ২০২৬ দল — ৪৮ জাতীয় দলের তালিকা",
      description: "ফিফা বিশ্বকাপ ২০২৬-এ অংশগ্রহণকারী ৪৮ টি দলের সম্পূর্ণ তালিকা। নাম, ফিফা কোড বা গ্রুপ অনুযায়ী খুঁজুন।"
    }
  },
  groups: {
    en: {
      title: "World Cup 2026 Group Standings, Points Table & Rankings",
      description: "World Cup 2026 group standings and points table — all 12 groups A through L. Track positions, points, goal difference, wins, draws and losses. Live updated standings."
    },
    bn: {
      title: "বিশ্বকাপ ২০২৬ গ্রুপ স্ট্যান্ডিং ও পয়েন্ট টেবিল",
      description: "বিশ্বকাপ ২০২৬ এর ১২ গ্রুপের স্ট্যান্ডিং ও পয়েন্ট টেবিল। পজিশন, পয়েন্ট, গোল ডিফারেন্স — লাইভ আপডেট।"
    }
  },
  stadiums: {
    en: {
      title: "World Cup 2026 Stadiums — All 16 Venues Across USA, Canada & Mexico",
      description: "All 16 FIFA World Cup 2026 stadiums. View capacity, city, region and match counts for venues across the USA, Canada and Mexico."
    },
    bn: {
      title: "বিশ্বকাপ ২০২৬ স্টেডিয়াম — ১৬ ভেন্যু",
      description: "যুক্তরাষ্ট্র, কানাডা ও মেক্সিকোতে ছড়িয়ে থাকা ১৬ টি ফিফা বিশ্বকাপ স্টেডিয়াম। ধারণক্ষমতা, শহর ও অঞ্চলের তথ্য।"
    }
  }
};

const HOME_SEO = {
  en: {
    title: "World Cup 2026 — Live Scores, Fixtures, Groups & Standings",
    description: "FIFA World Cup 2026 live scores, fixtures, group standings, teams and stadiums. Real-time updates for all 48 teams and 104 matches across USA, Canada & Mexico. Track World Cup 2026 scores, table, schedule, results."
  },
  bn: {
    title: "বিশ্বকাপ ২০২৬ — লাইভ স্কোর, ফিক্সচার, গ্রুপ স্ট্যান্ডিং",
    description: "ফিফা বিশ্বকাপ ২০২৬ — লাইভ স্কোর, ফিক্সচার ও গ্রুপ স্ট্যান্ডিং। ৪৮ দল, ১২ গ্রুপ, ১০৪ ম্যাচ যুক্তরাষ্ট্র, কানাডা ও মেক্সিকো জুড়ে। রিয়েল-টাইম আপডেট।"
  }
};

const ROUTES = ["matches", "bracket", "teams", "groups", "stadiums", "scorers"];

function getCurrentSection() {
  const hash = (window.location.hash || "").replace("#", "").split("?")[0];
  return ROUTES.includes(hash) ? hash : "home";
}

function setMetaTag(name, content, attrName = "name") {
  if (!content) return;
  let el = document.querySelector(`meta[${attrName}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrName, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(section) {
  let href = BASE_URL + "/";
  if (section !== "home") href = BASE_URL + "/#" + section;
  const el = document.querySelector("link[rel='canonical']");
  if (el) el.setAttribute("href", href);
}

export function updateSeo(lang) {
  const section = getCurrentSection();
  const seo = section === "home" ? HOME_SEO : SECTION_SEO[section];
  if (!seo) return;
  const s = seo[lang] || seo.en;

  document.title = s.title;
  setMetaTag("description", s.description);
  setMetaTag("og:title", s.title, "property");
  setMetaTag("og:description", s.description, "property");
  setMetaTag("twitter:title", s.title);
  setMetaTag("twitter:description", s.description);
  setCanonical(section);
}

export function watchHashSeo(lang) {
  updateSeo(lang);
  window.addEventListener("hashchange", () => updateSeo(lang));
}
