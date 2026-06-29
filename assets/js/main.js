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
} from "./render.js?v=8";
import { watchHashSeo, updateSeo } from "./seo.js";
import { parseMatchDateToInstant } from "./timezone.js";
import { renderBracket, renderTeamProfile, renderTopScorers, renderH2H, renderTimeline, renderStatsBar, renderTournamentProgress, renderGroupProgress, getTeamFormDots, renderMatchesByDate, startMatchCountdown } from "./features.js";
import { detectChanges, toggleNotifications, getNotifyState, resetScores, isNotifySupported } from "./notify.js";

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
let filterManual = false;
let calView = false;
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
  updateSeo(lang);
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
  paintBracket();
  paintTeams();
  paintGroups();
  paintStadiums();
  paintLiveBanner();
  paintScorers();
  paintStatsBar();
  paintProgress();
  paintGroupProgress();
}

function paintMatches() {
  if (calView) {
    const all = state.matches;
    let list = all;
    if (filters.stage !== "all") list = list.filter(x => x.type === filters.stage);
    if (filters.status !== "all") list = list.filter(x => matchStatus(x) === filters.status);
    renderMatchesByDate(
      document.getElementById("matchesGrid"),
      list, state.teamsIdx, state.stadiumsIdx, lang, getT(lang)
    );
  } else {
    renderMatches(
      document.getElementById("matchesGrid"),
      state.matches, state.teamsIdx, state.stadiumsIdx, lang, filters
    );
  }
}
function paintBracket() {
  renderBracket(
    document.getElementById("bracketGrid"),
    state.matches, state.teamsIdx, lang, state.groups
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
function paintScorers() {
  renderTopScorers(
    document.getElementById("scorersGrid"),
    state.matches, state.teamsIdx, lang
  );
}
function paintStatsBar() {
  renderStatsBar(
    document.getElementById("statsBarHost"),
    state.matches, state.teamsIdx, lang
  );
}
function paintProgress() {
  renderTournamentProgress(
    document.getElementById("tourneyProgressHost"),
    state.matches, lang
  );
}
function paintGroupProgress() {
  renderGroupProgress(
    document.getElementById("groupProgressHost"),
    state.groups, state.matches, lang
  );
  // Add form dots to group table rows
  document.querySelectorAll("#groupsGrid tr[data-tid]").forEach(row => {
    const tid = row.dataset.tid;
    const dots = getTeamFormDots(tid, state.matches);
    const teamCol = row.querySelector(".team-col");
    if (teamCol && dots.length && !teamCol.querySelector(".form-mini")) {
      teamCol.insertAdjacentHTML("beforeend",
        `<span class="form-mini">${dots.map(c => `<span class="form-mini-dot ${c.toLowerCase()}">${c}</span>`).join("")}</span>`);
    }
  });
}

/* ── Data fetch with realtime polling ────────────────── */
async function loadAll() {
  const t = getT(lang);
  // Show skeletons immediately so the initial-render "Loading…" flash is gone.
  renderMatchSkeletons(document.getElementById("matchesGrid"));
  renderTeamSkeletons(document.getElementById("teamsGrid"));
  renderGroupSkeletons(document.getElementById("groupsGrid"));
  renderStadiumSkeletons(document.getElementById("stadiumsGrid"));
  document.getElementById("bracketGrid").innerHTML = '<div class="skeleton sk-group"></div>';
  document.getElementById("scorersGrid").innerHTML = '<div class="skeleton sk-group"></div>';
  try {
    const { matches, teams, stadiums, groups } = await fetchAll();
    state.matches = matches;
    state.teams = teams;
    state.stadiums = stadiums;
    state.groups = groups;
    state.teamsIdx = buildTeamsIdx(teams);
    state.stadiumsIdx = buildStadiumsIdx(stadiums);
    autoSelectFilters();
    paintAll();
    startMatchCountdown();
  } catch (e) {
    console.warn("loadAll failed", e);
    renderError(document.getElementById("matchesGrid"), lang, loadAll);
    renderError(document.getElementById("teamsGrid"), lang, loadAll);
    renderError(document.getElementById("groupsGrid"), lang, loadAll);
    renderError(document.getElementById("stadiumsGrid"), lang, loadAll);
    renderError(document.getElementById("bracketGrid"), lang, loadAll);
    renderError(document.getElementById("scorersGrid"), lang, loadAll);
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
    if (!filterManual) autoSelectFilters();
    paintMatches();
    paintBracket();
    paintGroups();
    paintLiveBanner();
    paintScorers();
    paintStatsBar();
    paintProgress();
    paintGroupProgress();
    detectChanges(matches, state.teamsIdx, lang);
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
function autoSelectFilters() {
  const stageOrder = ["group", "r32", "r16", "qf", "sf", "third", "final"];

  // Determine current stage: the one with live matches, or the earliest upcoming
  let currentStage = "group";
  const anyLive = state.matches.some(m => matchStatus(m) === "live");

  if (anyLive) {
    // Pick the first stage that has a live match
    for (const stage of stageOrder) {
      if (state.matches.some(m => m.type === stage && matchStatus(m) === "live")) {
        currentStage = stage;
        break;
      }
    }
  } else {
    // Pick the stage with the earliest upcoming match
    let earliest = Infinity;
    for (const stage of stageOrder) {
      const upcoming = state.matches.filter(m => m.type === stage && matchStatus(m) === "upcoming");
      if (upcoming.length === 0) continue;
      const dates = upcoming.map(m => parseMatchDate(m));
      const min = Math.min(...dates.filter(d => d > 0));
      if (min < earliest) { earliest = min; currentStage = stage; }
    }
    // Fallback: latest stage that has any finished match
    if (earliest === Infinity) {
      for (let i = stageOrder.length - 1; i >= 0; i--) {
        if (state.matches.some(m => m.type === stageOrder[i])) {
          currentStage = stageOrder[i];
          break;
        }
      }
    }
  }

  // Determine status: live > upcoming > all
  const anyUpcoming = state.matches.some(m => matchStatus(m) === "upcoming");
  let currentStatus = "all";
  if (anyLive) currentStatus = "live";
  else if (anyUpcoming) currentStatus = "upcoming";

  filters = { stage: currentStage, status: currentStatus };
  updateFilterChips();
}

function parseMatchDate(m) {
  const s = state.stadiumsIdx.get(String(m.stadium_id));
  return parseMatchDateToInstant(m.local_date, s)?.getTime() || Infinity;
}

function updateFilterChips() {
  const root = document.getElementById("matchFilters");
  root.querySelectorAll("[data-filter-stage]").forEach(b => {
    b.classList.toggle("is-active", b.dataset.filterStage === filters.stage);
  });
  root.querySelectorAll("[data-filter-status]").forEach(b => {
    b.classList.toggle("is-active", b.dataset.filterStatus === filters.status);
  });
}

function wireFilters() {
  const root = document.getElementById("matchFilters");
  root.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    const key = btn.dataset.filterStage ? "stage" : (btn.dataset.filterStatus ? "status" : null);
    if (!key) return;
    const value = btn.dataset.filterStage || btn.dataset.filterStatus;
    filters[key] = value;
    filterManual = true;
    updateFilterChips();
    track("filter_change", { key, value });
    paintMatches();
  });
}

function wireCalToggle() {
  const btn = document.getElementById("calToggleBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    calView = !calView;
    const t = getT(lang);
    btn.textContent = calView ? t("cal_list") : t("cal_by_date");
    paintMatches();
  });
}

/* ── Team search + profile ─────────────────────────────── */
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

function wireTeamProfile() {
  const grid = document.getElementById("teamsGrid");
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".team-card");
    if (!card) return;
    const idx = [...grid.children].indexOf(card);
    const sorted = [...state.teams].sort((a, b) => (teamNameLocal(a, lang)).localeCompare(teamNameLocal(b, lang)));
    const q = document.getElementById("teamSearch").value.trim().toLowerCase();
    let list = sorted;
    if (q) {
      list = list.filter(x => (x.name_en || "").toLowerCase().includes(q)
        || (teamNameLocal(x, lang)).toLowerCase().includes(q)
        || (x.fifa_code || "").toLowerCase().includes(q));
    }
    const team = list[idx];
    if (!team) return;
    openTeamProfile(team);
  });
}

