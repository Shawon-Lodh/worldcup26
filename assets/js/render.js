/* assets/js/render.js
   Pure rendering functions. Take state + language → DOM strings/elements.
   Kept separate from main.js to keep concerns clear. */

import { getT, formatDateParts, toLocalizedDigits, toBnDigits, teamNameLocal, stadiumNameLocal } from "./i18n.js?v=6";
import { matchStatus, parseScorers } from "./api.js";
import { formatMatchTime, parseMatchDateToInstant, timeZoneLabel } from "./timezone.js?v=7";

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

export function buildTeamsIdx(teams) {
  const idx = new Map();
  for (const t of teams || []) idx.set(String(t.id), t);
  return idx;
}
export function buildStadiumsIdx(stadiums) {
  const idx = new Map();
  for (const s of stadiums || []) idx.set(String(s.id), s);
  return idx;
}

/* ── Translate team name ────────────────────────────────── */
/* The API only ships EN + FA. We have no Bangla source, so we keep EN for both
   langs — the UI chrome & numbers stay Bangla. */
export function teamName(team, lang) {
  return teamNameLocal(team, lang);
}

// Scotland, England, Wales play as nations but aren't ISO 3166-1 sovereign
// states — flagcdn requires their GB-XXX subdivision codes instead.
const FLAG_OVERRIDES = { SCO: "gb-sct", ENG: "gb-eng", WAL: "gb-wls" };

export function teamFlag(team) {
  if (team?.flag) return team.flag;
  const code = team?.fifa_code;
  if (code && FLAG_OVERRIDES[code]) {
    return `https://flagcdn.com/w80/${FLAG_OVERRIDES[code]}.png`;
  }
  const iso = team?.iso2;
  if (iso) return `https://flagcdn.com/w80/${iso.toLowerCase()}.png`;
  return "";
}

function matchTeams(g, idx) {
  const home = idx.get(String(g.home_team_id));
  const away = idx.get(String(g.away_team_id));
  return { home, away };
}

function teamLabel(g, side /* "home" | "away" */, idx) {
  if (String(g[`${side}_team_id`]) === "0") {
    return g[`${side}_team_label`] || null; // placeholder for knockout TBDs
  }
  const t = idx.get(String(g[`${side}_team_id`]));
  return t ? teamName(t) : null;
}

