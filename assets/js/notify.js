/* assets/js/notify.js
   Browser push notifications for live match events (goals, match start, etc.).
   Detects score changes during polling and sends desktop alerts. */

import { matchStatus, parseScorers } from "./api.js";

let lastScores = new Map();
let lastScorers = new Map();
let enabled = false;

export function isNotifySupported() {
  return "Notification" in window;
}

export function getNotifyState() {
  if (!isNotifySupported()) return "unsupported";
  const perm = Notification.permission;
  if (perm === "denied") return "denied";
  if (enabled && perm === "granted") return "enabled";
  return "disabled";
}

export async function toggleNotifications() {
  if (!isNotifySupported()) return false;
  const perm = Notification.permission;

  if (enabled) {
    enabled = false;
    return false;
  }

  if (perm === "granted") {
    enabled = true;
    return true;
  }

  if (perm === "denied") {
    enabled = false;
    return false; // user must change in browser settings
  }

  // perm === "default" — ask for permission
  const result = await Notification.requestPermission();
  enabled = result === "granted";
  return enabled;
}

export function detectChanges(matches, idx, lang) {
  if (!enabled || Notification.permission !== "granted" || !isNotifySupported()) return;

  for (const g of matches || []) {
    if (matchStatus(g) !== "live") continue;
    const mid = String(g.id);
    const prevScore = lastScores.get(mid) || "";
    const prevScorers = lastScorers.get(mid) || "";
    const curScore = `${g.home_score}-${g.away_score}`;
    const curScorers = [...parseScorers(g.home_scorers), ...parseScorers(g.away_scorers)].join(",");

    if (prevScore && curScore !== prevScore) {
      const homeTeam = idx.get(String(g.home_team_id));
      const awayTeam = idx.get(String(g.away_team_id));
      const hn = homeTeam?.name_en || g.home_team_label || "Home";
      const an = awayTeam?.name_en || g.away_team_label || "Away";

      let body = `${hn} ${g.home_score}–${g.away_score} ${an}`;
      const newScorers = getNewScorers(prevScorers, curScorers);
      if (newScorers) body += ` · ${newScorers}`;

      try {
        new Notification("⚽ World Cup 2026 — Goal!", {
          body,
          icon: "/assets/icons/icon-192.png",
          tag: mid,
          requireInteraction: false,
          badge: "/assets/icons/icon-192.png",
        });
      } catch {}
    }

    lastScores.set(mid, curScore);
    lastScorers.set(mid, curScorers);
  }
}

function getNewScorers(prev, cur) {
  const prevList = (prev || "").split(",").filter(Boolean);
  const curList = (cur || "").split(",").filter(Boolean);
  const newOnes = curList.filter(s => !prevList.includes(s));
  if (!newOnes.length) return null;
  return newOnes.map(s => s.replace(/\s+\d+.*$/, "").trim()).join(", ") + " scored";
}

export function resetScores() {
  lastScores = new Map();
  lastScorers = new Map();
}
