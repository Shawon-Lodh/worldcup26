/* assets/js/main.js
   App bootstrap: state, language persistence, countdown, data fetching &
   realtime polling (live matches → 15s, otherwise 60s), filter wiring, modal.
*/

import { getT, STRINGS, toBnDigits, toLocalizedDigits } from "./i18n.js?v=6";
import {
  fetchAll, fetchMatches, matchStatus, fetchMatchesLive, fetchGroupsLive
} from "./api.js";
import { bootAnalyticsOnLoad, track, setLanguageAnalytics } from "./analytics.js";
import {
  buildTeamsIdx, buildStadiumsIdx,
  renderMatches, renderTeams, renderGroups, renderStadiums,
  renderLiveBanner, openMatchModal, closeMatchModal,
  renderMatchSkeletons, renderTeamSkeletons, renderGroupSkeletons, renderStadiumSkeletons,
  renderError, showToast
} from "./render.js?v=6";

const LS_LANG = "wc26.lang";
const LS_THEME = "wc26.theme";
const FINAL_HOST = "https://shawon-lodh.github.io/worldcup26/";

const OPEN_DATE  = new Date("2026-06-11T13:00:00Z").getTime();
const FINAL_DATE = new Date("2026-07-19T18:00:00Z").getTime();

let lang = localStorage.getItem(LS_LANG) || detectLang();
let state = {
  matches: [], teams: [], stadiums: [], groups: [],
  teamsIdx: new Map(), stadiumsIdx: new Map()
};
let filters = { stage: "all", status: "all" };
let pollTimer = null;

/* ─────────────────────────────────────────────────────── */
function detectLang() {
  // 1. Honor ?lang= URL parameter (used by hreflang links in our SEO head).
  const urlLang = new URLSearchParams(location.search).get("lang");
  if (urlLang === "en" || urlLang === "bn") { localStorage.setItem(LS_LANG, urlLang); return urlLang; }
  // 2. Previously chosen language.
  const saved = localStorage.getItem(LS_LANG);
  if (saved === "en" || saved === "bn") return saved;
  // 3. Browser default.
  const bl = (navigator.language || "en").toLowerCase();
  return bl.startsWith("bn") ? "bn" : "en";
}