/* ── Matches ────────────────────────────────────────────── */
function renderMatchCard({ g, status }, idx, sIdx, lang, t) {
  const home = idx.get(String(g.home_team_id));
  const away = idx.get(String(g.away_team_id));
  const isTBDHome = String(g.home_team_id) === "0";
  const isTBDAway = String(g.away_team_id) === "0";
  const homeLabel = teamLabel(g, "home", idx) || t("tbd");
  const awayLabel = teamLabel(g, "away", idx) || t("tbd");

  const hs = String(g.home_score), as = String(g.away_score);
  const scoreShown = status !== "upcoming";
  const homeWin = scoreShown && !isTBDHome && !isTBDAway && parseInt(hs) > parseInt(as);
  const awayWin = scoreShown && !isTBDHome && !isTBDAway && parseInt(as) > parseInt(hs);

  const homeFlag = isTBDHome ? "" : teamFlag(home);
  const awayFlag = isTBDAway ? "" : teamFlag(away);

  const stadium = sIdx.get(String(g.stadium_id));
  const stadiumName = stadium ? stadiumNameLocal(stadium, lang) : "";
  const kickoff = formatKickoff(g.local_date, stadium, lang);

  const statusL = status === "live" ? t("status_live_short")
                : status === "finished" ? `${toLocalizedDigits(hs, lang)}–${toLocalizedDigits(as, lang)} ${t("status_ft")}`
                : t("status_upcoming_lbl");

  const stageTag = g.type === "group" ? `${t("group_name")} ${g.group}` : stageLabel(g.type, t);

  return `
    <article class="match ${status === "live" ? "is-live" : ""}" data-mid="${esc(g.id)}" data-stage="${esc(g.type)}" data-state="${status}" data-hs="${esc(hs)}" data-as="${esc(as)}" tabindex="0" role="button" aria-label="Match ${esc(g.id)}">
      <div class="match__top">
        <span class="match__stage">${esc(stageTag)}</span>
        <span class="match__status" data-state="${status}">${esc(statusL)}</span>
      </div>
      <div class="match__teams">
        <div class="team-row ${homeWin ? "is-winner" : ""}">
          ${flagImg(homeFlag, isTBDHome)}
          <span class="team-row__name">${esc(homeLabel)}</span>
          <span class="team-row__score ${scoreShown ? "" : "is-pending"}" data-tid="hs">${scoreShown ? esc(toLocalizedDigits(hs, lang)) : "–"}</span>
        </div>
        <div class="team-row ${awayWin ? "is-winner" : ""}">
          ${flagImg(awayFlag, isTBDAway)}
          <span class="team-row__name">${esc(awayLabel)}</span>
          <span class="team-row__score ${scoreShown ? "" : "is-pending"}" data-tid="as">${scoreShown ? esc(toLocalizedDigits(as, lang)) : "–"}</span>
        </div>
      </div>
      <div class="match__bottom">
        <span class="match__date">${esc(kickoff || g.local_date || "")}</span>
        <span class="match__stadium">${esc(stadiumName)}</span>
      </div>${status === "live" ? `
      <div class="live-timer">
        <span>⚡</span>
        <div class="live-timer__bar"><div class="live-timer__fill" style="width:${liveProgress(g.time_elapsed)}%"></div></div>
        <span class="live-timer__label">${esc(g.time_elapsed || "LIVE")}′</span>
      </div>` : ""}
    </article>`;
}
function liveProgress(elapsed) {
  if (!elapsed) return 10;
  const e = String(elapsed).toLowerCase();
  if (e === "ht") return 50;
  if (e === "ft") return 100;
  const n = parseInt(e); if (isNaN(n)) return 20;
  return Math.min(100, Math.max(5, (n / 90) * 100));
}

export function renderMatches(grid, matches, idx, sIdx, lang, filters) {
  const t = getT(lang);
  if (!matches?.length) { grid.innerHTML = `<div class="loading">${esc(t("loading"))}</div>`; return; }

  // sort: live first, then upcoming by date asc, then finished by date desc
  const withMeta = matches.map(g => ({
    g, status: matchStatus(g),
    dt: parseMatchDate(g.local_date, sIdx.get(String(g.stadium_id))) || 0
  }));

  withMeta.sort((a, b) => {
    const order = { live: 0, upcoming: 1, finished: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    if (a.status === "finished") return b.dt - a.dt;
    return a.dt - b.dt;
  });

  let list = withMeta;
  if (filters.stage !== "all") list = list.filter(x => x.g.type === filters.stage);
  if (filters.status !== "all") list = list.filter(x => x.status === filters.status);

  if (!list.length) {
    grid.innerHTML = `<div class="loading">${esc(t("no_matches"))}</div>`;
    return;
  }

  if (filters.stage === "all") {
    const stageOrder = ["group", "r32", "r16", "qf", "sf", "third", "final"];
    const groups = new Map();
    for (const item of list) {
      const type = item.g.type;
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type).push(item);
    }
    const stageRank = (type) => {
      const idx = stageOrder.indexOf(type);
      return idx === -1 ? stageOrder.length : idx;
    };
    const sortedGroups = [...groups.entries()].sort(
      (a, b) => stageRank(a[0]) - stageRank(b[0])
    );
    const parts = [];
    for (const [, items] of sortedGroups) {
      parts.push(`
        <div class="match-stage-group">
          <div class="match-stage-grid">
            ${items.map(item => renderMatchCard(item, idx, sIdx, lang, t)).join("")}
          </div>
        </div>`);
    }
    grid.innerHTML = parts.join("");
  } else {
    grid.innerHTML = list.map(item => renderMatchCard(item, idx, sIdx, lang, t)).join("");
  }
}

function flagImg(flag, isTBD) {
  if (isTBD) return `<span class="team-row__flag is-tbd">TBD</span>`;
  if (!flag) return `<span class="team-row__flag is-tbd">?</span>`;
  return `<img class="team-row__flag" src="${esc(flag)}" alt="" loading="lazy" onerror="this.classList.add('is-tbd');this.alt='?'"/>`;
}

