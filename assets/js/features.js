/* assets/js/features.js
   Knockout bracket, team profile, top scorers, head-to-head, match timeline.
   Pure rendering — takes state + language → DOM strings. */

import { getT, toLocalizedDigits, teamNameLocal, stadiumNameLocal, formatDateParts } from "./i18n.js?v=6";
import { matchStatus, parseScorers } from "./api.js";
import { teamFlag } from "./render.js?v=8";
import { formatMatchTime, parseMatchDateToInstant, timeZoneLabel, getMatchSourceTimeZone } from "./timezone.js?v=7";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

/* ── 1. Knockout Bracket ──────────────────────────────── */
export function renderBracket(grid, matches, idx, lang) {
  const t = getT(lang);
  const knockout = (matches || []).filter(m =>
    ["r32", "r16", "qf", "sf", "third", "final"].includes(m.type));
  if (!knockout.length) { grid.innerHTML = `<div class="loading">${esc(t("loading"))}</div>`; return; }

  const byStage = {};
  for (const m of knockout) {
    if (!byStage[m.type]) byStage[m.type] = [];
    byStage[m.type].push(m);
  }

  const stageOrder = ["r32", "r16", "qf", "sf", "third", "final"];
  const stageLabels = {
    r32: t("stage_r32"), r16: t("stage_r16"), qf: t("stage_qf"),
    sf: t("stage_sf"), third: t("stage_third"), final: t("stage_final")
  };

  let html = '<div class="bracket">';
  for (const stage of stageOrder) {
    const games = byStage[stage] || [];
    if (!games.length) continue;
    html += `<div class="bracket__round"><div class="bracket__round-label">${esc(stageLabels[stage])}</div>`;
    html += '<div class="bracket__matches">';
    for (const g of games) {
      const status = matchStatus(g);
      const home = idx.get(String(g.home_team_id));
      const away = idx.get(String(g.away_team_id));
      const isTBDHome = String(g.home_team_id) === "0";
      const isTBDAway = String(g.away_team_id) === "0";
      const hn = isTBDHome ? (g.home_team_label || t("tbd")) : teamNameLocal(home, lang);
      const an = isTBDAway ? (g.away_team_label || t("tbd")) : teamNameLocal(away, lang);
      const hf = isTBDHome ? "" : teamFlag(home);
      const af = isTBDAway ? "" : teamFlag(away);
      const hs = status !== "upcoming" ? g.home_score : "–";
      const as = status !== "upcoming" ? g.away_score : "–";
      const winHome = status === "finished" && parseInt(g.home_score) > parseInt(g.away_score);
      const winAway = status === "finished" && parseInt(g.away_score) > parseInt(g.home_score);

      html += `<div class="bracket__match" data-mid="${esc(g.id)}" tabindex="0" role="button">
        <div class="bracket__team ${winHome ? "is-winner" : ""}">
          ${hf ? `<img src="${esc(hf)}" alt="" loading="lazy"/>` : `<span class="bkt-flag is-tbd"></span>`}
          <span>${esc(hn)}</span><span class="bracket__score">${esc(toLocalizedDigits(hs, lang))}</span>
        </div>
        <div class="bracket__team ${winAway ? "is-winner" : ""}">
          ${af ? `<img src="${esc(af)}" alt="" loading="lazy"/>` : `<span class="bkt-flag is-tbd"></span>`}
          <span>${esc(an)}</span><span class="bracket__score">${esc(toLocalizedDigits(as, lang))}</span>
        </div>`;
      if (stage !== "final") {
        html += '<div class="bracket__connector"></div>';
      }
      html += '</div>';
    }
    html += '</div></div>';
  }
  html += '</div>';
  grid.innerHTML = html;
}