function applyLang() {
  const t = getT(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = "ltr"; // Bangla script is LTR
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  const langSelect = document.getElementById("langSelect");
  if (langSelect) {
    langSelect.value = lang;
    langSelect.setAttribute("aria-label", t("language_label"));
  }

  if (state.matches.length) paintAll();
}

function setLang(next, pushToUrl = true) {
  const prev = lang;
  lang = next;
  localStorage.setItem(LS_LANG, lang);
  // Reflect in URL so the link is shareable + back button works.
  if (pushToUrl && "history" in window) {
    const u = new URL(location.href);
    if (next === "en") u.searchParams.delete("lang");
    else u.searchParams.set("lang", next);
    history.pushState({ lang: next }, "", u);
  }
  applyLang();
  if (prev !== next) setLanguageAnalytics(prev, next);
}

// React to browser back/forward so the URL stays truthful.
window.addEventListener("popstate", (e) => {
  const want = (e.state && e.state.lang) || new URLSearchParams(location.search).get("lang");
  const next = want === "bn" ? "bn" : (want === "en" ? "en" : lang);
  if (next !== lang) {
    const prev = lang;
    lang = next;
    applyLang();
    setLanguageAnalytics(prev, next);
  }
});

/* ── Countdown ────────────────────────────────────────── */
function tickCountdown() {
  const now = Date.now();
  const target = now < OPEN_DATE ? OPEN_DATE : FINAL_DATE;
  const diff = Math.max(0, target - now);

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  const t = getT(lang);
  const targetEl = document.getElementById("cdTarget");
  if (now > FINAL_DATE) {
    targetEl.textContent = t("cd_started");
  } else {
    targetEl.textContent = now < OPEN_DATE ? t("cd_target_open") : t("cd_target_final");
  }

  document.getElementById("cd-days").textContent  = toLocalizedDigits(d, lang);
  document.getElementById("cd-hours").textContent = pad(h);
  document.getElementById("cd-mins").textContent  = pad(m);
  document.getElementById("cd-secs").textContent  = pad(s);
}
function pad(n) { return toLocalizedDigits(String(n).padStart(2, "0"), lang); }

/* ── Painting ─────────────────────────────────────────── */
function paintAll() {
  paintMatches();
  paintTeams();
  paintGroups();
  paintStadiums();
  paintLiveBanner();
}

function paintMatches() {
  renderMatches(
    document.getElementById("matchesGrid"),
    state.matches, state.teamsIdx, state.stadiumsIdx, lang, filters
  );
}
function paintTeams() {
  renderTeams(document.getElementById("teamsGrid"), state.teams, lang,
    document.getElementById("teamSearch").value.trim());
}
function paintGroups() {
  renderGroups(document.getElementById("groupsGrid"), state.groups, state.teamsIdx, lang);
}
function paintStadiums() {
  renderStadiums(document.getElementById("stadiumsGrid"), state.stadiums, state.matches, lang);
}
function paintLiveBanner() {
  renderLiveBanner(document.getElementById("liveBannerHost"), state.matches, state.teamsIdx, lang);
  const live = state.matches.some(m => matchStatus(m) === "live");
  document.getElementById("livePulse").classList.toggle("is-hidden", !live);
}

/* ── Data fetch with realtime polling ────────────────── */
async function loadAll() {
  const t = getT(lang);
  // Show skeletons immediately so the initial-render "Loading…" flash is gone.
  renderMatchSkeletons(document.getElementById("matchesGrid"));
  renderTeamSkeletons(document.getElementById("teamsGrid"));
  renderGroupSkeletons(document.getElementById("groupsGrid"));
  renderStadiumSkeletons(document.getElementById("stadiumsGrid"));
  try {
    const { matches, teams, stadiums, groups } = await fetchAll();
    state.matches = matches;
    state.teams = teams;
    state.stadiums = stadiums;
    state.groups = groups;
    state.teamsIdx = buildTeamsIdx(teams);
    state.stadiumsIdx = buildStadiumsIdx(stadiums);
    paintAll();
  } catch (e) {
    console.warn("loadAll failed", e);
    renderError(document.getElementById("matchesGrid"), lang, loadAll);
    renderError(document.getElementById("teamsGrid"), lang, loadAll);
    renderError(document.getElementById("groupsGrid"), lang, loadAll);
    renderError(document.getElementById("stadiumsGrid"), lang, loadAll);
  }
}

/* Lightweight poll: only re-fetch matches+groups (the parts that change live). */
async function pollLive() {
  try {
    const [matches, groups] = await Promise.all([
      fetchMatchesLive(), fetchGroupsLive().catch(() => [])
    ]);
    state.matches = matches;
    state.groups = groups;
    paintMatches();
    paintGroups();
    paintLiveBanner();
  } catch (e) {
    console.warn("poll failed", e);
  } finally {
    schedulePoll();
  }
}

function schedulePoll() {
  if (pollTimer) clearTimeout(pollTimer);
  const live = state.matches.some(m => matchStatus(m) === "live");
  // When live: refresh every 15s. Otherwise 60s (covers near-kickoff transitions).
  const delay = live ? 15000 : 60000;
  pollTimer = setTimeout(pollLive, delay);
}

/* ── Filters ──────────────────────────────────────────── */
function wireFilters() {
  const root = document.getElementById("matchFilters");
  root.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    const key = btn.dataset.filterStage ? "stage" : (btn.dataset.filterStatus ? "status" : null);
    if (!key) return;
    const value = btn.dataset.filterStage || btn.dataset.filterStatus;
    filters[key] = value;
    // toggle active within group
    root.querySelectorAll(`[data-filter-${key === "stage" ? "stage" : "status"}]`).forEach(b => {
      b.classList.toggle("is-active", b === btn);
    });
    track("filter_change", { key, value });
    paintMatches();
  });
}

/* ── Team search ──────────────────────────────────────── */
function wireTeamSearch() {
  let tId = null;
  const input = document.getElementById("teamSearch");
  input.addEventListener("input", () => {
    clearTimeout(tId);
    tId = setTimeout(() => {
      const v = input.value.trim();
      if (v.length) track("team_search", { query_length: v.length });
      paintTeams();
    }, 120);
  });
}