function parseMatchDate(localDate, stadium) {
  return parseMatchDateToInstant(localDate, stadium)?.getTime() || 0;
}

function formatKickoff(localDate, stadium, lang) {
  const converted = formatMatchTime(localDate, stadium);
  if (!converted) return "";
  return formatDateParts(
    converted.instant,
    lang,
    timeZoneLabel(converted.targetTimeZone, lang),
    converted.targetTimeZone
  );
}

/* ── Teams ──────────────────────────────────────────────── */
export function renderTeams(grid, teams, lang, query) {
  const t = getT(lang);
  if (!teams?.length) { grid.innerHTML = `<div class="loading">${esc(t("loading"))}</div>`; return; }
  let list = [...teams].sort((a, b) => (teamNameLocal(a, lang)).localeCompare(teamNameLocal(b, lang)));
  if (query) {
    const q = query.toLowerCase();
    list = list.filter(x => (x.name_en || "").toLowerCase().includes(q)
      || (teamNameLocal(x, lang)).toLowerCase().includes(q)
      || (x.fifa_code || "").toLowerCase().includes(q));
  }
  grid.innerHTML = list.map(x => {
    const grpLabel = x.groups ? `${t("group_name")} ${x.groups}` : "";
    const name = teamNameLocal(x, lang);
    return `
      <div class="team-card">
        <img class="team-card__flag" src="${esc(teamFlag(x))}" alt="${esc(x.name_en)}" loading="lazy"/>
        <div class="team-card__name">${esc(name)}</div>
        <div class="team-card__meta"><b>${esc(x.fifa_code)}</b> · ${esc(grpLabel)}</div>
      </div>`;
  }).join("");
}