/* ── 2. Team Profile ──────────────────────────────────── */
export function renderTeamProfile(host, team, matches, sIdx, idx, lang) {
  const t = getT(lang);
  if (!team) { host.innerHTML = ""; return; }

  const name = teamNameLocal(team, lang);
  const flag = teamFlag(team);
  const teamMatches = (matches || []).filter(m =>
    String(m.home_team_id) === String(team.id) || String(m.away_team_id) === String(team.id));

  // Stats
  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  const finished = teamMatches.filter(m => matchStatus(m) === "finished");
  for (const m of finished) {
    const isHome = String(m.home_team_id) === String(team.id);
    const sc = parseInt(isHome ? m.home_score : m.away_score);
    const scOpp = parseInt(isHome ? m.away_score : m.home_score);
    gf += sc; ga += scOpp;
    if (sc > scOpp) w++;
    else if (sc === scOpp) d++;
    else l++;
  }

  // Form (last 5 matches)
  const recentFinished = [...finished].sort((a, b) => {
    const sa = sIdx.get(String(a.stadium_id));
    const sb = sIdx.get(String(b.stadium_id));
    return (parseMatchDateToInstant(b.local_date, sb)?.getTime() || 0) -
           (parseMatchDateToInstant(a.local_date, sa)?.getTime() || 0);
  }).slice(0, 5);
  const formChars = recentFinished.map(m => {
    const isHome = String(m.home_team_id) === String(team.id);
    const sc = parseInt(isHome ? m.home_score : m.away_score);
    const scOpp = parseInt(isHome ? m.away_score : m.home_score);
    return sc > scOpp ? "W" : sc === scOpp ? "D" : "L";
  });

  // All matches sorted
  const sortedMatches = [...teamMatches].sort((a, b) => {
    const sa = sIdx.get(String(a.stadium_id));
    const sb = sIdx.get(String(b.stadium_id));
    return (parseMatchDateToInstant(a.local_date, sa)?.getTime() || 0) -
           (parseMatchDateToInstant(b.local_date, sb)?.getTime() || 0);
  });

  host.innerHTML = `
    <div class="team-profile">
      <div class="team-profile__head">
        ${flag ? `<img src="${esc(flag)}" alt="${esc(name)}" class="team-profile__flag"/>` : ""}
        <div>
          <h2 class="team-profile__name">${esc(name)}</h2>
          <div class="team-profile__meta">
            <span>${esc(t("team_fifa_code"))}: ${esc(team.fifa_code || "")}</span>
            <span>${esc(t("team_group"))}: ${esc(team.groups || "")}</span>
          </div>
        </div>
      </div>
      <div class="team-profile__stats">
        <div class="tp-stat"><span>${esc(t("team_matches"))}</span><b>${finished.length}</b></div>
        <div class="tp-stat"><span>${esc(t("team_wins"))}</span><b>${w}</b></div>
        <div class="tp-stat"><span>${esc(t("team_draws"))}</span><b>${d}</b></div>
        <div class="tp-stat"><span>${esc(t("team_losses"))}</span><b>${l}</b></div>
        <div class="tp-stat"><span>${esc(t("team_gf"))}</span><b>${gf}</b></div>
        <div class="tp-stat"><span>${esc(t("team_ga"))}</span><b>${ga}</b></div>
      </div>
      ${formChars.length ? `<div class="team-profile__form">
        <span>${esc(t("team_form"))}:</span>
        ${formChars.map(c => `<span class="form-dot form-${c.toLowerCase()}">${c}</span>`).join("")}
      </div>` : ""}
      <h3>${esc(t("team_matches"))}</h3>
      <div class="team-profile__matches">
        ${sortedMatches.map(m => {
          const status = matchStatus(m);
          const isHome = String(m.home_team_id) === String(team.id);
          const oppId = isHome ? m.away_team_id : m.home_team_id;
          const opp = idx.get(String(oppId));
          const oppName = String(oppId) === "0" ? (isHome ? m.away_team_label : m.home_team_label) || t("tbd") : teamNameLocal(opp, lang);
          const oppFlag = String(oppId) === "0" ? "" : teamFlag(opp);
          const sc = isHome ? `${m.home_score}–${m.away_score}` : `${m.away_score}–${m.home_score}`;
          const resultClass = status === "finished" ? (
            (isHome && parseInt(m.home_score) > parseInt(m.away_score)) || (!isHome && parseInt(m.away_score) > parseInt(m.home_score))
            ? "tp-win" : (m.home_score === m.away_score ? "tp-draw" : "tp-loss")
          ) : "";
          const stadium = sIdx.get(String(m.stadium_id));
          const kickoff = formatKickoffLocal(m.local_date, stadium, lang);
          return `<div class="tp-match ${resultClass}" data-mid="${esc(m.id)}" tabindex="0" role="button">
            <span class="tp-match__stage">${esc(stageLabel(m.type, t) + (m.group ? " " + m.group : ""))}</span>
            <span class="tp-match__opp">${oppFlag ? `<img src="${esc(oppFlag)}" alt="" loading="lazy"/>` : ""} ${esc(oppName)}</span>
            <span class="tp-match__score">${status === "upcoming" ? "" : sc}</span>
            <span class="tp-match__date">${esc(kickoff)}</span>
          </div>`;
        }).join("")}
      </div>
    </div>`;
}

function stageLabel(type, t) {
  return ({ group: t("stage_group"), r32: t("stage_r32"), r16: t("stage_r16"),
    qf: t("stage_qf"), sf: t("stage_sf"), third: t("stage_third"), final: t("stage_final") })[type] || type;
}

