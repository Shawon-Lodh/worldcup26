/* assets/js/api.js
   Fetches from the public API endpoints (no auth required for /get/*).
   - small in-memory cache (TTL from server, fallback 20s)
   - graceful failure with last-good data
   - small helper to detect "live" matches
*/

const BASE = "https://worldcup26.ir";

const cache = new Map();
const TTL_DEFAULT = 20000;
let inflight = new Map();

async function getJSON(path, opts = {}) {
  const now = Date.now();
  const hit = cache.get(path);
  // Live polls bypass the cache so fresh live-score data always comes through.
  if (!opts.bypassCache && hit && now - hit.t < hit.ttl) return hit.data;

  const pending = inflight.get(path);
  if (pending) return pending;

  const pr = (async () => {
    const res = await fetch(BASE + path, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const ttl = ttlFromHeaders(res.headers) || TTL_DEFAULT;
    // Use a fresh timestamp so the TTL measures from response, not request start.
    cache.set(path, { data, ttl, t: Date.now() });
    return data;
  })().catch(err => {
    // Fallback to stale cache if present so a transient network blip doesn't blank the UI.
    if (hit) { return hit.data; }
    throw err;
  }).finally(() => {
    inflight.delete(path);
  });

  inflight.set(path, pr);
  return pr;
}

function ttlFromHeaders(h) {
  // public Cache-Control can hint a refresh interval; otherwise leave to defaults.
  const cc = h.get("Cache-Control") || "";
  const m = /max-age=(\d+)/i.exec(cc);
  if (m) return Math.min(parseInt(m[1], 10) * 1000, TTL_DEFAULT * 3); // cap 60s
  return null;
}

export async function fetchMatches() { return (await getJSON("/get/games")).games || []; }
export async function fetchTeams()  { return (await getJSON("/get/teams")).teams || []; }
export async function fetchGroups() { return (await getJSON("/get/groups")).groups || []; }
export async function fetchStadiums(){ return (await getJSON("/get/stadiums")).stadiums || []; }

// Live-poll variants: always bypass the in-memory cache so live scores refresh.
export async function fetchMatchesLive() { return (await getJSON("/get/games", { bypassCache: true })).games || []; }
export async function fetchGroupsLive()  { return (await getJSON("/get/groups", { bypassCache: true })).groups || []; }

export async function fetchAll() {
  const [matches, teams, stadiums] = await Promise.all([
    fetchMatches(), fetchTeams(), fetchStadiums()
  ]);
  // groups endpoint progresses separately, but kept in same batch for first load
  let groups = [];
  try { groups = await fetchGroups(); } catch { /* non-fatal */ }
  return { matches, teams, stadiums, groups };
}

/* ── Helpers ───────────────────────────────────────────── */
export function matchStatus(g) {
  const elapsed = (g.time_elapsed || "").toLowerCase();
  if (g.finished === "TRUE" || elapsed === "finished") return "finished";
  if (elapsed === "notstarted" || elapsed === "") return "upcoming";
  return "live"; // includes "1H", "HT", "2H", "FT" but reported TRUE handled above
}

export function stageName(type) {
  return ({
    group: "Group", r32: "Round of 32", r16: "Round of 16",
    qf: "Quarterfinals", sf: "Semifinals", third: "3rd Place", final: "Final"
  })[type] || type;
}

export function parseScorers(s) {
  if (!s || s === "null") return [];
  // stored like: "{ \"Nestory Irankunda 27'\", \"C. Metcalfe 75'\" }"
  try {
    if (typeof s === "string" && s.trim().startsWith("{")) {
      const inner = s.trim().slice(1, -1);
      return inner.split(",").map(x => x.trim().replace(/^"|"$/g, "")).filter(Boolean);
    }
    if (Array.isArray(s)) return s;
  } catch {}
  const m = String(s).match(/"([^"]+)"/g);
  return m ? m.map(x => x.replace(/"/g, "")) : [];
}