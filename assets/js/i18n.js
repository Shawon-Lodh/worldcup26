/* assets/js/i18n.js
   Bangla + English UI strings, Bangla digit conversion, date utilities,
   and a Bangla team-name map (API ships only name_en + name_fa). */

/* Bangla team names keyed by FIFA code. Falls back to English if a code
   is missing. Extend freely — none of these come from the API. */
export const TEAM_NAMES_BN = {
  MEX: "মেক্সিকো", RSA: "দক্ষিণ আফ্রিকা", KOR: "দক্ষিণ কোরিয়া",
  CZE: "চেক প্রজাতন্ত্র", CAN: "কানাডা", BIH: "বসনিয়া ও হার্জেগোভিনা",
  QAT: "কাতার", SUI: "সুইজারল্যান্ড", BRA: "ব্রাজিল", MAR: "মরক্কো",
  HAI: "হাইতি", SCO: "স্কটল্যান্ড", USA: "যুক্তরাষ্ট্র", PAR: "প্যারাগুয়ে",
  AUS: "অস্ট্রেলিয়া", TUR: "তুরস্ক", GER: "জার্মানি", CUW: "কুরাসাও",
  CIV: "আইভরি কোস্ট", ECU: "ইকুয়েডর", NED: "নেদারল্যান্ডস", JPN: "জাপান",
  SWE: "সুইডেন", TUN: "তিউনিসিয়া", BEL: "বেলজিয়াম", EGY: "মিশর",
  IRN: "ইরান", NZL: "নিউজিল্যান্ড", ESP: "স্পেন", CPV: "কেপ ভার্দে",
  KSA: "সৌদি আরব", URU: "উরুগুয়ে", FRA: "ফ্রান্স", SEN: "সেনেগাল",
  IRQ: "ইরাক", NOR: "নরওয়ে", ARG: "আর্জেন্টিনা", ALG: "আলজেরিয়া",
  AUT: "অস্ট্রিয়া", JOR: "জর্ডান", POR: "পর্তুগাল",
  COD: "কঙ্গো গণতান্ত্রিক প্রজাতন্ত্র", UZB: "উজবেকিস্তান",
  COL: "কলম্বিয়া", ENG: "ইংল্যান্ড", CRO: "ক্রোয়েশিয়া", GHA: "ঘানা",
  PAN: "পানামা",
};

/* Bangla stadium names keyed by id (matches API stadium id). */
export const STADIUM_NAMES_BN = {
  "1": "এস্তাদিও আজতেকা", "2": "এস্তাদিও আকরোন", "3": "এস্তাদিও বিবিভিএ",
  "4": "এটি অ্যান্ড টি স্টেডিয়াম", "5": "এনআরজি স্টেডিয়াম", "6": "এস্তাদিও বিবিভিএ",
  "7": "লিংকন ফাইন্যান্সিয়াল ফিল্ড", "8": "লেভি স্টেডিয়াম", "9": "লুমেন ফিল্ড",
  "10": "গিলেট স্টেডিয়াম", "11": "মেটলাইফ স্টেডিয়াম", "12": "মার্সিডিজ-বেঞ্জ স্টেডিয়াম",
  "13": "বিমো ফিল্ড", "14": "বিসি প্লেস", "15": "হার্ড রক স্টেডিয়াম",
  "16": "অ্যারোহেড স্টেডিয়াম",
};

