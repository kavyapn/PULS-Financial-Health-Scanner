import { GOALS, normalizePlans } from "./branch.js";
import { FORECAST_WINDOWS, LIFE_CHANGES, normalizeLifeEvents } from "./growth.js";
import { normalizePriorities, PRIORITY_IDS } from "./priorities.js";

const PERSONAS = ["lena", "alex", "maya"];
const SESSION_VERSION = 7;
const PAYLOAD_LENGTHS = { 1: 7, 2: 8, 3: 9, 4: 10, 5: 10, 6: 11, 7: 12 };
const GOAL_IDS = Object.keys(GOALS);
const HORIZONS = ["soon", "year", "later", "unsure"];
const LIFETIME_SECONDS = 10 * 60;
const CLOCK_SKEW_SECONDS = 120;
const MAX_ACTIVITIES = 32;
const MAX_TOKEN_LENGTH = 4600;

function encodeVotes(votes) {
  return PRIORITY_IDS.map(id => (votes?.[id] ?? 0) + 1).join("");
}

function decodeVotes(value) {
  if (typeof value !== "string" || value.length !== PRIORITY_IDS.length || /[^012]/.test(value)) {
    throw new Error("The priority choices in this phone link could not be read.");
  }
  return normalizePriorities(Object.fromEntries(PRIORITY_IDS.map((id,index) => [id, Number(value[index]) - 1])));
}

function parseAddress(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Open the PULS demo at a web address to continue on your phone.");
  }
  return url;
}

function normalizeSession(session) {
  if (!session || !PERSONAS.includes(session.persona) ||
      !Number.isInteger(session.stage) || session.stage < 0 || session.stage > 3) {
    throw new Error("This demo session could not be read. Start a new scan on the terminal.");
  }

  const { persona, stage, scenario, stress, activity = [] } = session;
  const normalized = { persona, stage, priorities:normalizePriorities(session.priorities), activity: [] };
  const rawPlans = session.plans ?? (session.plan ? [session.plan] : []);
  const plans = normalizePlans(rawPlans);
  if (!Array.isArray(rawPlans) || plans.length !== rawPlans.length) {
    throw new Error("The life plans could not be read. Start a new scan on the terminal.");
  }
  if (plans.length) normalized.plans = plans;
  if (session.life != null) {
    const preset = LIFE_CHANGES.find(item => item.id === session.life.id);
    const amount = session.life.amount;
    if (!preset || !Number.isFinite(amount)) {
      throw new Error("The life-change simulation could not be read. Choose a preset on the terminal.");
    }
    normalized.life = { id: preset.id, amount: Math.min(preset.max, Math.max(preset.min, amount)) };
  }
  if (session.events != null) {
    const events = normalizeLifeEvents(session.events);
    if (!Array.isArray(session.events) || events.length !== session.events.length) {
      throw new Error("The planned life events could not be read.");
    }
    normalized.events = events;
  }
  if (FORECAST_WINDOWS.includes(session.forecastMonths)) normalized.forecastMonths = session.forecastMonths;
  if (typeof scenario === "number" && Number.isFinite(scenario)) {
    normalized.scenario = scenario;
  }
  if (typeof stress === "boolean") {
    normalized.stress = stress;
  }
  if (!Array.isArray(activity)) {
    throw new Error("This demo session could not be read. Start a new scan on the terminal.");
  }
  const recent = activity.slice(-MAX_ACTIVITIES);
  const opening = activity.find(item => item?.id === "scan-connected");
  if (opening && !recent.includes(opening)) recent.splice(0, 1, opening);
  for (const item of recent) {
    const time = new Date(item?.at).getTime();
    if (typeof item?.id !== "string" || !/^[a-z][a-z0-9-]{0,31}$/.test(item.id) ||
        !Number.isFinite(time) || time <= 0) {
      throw new Error("This demo session could not be read. Start a new scan on the terminal.");
    }
    const details = item.priorities ? {priorities:normalizePriorities(item.priorities)} : {};
    normalized.activity.push({ id: item.id, at: new Date(time).toISOString(), ...details });
  }
  return normalized;
}