/* ── Modal ────────────────────────────────────────────── */
function wireModal() {
  const modal = document.getElementById("matchModal");
  const body = document.getElementById("matchModalBody");

  document.getElementById("matchesGrid").addEventListener("click", (e) => {
    const card = e.target.closest(".match");
    if (!card) return;
    const mid = card.dataset.mid;
    const g = state.matches.find(x => String(x.id) === String(mid));
    if (!g) return;
    openMatchModal(modal, body, g, state.teamsIdx, state.stadiumsIdx, lang);
    rememberShareTarget(g);
    track("match_open", { id: g.id, stage: g.type, status: matchStatus(g) });
  });
  document.getElementById("matchesGrid").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".match");
    if (!card) return;
    card.click();
  });

  modal.addEventListener("click", (e) => {
    if (e.target.matches("[data-close]")) closeMatchModal(modal);
    // Share button — uses Web Share API where available, falls back to clipboard.
    if (e.target.closest("#modalShareBtn")) shareCurrentMatch();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMatchModal(modal);
  });
}

/* ── Share a match (Web Share API with clipboard fallback) ── */
let shareMatchRef = null;
function rememberShareTarget(g) { shareMatchRef = g; }

function shareCurrentMatch() {
  const g = shareMatchRef;
  if (!g) return;
  const t = getT(lang);
  const home = state.teamsIdx.get(String(g.home_team_id));
  const away = state.teamsIdx.get(String(g.away_team_id));
  const hn = home?.name_en || g.home_team_label || t("tbd");
  const an = away?.name_en || g.away_team_label || t("tbd");
  const score = matchStatus(g) !== "upcoming" ? `${g.home_score}-${g.away_score} ` : "";
  const url = `${FINAL_HOST}?match=${g.id}&lang=${lang}`;
  const title = `${t("share_match_title")} #${g.id}`;
  const text = `${hn} ${score}vs ${an} — World Cup 2026`;

  track("share_match", { id: g.id });
  if (navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(`${text}\n${url}`)
      .then(() => showToast(t("share_copied")))
      .catch(() => showToast(t("share_unsupported")));
  } else {
    showToast(t("share_unsupported"));
  }
}

/* ── Theme ───────────────────────────────────────────── */
function applyTheme(theme) {
  document.documentElement.classList.toggle("theme-light", theme === "light");
  const btn = document.getElementById("themeBtn");
  if (btn) btn.textContent = theme === "light" ? "🌙" : "☀️";
}
function detectTheme() {
  const saved = localStorage.getItem(LS_THEME);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
function setTheme(next) {
  localStorage.setItem(LS_THEME, next);
  applyTheme(next);
  track("theme_change", { theme: next });
}

/* ── Nav / language UI ─────────────────────────────── */
function wireUI() {
  document.getElementById("langSelect").addEventListener("change", (e) =>
    setLang(e.target.value === "bn" ? "bn" : "en"));

  document.getElementById("themeBtn").addEventListener("click", () =>
    setTheme(document.documentElement.classList.contains("theme-light") ? "dark" : "light"));

  const menuBtn = document.getElementById("menuBtn");
  const nav = document.getElementById("nav");
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  nav.addEventListener("click", (e) => {
    if (e.target.closest(".nav__link")) nav.classList.remove("is-open");
  });
  // close mobile nav on resize to desktop
  window.matchMedia("(min-width: 760px)").addEventListener("change", (mq) => {
    if (mq.matches) nav.classList.remove("is-open");
  });
}

/* ── Section view tracking (IntersectionObserver) ────── */
function wireSectionTracking() {
  const sections = document.querySelectorAll("section[id]");
  if (!("IntersectionObserver" in window)) return;
  const seen = new WeakSet();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting && !seen.has(e.target)) {
        seen.add(e.target);
        track("section_view", { id: e.target.id });
      }
    }
  }, { threshold: 0.25 });
  sections.forEach(s => io.observe(s));
}

/* ── Boot ─────────────────────────────────────────────── */
function boot() {
  wireUI();
  wireFilters();
  wireTeamSearch();
  wireModal();
  wireSectionTracking();
  applyLang();
  applyTheme(detectTheme());
  tickCountdown();
  setInterval(tickCountdown, 1000);
  bootAnalyticsOnLoad();
  // Register service worker for offline caching (item #6).
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
  loadAll().then(schedulePoll);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