export const STRINGS = {
  en: {
    brand: "World Cup 2026",
    nav_matches: "Matches",
    nav_teams: "Teams",
    nav_groups: "Groups",
    nav_stadiums: "Stadiums",
    hero_dates: "11 June – 19 July 2026",
    hero_title: "FIFA World Cup 2026",
    hero_subtitle: "48 teams · 12 groups · 104 matches across USA, Canada & Mexico",
    cd_days: "Days", cd_hours: "Hours", cd_mins: "Minutes", cd_secs: "Seconds",
    cd_target_final: "Countdown to the Final · 19 July 2026",
    cd_target_open: "Countdown to the Opening Match · 11 June 2026",
    cd_started: "The tournament is live now!",
    stat_teams: "Teams", stat_groups: "Groups", stat_matches: "Matches", stat_stadiums: "Stadiums",
    live: "LIVE",
    matches_title: "Matches",
    matches_sub: "Fixtures & live scores",
    stage_all: "All", stage_group: "Group", stage_r32: "Round of 32", stage_r16: "Round of 16",
    stage_qf: "Quarterfinals", stage_sf: "Semifinals", stage_third: "3rd Place", stage_final: "Final",
    status_all: "All", status_live: "Live", status_upcoming: "Upcoming", status_finished: "Finished",
    teams_title: "Teams", teams_sub: "48 national teams",
    search_teams: "Search teams…",
    groups_title: "Group Standings", groups_sub: "12 groups · live updated",
    stadiums_title: "Stadiums", stadiums_sub: "16 venues · USA, Mexico & Canada",
    loading: "Loading…",
    error_load: "Couldn't load data. Please try again.",
    no_matches: "No matches for this filter.",
    live_matches_now: "Live right now:",
    footer_note: "Real-time data from public API.",
    footer_rights: "All rights reserved",
    tbl_pos: "#", tbl_team: "Team", tbl_mp: "MP", tbl_w: "W", tbl_d: "D", tbl_l: "L",
    tbl_gf: "GF", tbl_ga: "GA", tbl_gd: "GD", tbl_pts: "PTS",
    status_live_short: "LIVE",
    status_ft: "FT",
    status_upcoming_lbl: "Upcoming",
    tbd: "TBD",
    capacity: "Capacity",
    stadium_matches: "matches hosted",
    group_name: "Group",
    stage_lbl: "Stage",
    kickoff: "Kick-off",
    stadium_lbl: "Stadium",
    scorers: "Scorers",
    no_scorers: "No scorers recorded yet.",
    ref_lang_btn: "বাংলা",
    theme_toggle: "Toggle theme",
    theme_light: "Light",
    theme_dark: "Dark",
    retry: "Retry",
    share: "Share",
    share_match_title: "World Cup 2026 — Match",
    share_copied: "Link copied!",
    share_unsupported: "Sharing not supported on this device.",
    language_label: "Language",
    weekday_short: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
    month_short: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  },
  bn: {
    brand: "বিশ্বকাপ ২০২৬",
    nav_matches: "ম্যাচ",
    nav_teams: "দল",
    nav_groups: "গ্রুপ",
    nav_stadiums: "স্টেডিয়াম",
    hero_dates: "১১ জুন – ১৯ জুলাই ২০২৬",
    hero_title: "ফিফা বিশ্বকাপ ২০২৬",
    hero_subtitle: "৪৮টি দল · ১২টি গ্রুপ · ১০৪টি ম্যাচ — যুক্তরাষ্ট্র, কানাডা ও মেক্সিকোতে",
    cd_days: "দিন", cd_hours: "ঘণ্টা", cd_mins: "মিনিট", cd_secs: "সেকেন্ড",
    cd_target_final: "ফাইনালের কাউন্টডাউন · ১৯ জুলাই ২০২৬",
    cd_target_open: "উদ্বোধনী ম্যাচের কাউন্টডাউন · ১১ জুন ২০২৬",
    cd_started: "টুর্নামেন্ট এখন চলছে!",
    stat_teams: "দল", stat_groups: "গ্রুপ", stat_matches: "ম্যাচ", stat_stadiums: "স্টেডিয়াম",
    live: "লাইভ",
    matches_title: "ম্যাচসমূহ",
    matches_sub: "ফিক্সচার ও লাইভ স্কোর",
    stage_all: "সব", stage_group: "গ্রুপ", stage_r32: "রাউন্ড অফ ৩২", stage_r16: "রাউন্ড অফ ১৬",
    stage_qf: "কোয়ার্টার ফাইনাল", stage_sf: "সেমি ফাইনাল", stage_third: "তৃতীয় স্থান", stage_final: "ফাইনাল",
    status_all: "সব", status_live: "লাইভ", status_upcoming: "আসছে", status_finished: "শেষ",
    teams_title: "দলসমূহ", teams_sub: "৪৮টি জাতীয় দল",
    search_teams: "দল খুঁজুন…",
    groups_title: "গ্রুপ পয়েন্ট তালিকা", groups_sub: "১২টি গ্রুপ · লাইভ আপডেট",
    stadiums_title: "স্টেডিয়াম", stadiums_sub: "১৬টি ভেন্যু · যুক্তরাষ্ট্র, মেক্সিকো ও কানাডা",
    loading: "লোড হচ্ছে…",
    error_load: "ডেটা লোড করা যায়নি। আবার চেষ্টা করুন।",
    no_matches: "এই ফিল্টারে কোনো ম্যাচ নেই।",
    live_matches_now: "এখন চলছে:",
    footer_note: "পাবলিক API থেকে রিয়েল-টাইম ডেটা।",
    footer_rights: "সর্বস্বত্ব সংরক্ষিত",
    tbl_pos: "#", tbl_team: "দল", tbl_mp: "খেলা", tbl_w: "জয়", tbl_d: "ড্র", tbl_l: "হার",
    tbl_gf: "গৎ", tbl_ga: "খাওয়া", tbl_gd: "পার্থক্য", tbl_pts: "পয়েন্ট",
    status_live_short: "লাইভ",
    status_ft: "সম্পূর্ণ",
    status_upcoming_lbl: "আসছে",
    tbd: "নির্ধারিত নয়",
    capacity: "ধারণক্ষমতা",
    stadium_matches: "ম্যাচ আয়োজন",
    group_name: "গ্রুপ",
    stage_lbl: "পর্ব",
    kickoff: "শুরু",
    stadium_lbl: "স্টেডিয়াম",
    scorers: "গোলদাতা",
    no_scorers: "এখনও কোনো গোলদাতা নেই।",
    ref_lang_btn: "English",
    theme_toggle: "থিম পরিবর্তন",
    theme_light: "লাইট",
    theme_dark: "ডার্ক",
    retry: "আবার চেষ্টা",
    share: "শেয়ার",
    share_match_title: "বিশ্বকাপ ২০২৬ — ম্যাচ",
    share_copied: "লিংক কপি হয়েছে!",
    share_unsupported: "এই ডিভাইসে শেয়ার সমর্থিত নয়।",
    language_label: "ভাষা",
    weekday_short: ["রবি","সোম","মঙ্গল","বুধ","বৃহঃ","শুক্র","শনি"],
    month_short: ["জানু","ফেব্রু","মার্চ","এপ্রি","মে","জুন","জুলাই","আগ","সেপ্ট","অক্টো","নভে","ডিসে"],
  }
};