function wireBracket() {
  const grid = document.getElementById("bracketGrid");
  grid.addEventListener("click", (e) => {
    const match = e.target.closest(".bracket__match");
    if (!match) return;
    const mid = match.dataset.mid;
    if (mid) openMatch(mid);
  });
  grid.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const match = e.target.closest(".bracket__match");
    if (!match) return;
    match.click();
  });
}

function wireNotifications() {
  const btn = document.getElementById("notifBtn");
  if (!btn) return;
  const updateBtn = () => {
    const state = getNotifyState();
    const t = getT(lang);
    if (state === "unsupported") { btn.style.display = "none"; return; }
    if (state === "enabled") { btn.textContent = "🔔"; btn.style.opacity = "1"; }
    else if (state === "denied") { btn.textContent = "🔕"; btn.style.opacity = ".5"; }
    else { btn.textContent = "🔔"; btn.style.opacity = ".5"; }
    btn.title = state === "enabled" ? t("notif_enabled") : state === "denied" ? t("notif_denied") : t("notif_enable");
  };
  updateBtn();
  btn.addEventListener("click", async () => {
    const state = getNotifyState();
    if (state === "denied") {
      showToast(getT(lang)("notif_denied") + " — check browser site settings");
      return;
    }
    await toggleNotifications();
    updateBtn();
  });
}