function formatKickoffLocal(localDate, stadium, lang) {
  const converted = formatMatchTime(localDate, stadium);
  if (!converted || !converted.instant) return localDate || "";
  return formatDateParts(converted.instant, lang,
    timeZoneLabel(converted.targetTimeZone, lang), converted.targetTimeZone);
}

/* ── 3. Top Scorers ───────────────────────────────────── */
export function renderTopScorers(grid, matches, idx, lang) {
  const t = getT(lang);
  if (!matches?.length) { grid.innerHTML = `<div class="loading">${esc(t("loading"))}</div>`; return; }

  const playerMap = new Map();
  for (const m of matches) {
    const home = idx.get(String(m.home_team_id));
    const away = idx.get(String(m.away_team_id));
    const homeName = home ? teamNameLocal(home, lang) : (m.home_team_label || "TBD");
    const awayName = away ? teamNameLocal(away, lang) : (m.away_team_label || "TBD");
    const homeFlag = home ? teamFlag(home) : "";
    const awayFlag = away ? teamFlag(away) : "";

    for (const scorer of parseScorers(m.home_scorers)) {
      const name = scorer.replace(/\s+\d+.*$/, "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!playerMap.has(key)) playerMap.set(key, { name, goals: 0, team: homeName, flag: homeFlag });
      playerMap.get(key).goals++;
    }
    for (const scorer of parseScorers(m.away_scorers)) {
      const name = scorer.replace(/\s+\d+.*$/, "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!playerMap.has(key)) playerMap.set(key, { name, goals: 0, team: awayName, flag: awayFlag });
      playerMap.get(key).goals++;
    }
  }

  const players = [...playerMap.values()].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
  if (!players.length) {
    grid.innerHTML = `<div class="loading">${esc(t("no_scorers"))}</div>`;
    return;
  }

  // Show top 10, but include ties at the cutoff
  const top = [];
  const maxShow = 10;
  for (let i = 0; i < players.length; i++) {
    if (i < maxShow) { top.push(players[i]); continue; }
    if (players[i].goals === players[maxShow - 1].goals) top.push(players[i]);
    else break;
  }

  grid.innerHTML = `
    <table class="table scorers-table">
      <thead><tr>
        <th>#</th><th>${esc(t("scorers_player"))}</th><th>${esc(t("scorers_team"))}</th><th>${esc(t("scorers_goals"))}</th>
      </tr></thead>
      <tbody>${top.map((p, i) => `
        <tr class="${i < 3 ? "sc-top" + (i + 1) : ""}">
          <td class="sc-rank">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : toLocalizedDigits(i + 1, lang)}</td>
          <td><b>${esc(p.name)}</b></td>
          <td>${p.flag ? `<img src="${esc(p.flag)}" alt="" loading="lazy" style="width:20px;vertical-align:middle;margin-right:4px"/>` : ""}${esc(p.team)}</td>
          <td class="pts"><b>${esc(toLocalizedDigits(p.goals, lang))}</b></td>
        </tr>`).join("")}</tbody>
    </table>`;
}

/* ── 4. Head to Head ──────────────────────────────────── */
export function renderH2H(host, team1, team2, matches, sIdx, lang) {
  const t = getT(lang);
  if (!team1 || !team2) {
    host.innerHTML = `<div class="loading">${esc(t("h2h_select_teams"))}</div>`;
    return;
  }

  const name1 = teamNameLocal(team1, lang);
  const name2 = teamNameLocal(team2, lang);
  const flag1 = teamFlag(team1);
  const flag2 = teamFlag(team2);

  const h2hMatches = (matches || []).filter(m =>
    (String(m.home_team_id) === String(team1.id) && String(m.away_team_id) === String(team2.id)) ||
    (String(m.home_team_id) === String(team2.id) && String(m.away_team_id) === String(team1.id))
  );

  let w1 = 0, w2 = 0, dr = 0, gf1 = 0, gf2 = 0;
  for (const m of h2hMatches) {
    if (matchStatus(m) !== "finished") continue;
    const t1IsHome = String(m.home_team_id) === String(team1.id);
    const sc1 = parseInt(t1IsHome ? m.home_score : m.away_score);
    const sc2 = parseInt(t1IsHome ? m.away_score : m.home_score);
    gf1 += sc1; gf2 += sc2;
    if (sc1 > sc2) w1++;
    else if (sc2 > sc1) w2++;
    else dr++;
  }

  host.innerHTML = `
    <div class="h2h">
      <div class="h2h__teams">
        <div class="h2h__team">
          ${flag1 ? `<img src="${esc(flag1)}" alt=""/>` : ""}
          <span>${esc(name1)}</span>
        </div>
        <span class="h2h__vs">${esc(t("h2h_vs"))}</span>
        <div class="h2h__team">
          ${flag2 ? `<img src="${esc(flag2)}" alt=""/>` : ""}
          <span>${esc(name2)}</span>
        </div>
      </div>
      <div class="h2h__stats">
        <div class="h2h__stat"><b>${w1}</b> ${esc(t("team_wins"))}</div>
        <div class="h2h__stat"><b>${dr}</b> ${esc(t("team_draws"))}</div>
        <div class="h2h__stat"><b>${w2}</b> ${esc(t("team_wins"))}</div>
      </div>
      ${h2hMatches.length ? `<h3>${esc(t("h2h_previous"))}</h3>
      <div class="h2h__matches">
        ${h2hMatches.sort((a, b) => {
          const sa = team1 ? null : null; // sort by date
          return (parseMatchDateToInstant(b.local_date, null)?.getTime() || 0) -
                 (parseMatchDateToInstant(a.local_date, null)?.getTime() || 0);
        }).map(m => {
          const status = matchStatus(m);
          const t1IsHome = String(m.home_team_id) === String(team1.id);
          const sc = t1IsHome ? `${m.home_score}–${m.away_score}` : `${m.away_score}–${m.home_score}`;
          return `<div class="h2h__match">
            <span>${esc(stageLabel(m.type, t))}</span>
            <span><b>${esc(sc)}</b></span>
            <span>${esc(formatKickoffLocal(m.local_date, null, lang))}</span>
          </div>`;
        }).join("")}
      </div>` : `<p>${esc(t("h2h_no_history"))}</p>`}
    </div>`;
}

/* ── 5. Match Timeline ────────────────────────────────── */
export function renderTimeline(host, game, idx, lang) {
  const t = getT(lang);
  if (!game) { host.innerHTML = ""; return; }

  const home = idx.get(String(game.home_team_id));
  const away = idx.get(String(game.away_team_id));
  const isTBDHome = String(game.home_team_id) === "0";
  const isTBDAway = String(game.away_team_id) === "0";
  const hn = isTBDHome ? (game.home_team_label || t("tbd")) : teamNameLocal(home, lang);
  const an = isTBDAway ? (game.away_team_label || t("tbd")) : teamNameLocal(away, lang);

  const events = [];
  for (const s of parseScorers(game.home_scorers)) {
    const m = s.match(/(.+?)\s+(\d+.*)$/);
    const player = m ? m[1].trim() : s.replace(/\s+\d+.*$/, "").trim();
    const minute = m ? m[2] : "";
    events.push({ type: "goal", team: "home", player, minute, name: hn });
  }
  for (const s of parseScorers(game.away_scorers)) {
    const m = s.match(/(.+?)\s+(\d+.*)$/);
    const player = m ? m[1].trim() : s.replace(/\s+\d+.*$/, "").trim();
    const minute = m ? m[2] : "";
    events.push({ type: "goal", team: "away", player, minute, name: an });
  }

  const status = matchStatus(game);
  const elapsed = (game.time_elapsed || "").toUpperCase();
  const hasHF = elapsed.includes("HT") || elapsed.includes("45") || parseInt(elapsed) > 45;
  const hasFT = elapsed === "FT" || elapsed === "finished" || game.finished === "TRUE";

  const timeMarkers = [];
  if (hasFT) timeMarkers.push({ time: "FT", label: t("status_ft") });
  else if (hasHF) timeMarkers.push({ time: "HT", label: "Half Time" });
  if (status === "live") timeMarkers.unshift({ time: "0", label: "Kick-off" });

  events.sort((a, b) => {
    const am = parseInt(a.minute) || 0;
    const bm = parseInt(b.minute) || 0;
    return am - bm;
  });

  host.innerHTML = `
    <h4>${esc(t("timeline_title"))}${status === "live" ? ` · <span style="color:var(--accent-2)">${esc(elapsed)}</span>` : ""}</h4>
    ${events.length ? `<div class="timeline">
      ${[/* kickoff */].concat(events).map((ev, i) => ev.type ? `
        <div class="timeline__event timeline__event--${ev.team}">
          <span class="timeline__min">${esc(ev.minute)}′</span>
          <span class="timeline__icon">⚽</span>
          <span class="timeline__desc"><b>${esc(ev.player)}</b> (${esc(ev.name)})</span>
        </div>` : "").join("")}
    </div>` : `<p>${esc(t("timeline_no_events"))}</p>`}
    ${status === "live" ? `<div class="timeline__live-dot">● ${esc(elapsed)}</div>` : ""}`;
}