const BN_DIGITS = ["০","১","২","৩","৪","৫","৬","৭","৮","৯"];
export function toBnDigits(s) {
  if (typeof s !== "string" && typeof s !== "number") return s;
  return String(s).replace(/[0-9]/g, d => BN_DIGITS[d]);
}

export function getT(lang) {
  const dict = STRINGS[lang] || STRINGS.en;
  return (key) => dict[key] ?? STRINGS.en[key] ?? key;
}

/* API returns local_date as "06/11/2026 13:00" (MM/DD/YYYY HH:mm).
   The caller passes a Date already converted from venue-local time to the
   selected viewer timezone. */
export function formatDateParts(js, lang, timeZoneLabel = "", timeZone = undefined) {
  if (!(js instanceof Date) || Number.isNaN(js.getTime())) return "";
  const parts = datePartsInTimeZone(js, timeZone);
  const mo = parts.month;
  const dy = parts.day;
  const yr = parts.year;
  const hh24 = Number(parts.hour);
  const hh = String(hh24 % 12 || 12).padStart(2, "0");
  const mm = parts.minute;
  const weekday = Number(parts.weekday);
  let txt;
  if (lang === "bn") {
    txt = `${STRINGS.bn.weekday_short[weekday]}, ${toBnDigits(parseInt(dy,10))} ${STRINGS.bn.month_short[parseInt(mo,10)-1]} ${toBnDigits(yr)}`;
  } else {
    txt = `${STRINGS.en.weekday_short[weekday]}, ${dy} ${STRINGS.en.month_short[parseInt(mo,10)-1]} ${yr}`;
  }
  const meridiem = hh24 < 12 ? "AM" : "PM";
  const time = lang === "bn" ? `${toBnDigits(hh)}:${toBnDigits(mm)} ${meridiem}` : `${hh}:${mm} ${meridiem}`;
  return `${txt} · ${time}${timeZoneLabel ? ` ${timeZoneLabel}` : ""}`;
}

function datePartsInTimeZone(date, timeZone) {
  const opts = {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  };
  const dtf = new Intl.DateTimeFormat("en-US", opts);
  const parts = Object.fromEntries(dtf.formatToParts(date).map(p => [p.type, p.value]));
  const weekday = STRINGS.en.weekday_short.indexOf(parts.weekday);
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    weekday: weekday === -1 ? date.getDay() : weekday,
  };
}

export function toLocalizedDigits(s, lang) {
  return lang === "bn" ? toBnDigits(s) : String(s);
}

/* Localized team name — falls back to English when Bangla map is missing. */
export function teamNameLocal(team, lang) {
  if (!team) return "";
  if (lang === "bn" && team.fifa_code) {
    return TEAM_NAMES_BN[team.fifa_code] || team.name_en || team.name_fa || "";
  }
  return team.name_en || team.name_fa || "";
}

/* Localized stadium name — falls back to English when Bangla map is missing. */
export function stadiumNameLocal(stadium, lang) {
  if (!stadium) return "";
  if (lang === "bn" && stadium.id) {
    return STADIUM_NAMES_BN[String(stadium.id)] || stadium.name_en || stadium.name_fa || "";
  }
  return stadium.name_en || stadium.name_fa || "";
}