/* ── Modal ────────────────────────────────────────────── */
function openMatch(mid) {
  const modal = document.getElementById("matchModal");
  const body = document.getElementById("matchModalBody");
  const g = state.matches.find(x => String(x.id) === String(mid));
  if (!g) return;
  openMatchModal(modal, body, g, state.teamsIdx, state.stadiumsIdx, lang);
  rememberShareTarget(g);
  track("match_open", { id: g.id, stage: g.type, status: matchStatus(g) });
  // Update URL to be shareable + indexed
  const home = state.teamsIdx.get(String(g.home_team_id));
  const away = state.teamsIdx.get(String(g.away_team_id));
  const hn = home?.name_en || g.home_team_label || "TBD";
  const an = away?.name_en || g.away_team_label || "TBD";
  const u = new URL(location.href);
  u.searchParams.set("match", g.id);
  history.replaceState(null, "", u);
  document.title = `${hn} vs ${an} — World Cup 2026 Match ${g.id}`;
  setMatchCanonical(g.id);
  injectMatchSchema(g, hn, an);
  // Add timeline below scorers
  const scorerHost = document.getElementById("matchModalBody");
  if (scorerHost) {
    const tlDiv = document.createElement("div");
    tlDiv.id = "matchTimeline";
    scorerHost.appendChild(tlDiv);
    renderTimeline(tlDiv, g, state.teamsIdx, lang);
  }
}

function setMatchCanonical(mid) {
  const el = document.querySelector("link[rel='canonical']");
  if (el) el.setAttribute("href", `${FINAL_HOST}?match=${mid}`);
}

function injectMatchSchema(g, hn, an) {
  const id = `ld-match-${g.id}`;
  let el = document.getElementById(id);
  if (el) el.remove();
  el = document.createElement("script");
  el.type = "application/ld+json";
  el.id = id;
  const instant = parseMatchDateToInstant(g.local_date, state.stadiumsIdx.get(String(g.stadium_id)));
  const kickoff = instant ? instant.toISOString() : null;
  el.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "name": `${hn} vs ${an}`,
    "sport": "Soccer",
    "startDate": kickoff,
    "homeTeam": { "@type": "SportsTeam", "name": hn },
    "awayTeam": { "@type": "SportsTeam", "name": an },
    "location": { "@type": "Place", "name": g.stadium_id ? state.stadiumsIdx.get(String(g.stadium_id))?.name_en || "" : "" }
  });
  document.head.appendChild(el);
}