function encode(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decode(token) {
  const binary = atob(token.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export function createHandoff(session, baseURL = globalThis.location.href) {
  const url = parseAddress(baseURL);
  const { persona, stage, scenario, stress, activity, plans, life, events, forecastMonths, priorities } = normalizeSession(session);
  const issuedAt = Math.floor(Date.now() / 1000);
  const token = encode([
    SESSION_VERSION, issuedAt, PERSONAS.indexOf(persona), stage, scenario ?? null, stress ?? null,
    activity.map(({ id, at, priorities }) => [id, Date.parse(at) - issuedAt * 1000, ...(priorities ? [encodeVotes(priorities)] : [])]),
    plans?.map(plan => [GOAL_IDS.indexOf(plan.goal), HORIZONS.indexOf(plan.horizon),
      plan.priorities.reduce((mask, item) => mask | (1 << item), 0), plan.preparedness]) ?? null,
    life ? [life.id, life.amount] : null,
    events?.map(event => [LIFE_CHANGES.findIndex(preset => preset.id === event.id), event.amount, event.month,
      ...(event.suggestion ? [event.suggestion] : [])]) ?? null,
    forecastMonths ?? null, encodeVotes(priorities)
  ]);
  if (token.length > MAX_TOKEN_LENGTH) {
    throw new Error("This demo session is too large for a phone link.");
  }
  url.search = "?mode=phone";
  url.hash = `resume=${token}`;
  return url.toString();
}

export function readHandoff(locationURL = globalThis.location.href) {
  const url = new URL(locationURL);
  const token = new URLSearchParams(url.hash.slice(1)).get("resume");
  if (token === null) return null;

  const errorMessage = "This phone link could not be read. Copy a new one in Services.";
  if (token.length > MAX_TOKEN_LENGTH || !/^[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error(errorMessage);
  }
  let payload;
  try {
    payload = decode(token);
  } catch {
    throw new Error(errorMessage);
  }
  if (!Array.isArray(payload) || !Number.isInteger(payload[0]) || payload.length !== PAYLOAD_LENGTHS[payload[0]]) {
    throw new Error(errorMessage);
  }

  const [version, issuedAt, persona, stage, scenario, stress, activity,
    planFields = null, lifeFields = null, eventFields = null, forecastMonths = null, votes = null] = payload;
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > now + CLOCK_SKEW_SECONDS ||
      !Number.isInteger(persona) || !Array.isArray(activity) || activity.length > MAX_ACTIVITIES) {
    throw new Error(errorMessage);
  }
  if (issuedAt + LIFETIME_SECONDS <= now) {
    throw new Error("This phone link expired. Copy a new one in Services.");
  }
  if (activity.some(item => !Array.isArray(item) || (item.length !== 2 && !(version >= 7 && item.length === 3)) ||
      !Number.isSafeInteger(item[1]) || item[1] < -issuedAt * 1000 ||
      item[1] > CLOCK_SKEW_SECONDS * 1000)) {
    throw new Error(errorMessage);
  }
  if (lifeFields !== null && (!Array.isArray(lifeFields) || lifeFields.length !== 2)) {
    throw new Error(errorMessage);
  }
  if (eventFields !== null && (!Array.isArray(eventFields) ||
      eventFields.some(item => !Array.isArray(item) || (item.length !== 3 && !(version >= 7 && item.length === 4)) || !Number.isInteger(item[0])))) {
    throw new Error(errorMessage);
  }
  let plans = [];
  if (planFields !== null && version < 5) {
    if (!Array.isArray(planFields) || planFields.length !== 4) throw new Error(errorMessage);
    const [goal, horizon, priority, preparedness] = planFields;
    plans = [{ goal, horizon, priority, preparedness }];
  } else if (planFields !== null) {
    if (!Array.isArray(planFields) || planFields.length > GOAL_IDS.length) throw new Error(errorMessage);
    plans = planFields.map(fields => {
      if (!Array.isArray(fields) || fields.length !== 4 || !fields.every(Number.isInteger)) throw new Error(errorMessage);
      const [goalIndex, horizonIndex, mask, preparedness] = fields;
      const goal = GOAL_IDS[goalIndex];
      const count = GOALS[goal]?.priority.length;
      if (!count || mask < 1 || mask >= (1 << count)) throw new Error(errorMessage);
      const priorities = Array.from({ length: count }, (_, i) => i).filter(i => mask & (1 << i));
      return { goal, horizon: HORIZONS[horizonIndex], priorities, preparedness };
    });
  }
  return normalizeSession({
    persona: PERSONAS[persona], stage, scenario, stress, plans, forecastMonths,
    priorities: votes === null ? {} : decodeVotes(votes),
    life: lifeFields === null ? null : { id: lifeFields[0], amount: lifeFields[1] },
    events: eventFields?.map(([index, amount, month, suggestion]) => ({ id: LIFE_CHANGES[index]?.id, amount, month, suggestion })),
    activity: activity.map(([id, offset, focus]) => ({ id, at: issuedAt * 1000 + offset,
      ...(focus === undefined ? {} : {priorities:decodeVotes(focus)}) }))
  });
}
