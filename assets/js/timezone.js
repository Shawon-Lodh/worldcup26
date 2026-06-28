/* assets/js/timezone.js
   Venue-local kickoff times -> viewer-local times.
   Current product default is Bangladesh time. Later, an IP lookup can call
   setViewerTimeZoneFromCountry(countryCode) before rendering. */

const LS_TZ = "wc26.timeZone";
const DEFAULT_VIEWER_TIME_ZONE = "Asia/Dhaka";

const STADIUM_TIME_ZONES = {
  "1": "America/Mexico_City",
  "2": "America/Mexico_City",
  "3": "America/Monterrey",
  "4": "America/Chicago",
  "5": "America/Chicago",
  "6": "America/Monterrey",
  "7": "America/New_York",
  "8": "America/Los_Angeles",
  "9": "America/Los_Angeles",
  "10": "America/New_York",
  "11": "America/New_York",
  "12": "America/New_York",
  "13": "America/Toronto",
  "14": "America/Vancouver",
  "15": "America/New_York",
  "16": "America/Chicago",
};

const COUNTRY_TIME_ZONES = {
  BD: "Asia/Dhaka",
  US: "America/New_York",
  CA: "America/Toronto",
  MX: "America/Mexico_City",
  GB: "Europe/London",
  IN: "Asia/Kolkata",
  PK: "Asia/Karachi",
  AE: "Asia/Dubai",
  SA: "Asia/Riyadh",
  AU: "Australia/Sydney",
};

export function getViewerTimeZone() {
  return localStorage.getItem(LS_TZ) || DEFAULT_VIEWER_TIME_ZONE;
}

export function setViewerTimeZone(timeZone) {
  if (!isValidTimeZone(timeZone)) return false;
  localStorage.setItem(LS_TZ, timeZone);
  return true;
}

export function setViewerTimeZoneFromCountry(countryCode) {
  const timeZone = COUNTRY_TIME_ZONES[String(countryCode || "").toUpperCase()];
  return timeZone ? setViewerTimeZone(timeZone) : false;
}

export function getMatchSourceTimeZone(stadium) {
  const byId = STADIUM_TIME_ZONES[String(stadium?.id || "")];
  if (byId) return byId;

  const country = String(stadium?.country_en || "").toLowerCase();
  const city = String(stadium?.city_en || "").toLowerCase();
  if (country.includes("mexico")) return city.includes("monterrey") ? "America/Monterrey" : "America/Mexico_City";
  if (country.includes("canada")) return city.includes("vancouver") ? "America/Vancouver" : "America/Toronto";
  if (country.includes("united states") || country === "usa") {
    if (["seattle", "san francisco", "santa clara", "los angeles"].some(x => city.includes(x))) return "America/Los_Angeles";
    if (["dallas", "houston", "kansas"].some(x => city.includes(x))) return "America/Chicago";
    return "America/New_York";
  }
  return "UTC";
}

export function parseMatchDateToInstant(localDate, stadium) {
  const parts = parseApiLocalDate(localDate);
  if (!parts) return null;
  return zonedWallTimeToDate(parts, getMatchSourceTimeZone(stadium));
}

export function formatMatchTime(localDate, stadium, targetTimeZone = getViewerTimeZone()) {
  const instant = parseMatchDateToInstant(localDate, stadium);
  if (!instant) return null;
  return { instant, targetTimeZone };
}

export function timeZoneLabel(timeZone, lang) {
  if (timeZone === "Asia/Dhaka") return lang === "bn" ? "বাংলাদেশ সময়" : "BDT";
  try {
    const dtf = new Intl.DateTimeFormat("en", { timeZone, timeZoneName: "short" });
    return dtf.formatToParts(new Date()).find(p => p.type === "timeZoneName")?.value || timeZone;
  } catch {
    return timeZone;
  }
}

function parseApiLocalDate(localDate) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(localDate || "");
  if (!m) return null;
  return {
    month: Number(m[1]),
    day: Number(m[2]),
    year: Number(m[3]),
    hour: Number(m[4]),
    minute: Number(m[5]),
  };
}

function zonedWallTimeToDate(parts, timeZone) {
  let utc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  for (let i = 0; i < 3; i += 1) {
    const offset = getOffsetMs(new Date(utc), timeZone);
    const next = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) - offset;
    if (next === utc) break;
    utc = next;
  }
  return new Date(utc);
}

function getOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const values = Object.fromEntries(dtf.formatToParts(date).map(p => [p.type, p.value]));
  const asUTC = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );
  return asUTC - date.getTime();
}

function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}