function closeModal() {
  const modal = document.getElementById("matchModal");
  closeMatchModal(modal);
  const u = new URL(location.href);
  u.searchParams.delete("match");
  history.replaceState(null, "", u);
  updateSeo(lang);
}

/* ── Team Profile Modal ────────────────────────────────── */
let teamProfileRef = null;

function openTeamProfile(team) {
  const modal = document.getElementById("teamModal");
  const body = document.getElementById("teamModalBody");
  const h2hHost = document.getElementById("h2hSection");
  teamProfileRef = team;
  renderTeamProfile(body, team, state.matches, state.stadiumsIdx, state.teamsIdx, lang);
  // Add timeline to match modal if open
  renderH2H(h2hHost, team, null, state.matches, state.stadiumsIdx, lang);
  addH2HSelector(h2hHost, team);
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  track("team_open", { id: team.id, name: team.name_en || "" });
}

function addH2HSelector(host, team1) {
  const t = getT(lang);
  // Remove existing selector if any
  const existing = host.querySelector(".h2h-selector");
  if (existing) existing.remove();

  const selDiv = document.createElement("div");
  selDiv.className = "h2h-selector";
  selDiv.style.cssText = "margin-top:16px";
  selDiv.innerHTML = `
    <label style="font-size:.78rem;color:var(--text-3)">${escAttr(t("h2h_title"))}: ${escAttr(t("h2h_select_teams"))}</label>
    <select id="h2hTeamSelect" style="margin-left:8px;padding:4px 8px;background:var(--bg-3);color:var(--text);border:1px solid var(--border);border-radius:6px;font-size:.82rem">
      <option value="">-- ${escAttr(t("h2h_select_teams"))} --</option>
      ${state.teams.filter(x => String(x.id) !== String(team1.id)).map(x =>
        `<option value="${escAttr(x.id)}">${escAttr(teamNameLocal(x, lang))}</option>`
      ).join("")}
    </select>`;
  host.appendChild(selDiv);

  selDiv.querySelector("select").addEventListener("change", (e) => {
    const team2 = state.teams.find(x => String(x.id) === e.target.value);
    const h2hHost = document.getElementById("h2hSection");
    renderH2H(h2hHost, team1, team2 || null, state.matches, state.stadiumsIdx, lang);
  });
}

function escAttr(s) { return String(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;"); }

function closeTeamModal() {
  const modal = document.getElementById("teamModal");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  teamProfileRef = null;
}

function wireTeamModal() {
  const teamModal = document.getElementById("teamModal");
  teamModal.addEventListener("click", (e) => {
    if (e.target.matches("[data-close]")) closeTeamModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && teamModal.classList.contains("is-open")) closeTeamModal();
  });
  // Match click inside team profile → open match modal
  const teamBody = document.getElementById("teamModalBody");
  teamBody.addEventListener("click", (e) => {
    const m = e.target.closest(".tp-match");
    if (!m) return;
    const mid = m.dataset.mid;
    if (mid) openMatch(mid);
  });
}

function wireModal() {
  const modal = document.getElementById("matchModal");
  const body = document.getElementById("matchModalBody");

  document.getElementById("matchesGrid").addEventListener("click", (e) => {
    const card = e.target.closest(".match");
    if (!card) return;
    openMatch(card.dataset.mid);
  });
  document.getElementById("matchesGrid").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".match");
    if (!card) return;
    card.click();
  });

  modal.addEventListener("click", (e) => {
    if (e.target.matches("[data-close]")) closeModal();
    if (e.target.closest("#modalShareBtn")) shareCurrentMatch();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
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
  wireCalToggle();
  wireTeamSearch();
  wireTeamProfile();
  wireBracket();
  wireNotifications();
  wireModal();
  wireTeamModal();
  wireSectionTracking();
  applyLang();
  watchHashSeo(lang);
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
  loadAll().then(() => {
    schedulePoll();
    // Deep-link: open specific match if ?match=X in URL
    const matchId = new URLSearchParams(location.search).get("match");
    if (matchId) {
      // Scroll to matches section first
      requestAnimationFrame(() => {
        const el = document.getElementById("matches");
        if (el) el.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => openMatch(matchId), 400);
      });
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