/* ── Groups ─────────────────────────────────────────────── */
export function renderGroups(grid, groups, idx, lang) {
  const t = getT(lang);
  if (!groups?.length) { grid.innerHTML = `<div class="loading">${esc(t("loading"))}</div>`; return; }
  const sorted = [...groups].sort((a, b) => a.name.localeCompare(b.name));
  grid.innerHTML = sorted.map(grp => {
    const teams = (grp.teams || []).map(row => {
      const team = idx.get(String(row.team_id));
      const name = team ? teamName(team, lang) : t("tbd");
      const flag = team ? teamFlag(team) : "";
      // sort by points desc, then GD, then GF
      return { row, team, name, flag,
        pts: parseInt(row.pts || 0), gd: parseInt(row.gd || 0), gf: parseInt(row.gf || 0)
      };
    }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

    return `
      <div class="group-card">
        <div class="group-card__head">${esc(t("group_name"))} <b>${esc(grp.name)}</b></div>
        <table class="table">
          <thead>
            <tr>
              <th>${esc(t("tbl_pos"))}</th>
              <th class="team-col" style="text-align:start">${esc(t("tbl_team"))}</th>
              <th>${esc(t("tbl_mp"))}</th><th>${esc(t("tbl_w"))}</th><th>${esc(t("tbl_d"))}</th><th>${esc(t("tbl_l"))}</th>
              <th>${esc(t("tbl_gf"))}</th><th>${esc(t("tbl_ga"))}</th><th>${esc(t("tbl_gd"))}</th>
              <th>${esc(t("tbl_pts"))}</th>
            </tr>
          </thead>
          <tbody>
            ${teams.map((x, i) => `
              <tr class="${i < 2 ? "qual" : ""}" data-tid="${esc(String(x.row.team_id))}">
                <td class="pos">${esc(toLocalizedDigits(i + 1, lang))}</td>
                <td class="team-col">${x.flag ? `<img src="${esc(x.flag)}" alt="" loading="lazy"/>` : ""}${esc(x.name)}</td>
                <td>${esc(toLocalizedDigits(x.row.mp || 0, lang))}</td>
                <td>${esc(toLocalizedDigits(x.row.w || 0, lang))}</td>
                <td>${esc(toLocalizedDigits(x.row.d || 0, lang))}</td>
                <td>${esc(toLocalizedDigits(x.row.l || 0, lang))}</td>
                <td>${esc(toLocalizedDigits(x.row.gf || 0, lang))}</td>
                <td>${esc(toLocalizedDigits(x.row.ga || 0, lang))}</td>
                <td>${esc(toLocalizedDigits(x.row.gd || 0, lang))}</td>
                <td class="pts">${esc(toLocalizedDigits(x.row.pts || 0, lang))}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }).join("");
}

/* ── Stadiums ───────────────────────────────────────────── */
export function renderStadiums(grid, stadiums, matches, lang) {
  const t = getT(lang);
  if (!stadiums?.length) { grid.innerHTML = `<div class="loading">${esc(t("loading"))}</div>`; return; }

  const counts = new Map();
  for (const g of matches || []) {
    const k = String(g.stadium_id);
    counts.set(k, (counts.get(k) || 0) + 1);
  }

  const list = [...stadiums].sort((a, b) => (b.capacity || 0) - (a.capacity || 0));
  grid.innerHTML = list.map(s => {
    const ct = counts.get(String(s.id)) || 0;
    return `
      <div class="stadium-card">
        <div class="stadium-card__name">${esc(stadiumNameLocal(s, lang))}</div>
        <div class="stadium-card__city">${esc(s.city_en)} · ${esc(s.country_en)}</div>
        <div class="stadium-card__meta">
          <span>${esc(t("capacity"))}: <b>${esc(toLocalizedDigits(s.capacity || 0, lang))}</b></span>
          <span>${esc(t("stadium_matches"))}: <b>${esc(toLocalizedDigits(ct, lang))}</b></span>
        </div>
        <span class="stadium-card__tag">${esc(s.region || "")}</span>
      </div>`;
  }).join("");
}

/* ── Live Banner ────────────────────────────────────────── */
export function renderLiveBanner(host, matches, idx, lang) {
  const t = getT(lang);
  const live = (matches || []).filter(m => matchStatus(m) === "live");
  if (!live.length) { host.innerHTML = ""; return; }

  host.innerHTML = `
    <div class="container">
      <div class="live-banner is-show">
        <b>● ${esc(t("live"))}</b> ${esc(t("live_matches_now"))}
        ${live.slice(0, 3).map(g => {
          const home = idx.get(String(g.home_team_id)) || {};
          const away = idx.get(String(g.away_team_id)) || {};
          const hn = teamNameLocal(home, lang);
          const an = teamNameLocal(away, lang);
          return `<span>· ${esc(hn)} ${esc(toLocalizedDigits(g.home_score, lang))}–${esc(toLocalizedDigits(g.away_score, lang))} ${esc(an)}</span>`;
        }).join(" ")}
      </div>
    </div>`;
}

/* ── Match Modal ────────────────────────────────────────── */
export function openMatchModal(modal, body, g, idx, sIdx, lang) {
  const t = getT(lang);
  const home = idx.get(String(g.home_team_id));
  const away = idx.get(String(g.away_team_id));
  const isTBDHome = String(g.home_team_id) === "0";
  const isTBDAway = String(g.away_team_id) === "0";
  const homeName = isTBDHome ? (g.home_team_label || t("tbd")) : teamName(home, lang);
  const awayName = isTBDAway ? (g.away_team_label || t("tbd")) : teamName(away, lang);
  const homeFlag = isTBDHome ? "" : teamFlag(home);
  const awayFlag = isTBDAway ? "" : teamFlag(away);
  const stadium = sIdx.get(String(g.stadium_id));
  const stadiumName = stadium ? stadiumNameLocal(stadium, lang) : t("tbd");
  const status = matchStatus(g);
  const stageTag = g.type === "group" ? `${t("group_name")} ${g.group}` : stageLabel(g.type, t);

  const homeScore = status === "upcoming" ? "–" : toLocalizedDigits(g.home_score, lang);
  const awayScore = status === "upcoming" ? "–" : toLocalizedDigits(g.away_score, lang);

  const homeScorers = parseScorers(g.home_scorers);
  const awayScorers = parseScorers(g.away_scorers);

  body.innerHTML = `
    <h3>${esc(stageTag)}${status === "live" ? ` · <span style="color:var(--accent-2)">${esc(t("status_live_short"))}</span>` : ""}</h3>
    <button class="modal__share" id="modalShareBtn" type="button" aria-label="${esc(t("share"))}">↗ ${esc(t("share"))}</button>
    <div class="modal__scores">
      <div class="modal__team">
        ${homeFlag ? `<img src="${esc(homeFlag)}" alt=""/>` : `<div style="width:60px;height:42px;background:var(--bg-3);border-radius:6px;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;color:var(--text-3);">?</div>`}
        <div class="modal__team-name">${esc(homeName)}</div>
      </div>
      <div class="modal__score-num">${esc(homeScore)}</div>
      <div class="modal__vs">–</div>
      <div class="modal__score-num">${esc(awayScore)}</div>
      <div class="modal__team">
        ${awayFlag ? `<img src="${esc(awayFlag)}" alt=""/>` : `<div style="width:60px;height:42px;background:var(--bg-3);border-radius:6px;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;color:var(--text-3);">?</div>`}
        <div class="modal__team-name">${esc(awayName)}</div>
      </div>
    </div>
    <div class="modal__row"><span>${esc(t("kickoff"))}</span><b>${esc(formatKickoff(g.local_date, stadium, lang) || g.local_date || "")}</b></div>
    <div class="modal__row"><span>${esc(t("stadium_lbl"))}</span><b>${esc(stadiumName)}${stadium?.city_en ? ", " + esc(stadium.city_en) : ""}</b></div>
    <div class="modal__row"><span>${esc(t("stage_lbl"))}</span><b>${esc(stageLabel(g.type, t))}${g.group ? " · " + esc(`${t("group_name")} ${g.group}`) : ""}</b></div>
    <div class="modal__scorers">
      <h4>${esc(t("scorers"))}</h4>
      ${homeScorers.length || awayScorers.length ? `
        <div class="scorer-line"><b>${esc(homeName)}:</b> ${homeScorers.length ? homeScorers.map(s => esc(s)).join(", ") : esc(t("no_scorers"))}</div>
        <div class="scorer-line"><b>${esc(awayName)}:</b> ${awayScorers.length ? awayScorers.map(s => esc(s)).join(", ") : esc(t("no_scorers"))}</div>
      ` : `<div class="scorer-line">${esc(t("no_scorers"))}</div>`}
    </div>`;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}
export function closeMatchModal(modal) {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function stageLabel(type, t) {
  return ({
    group: t("stage_group"),
    r32: t("stage_r32"),
    r16: t("stage_r16"),
    qf: t("stage_qf"),
    sf: t("stage_sf"),
    third: t("stage_third"),
    final: t("stage_final"),
  })[type] || type;
}

/* ── Skeletons (shown while data loads) ──────────────── */
export function renderMatchSkeletons(grid) {
  grid.innerHTML = Array.from({ length: 6 })
    .map(() => `<div class="skeleton sk-match"></div>`).join("");
}
export function renderTeamSkeletons(grid) {
  grid.innerHTML = Array.from({ length: 8 })
    .map(() => `<div class="skeleton sk-team"></div>`).join("");
}
export function renderGroupSkeletons(grid) {
  grid.innerHTML = Array.from({ length: 6 })
    .map(() => `<div class="skeleton sk-group"></div>`).join("");
}
export function renderStadiumSkeletons(grid) {
  grid.innerHTML = Array.from({ length: 6 })
    .map(() => `<div class="skeleton sk-stadium"></div>`).join("");
}

/* ── Error with retry button ─────────────────────────── */
export function renderError(host, lang, onRetry) {
  const t = getT(lang);
  host.innerHTML = `<div class="error">${esc(t("error_load"))}<br/><button class="error__retry">${esc(t("retry"))}</button></div>`;
  const btn = host.querySelector(".error__retry");
  if (btn && onRetry) btn.addEventListener("click", onRetry);
}

/* ── Toast (share feedback) ──────────────────────────── */
let toastEl = null;
export function showToast(msg) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add("is-show");
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove("is-show"), 2500);
}

export { getT, toBnDigits, toLocalizedDigits, formatDateParts };
