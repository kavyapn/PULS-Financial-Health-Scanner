import { evidenceFor, scoreProfile } from "./model.js";
import { normalizePriorities } from "./priorities.js";

const euro = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
});

export const LIFE_CHANGES = [
  {
    id: "income-drop", effect: "incomeReduction",
    label: "Reduced pay or career break",
    description: "Rehearse a drop in take-home pay or a lean period in your business.",
    amountLabel: "Monthly income reduction",
    defaultAmount: 1000, min: 0, max: 4000, step: 50
  },
  {
    id: "higher-expenses", effect: "essentials",
    label: "Move home or grow the family",
    description: "Add a recurring essential cost, such as higher rent or childcare.",
    amountLabel: "Extra essential costs each month",
    defaultAmount: 500, min: 0, max: 3000, step: 50
  },
  {
    id: "cut-spending", effect: "spendingReduction",
    label: "Reduce discretionary spending",
    description: "Put a lower monthly limit on flexible spending.",
    amountLabel: "Monthly spending reduction",
    defaultAmount: 200, min: 0, max: 1500, step: 25
  },
  {
    id: "save-regularly", effect: "saving",
    label: "Build a savings routine",
    description: "Aim to add the same amount to your recent savings pattern each month.",
    amountLabel: "Extra planned saving per month",
    defaultAmount: 150, min: 0, max: 1200, step: 25
  },
  {
    id: "one-off-cost", effect: "cost",
    label: "Pay a one-off bill",
    description: "Plan for a large purchase, repair, or unexpected expense.",
    amountLabel: "One-time expense",
    defaultAmount: 2500, min: 0, max: 12000, step: 100
  },
  {
    id: "cash-payout", effect: "payout",
    label: "Receive a cash payout",
    description: "Explore receiving a bonus or cash inheritance.",
    amountLabel: "One-time cash received",
    defaultAmount: 5000, min: 0, max: 50000, step: 500
  },
  {id:"university", label:"University", effect:"cost", amountLabel:"Study costs due that month",
    description:"Set aside a one-time amount for fees, equipment or a study deposit.", defaultAmount:1800, min:0, max:100000, step:100},
  {id:"first-salary", label:"First salary", effect:"income", amountLabel:"Extra take-home pay per month",
    description:"Enter the increase over the monthly take-home pay already in your baseline.", defaultAmount:450, min:0, max:20000, step:50},
  {id:"travel", label:"Travel", effect:"cost", amountLabel:"One-time travel cost",
    description:"Estimate the total cost you expect to pay for the trip.", defaultAmount:2000, min:0, max:100000, step:100},
  {id:"entrepreneurship", label:"Entrepreneurship", effect:"cost", amountLabel:"One-time contribution from personal cash",
    description:"Estimate how much household cash you plan to commit to the business.", defaultAmount:5000, min:0, max:250000, step:500},
  {id:"marriage", label:"Marriage", effect:"cost", amountLabel:"One-time wedding and setup costs",
    description:"Enter your share of the planned costs in the month they are due.", defaultAmount:8000, min:0, max:250000, step:500},
  {id:"parenthood", label:"Parenthood", effect:"essentials", amountLabel:"Extra essential costs per month",
    description:"Estimate recurring costs such as childcare. Add reduced pay separately to test leave.", defaultAmount:500, min:0, max:12000, step:50},
  {id:"inheritance", label:"Inheritance", effect:"payout", amountLabel:"Cash you expect to be able to use",
    description:"Use cash you expect to be accessible in the selected month.", defaultAmount:8500, min:0, max:10000000, step:500},
  {id:"family-succession", label:"Family business succession", effect:"cost", amountLabel:"One-time transition cost",
    description:"Estimate the household cash you need for the handover or ownership transition.", defaultAmount:10000, min:0, max:10000000, step:500}
];

const eventPresets = new Map(LIFE_CHANGES.map(item => [item.id,item]));
export const oneTimeEvent = preset => preset.effect === "cost" || preset.effect === "payout";
export const MAX_LIFE_EVENTS = 16;
export const FORECAST_WINDOWS = [3, 6, 12, 24, 60, 120];
export const MAX_EVENT_MONTH = FORECAST_WINDOWS.at(-1);
export const HISTORY_RANGES = [
  { id: "week", label: "Weekly", title: "Weekly score" },
  { id: "month", label: "Monthly", title: "Monthly score", offsets: [5, 4, 3, 2, 1, 0] },
  { id: "year", label: "1 year", title: "Score over 1 year", offsets: [12, 9, 6, 3, 0] },
  { id: "five", label: "5 years", title: "Score over 5 years", offsets: [60, 48, 36, 24, 12, 0] }
];

export function normalizeLifeEvents(events) {
  if (!Array.isArray(events)) return [];
  return events.slice(0, MAX_LIFE_EVENTS).flatMap(event => {
    const preset = eventPresets.get(event?.id);
    if (!preset || !Number.isFinite(event.amount) ||
        !Number.isInteger(event.month) || event.month < 1 || event.month > MAX_EVENT_MONTH) return [];
    const suggestion = typeof event.suggestion === "string" && /^[a-z]+:[a-z-]+$/.test(event.suggestion) ? event.suggestion : null;
    return [{ id: preset.id, amount: amountFor(preset, event.amount), month: event.month, ...(suggestion ? {suggestion} : {}) }];
  });
}

export function lifeEventImpact(events, month) {
  const impact = {income:0,incomeReduction:0,essentials:0,spendingReduction:0,saving:0,cost:0,payout:0};
  for (const event of events) {
    const preset = eventPresets.get(event.id);
    if (oneTimeEvent(preset) ? event.month === month : event.month <= month) impact[preset.effect] += event.amount;
  }
  return impact;
}

export function projectedFunding(path, essentials) {
  if (path.length < 2 || !(essentials > 0) || !path.every(Number.isFinite)) return null;
  const cushion = Math.min(...path.slice(1)) / essentials;
  return 50 + 50 * cushion / (1 + Math.abs(cushion));
}

function metricChanges(before, after) {
  const prior = new Map(before.dimensions.flatMap(group =>
    group.metrics.map(metric => [metric.id, metric.contribution])
  ));
  return after.dimensions.flatMap(group => group.metrics.flatMap(metric => {
    const from = prior.get(metric.id);
    const to = metric.contribution;
    if (from === to) return [];
    const delta = from === null || to === null ? null : to - from;
    return [{ id: metric.id, label: metric.label, dimension: group.label, from, to, delta }];
  }));
}

export function scoreHistory(data, activity = []) {
  const events = activity
    .filter(event => typeof event?.id === "string" && Number.isFinite(Date.parse(event.at)))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const firstScan = events.find(event => event.id === "scan-connected");
  const at = firstScan?.at ?? events[0]?.at ?? (Number.isFinite(Date.parse(data.asOf)) ? data.asOf : null);
  let priorities = normalizePriorities(firstScan?.priorities ?? data.priorities);
  let previous = scoreProfile({ ...data, priorities });
  const points = [{ at, id: "baseline", score: previous, changes: [] }];
  const completed = new Set();
  for (const event of events) {
    if (event.id === "scan-connected" || completed.has(event.id)) continue;
    if (at && Date.parse(event.at) < Date.parse(at)) continue;
    if (event.id === "priorities-updated") priorities = normalizePriorities(event.priorities);
    else completed.add(event.id);
    const score = scoreProfile({ ...data, priorities }, [...completed]);
    const changes = metricChanges(previous, score);
    if (changes.length || event.id === "rescan-reviewed" || event.id === "priorities-updated") {
      points.push({ at: event.at, id: event.id, score, changes });
    }
    previous = score;
  }
  return points;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function weekOf(date) {
  const utc = new Date(date);
  if (Number.isNaN(utc.getTime())) return null;
  utc.setUTCHours(0, 0, 0, 0);
  utc.setUTCDate(utc.getUTCDate() - (utc.getUTCDay() + 6) % 7);
  return utc.getTime();
}

export function weeklyScores(data, activity = []) {
  const weeks = new Map();
  for (const sample of data.weeklyScores ?? []) {
    const week = weekOf(sample.date);
    if (week === null || !Number.isFinite(sample.low) || !Number.isFinite(sample.high)) continue;
    weeks.set(week, { low: sample.low, high: sample.high });
  }
  const baselineWeek = weekOf(data.asOf);
  const history = scoreHistory(data, activity);
  if (baselineWeek !== null) {
    weeks.set(baselineWeek, { low: history[0].score.low, high: history[0].score.high });
  }
  for (const point of history) {
    const week = point.at ? weekOf(point.at) : baselineWeek;
    if (week !== null) weeks.set(week, { low: point.score.low, high: point.score.high });
  }
  if (!weeks.size) return [];
  const latest = Math.max(...weeks.keys());
  return Array.from({ length: 6 }, (_, index) => {
    const week = latest - (5 - index) * WEEK_MS;
    return { week: new Date(week).toISOString(), ...weeks.get(week) };
  });
}

export function scoreTrend(data, activity, requestedRange) {
  const range = HISTORY_RANGES.find(item => item.id === requestedRange) ?? HISTORY_RANGES[0];
  if (!range.offsets) return { range, points: weeklyScores(data, activity) };
  const observations = [
    ...(data.weeklyScores ?? []),
    ...scoreHistory(data, activity).map(({ at, score }) => ({ date: at, low: score.low, high: score.high }))
  ].filter(item => item.date && Number.isFinite(Date.parse(item.date)) && Number.isFinite(item.low) && Number.isFinite(item.high))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  if (!observations.length) return { range, points: [] };
  const first = observations[0];
  const end = new Date(observations.at(-1).date);
  const points = range.offsets.map(offset => {
    const date = offset === 0 ? end : new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - offset + 1, 0, 23, 59, 59));
    const sample = observations.findLast(item => Date.parse(item.date) <= date.getTime());
    if (sample) return { date: date.toISOString(), low: sample.low, high: sample.high };
    const earlierMonths = (Date.parse(first.date) - date.getTime()) / (30.44 * 86400000);
    const gap = Math.min(15, Math.max(1, Math.round(earlierMonths * .26)));
    return { date: date.toISOString(), low: Math.max(0, first.low - gap), high: Math.max(0, first.high - gap), illustrative: true };
  });
  return { range, points };
}

function amountFor(preset, input) {
  const amount = Number.isFinite(input) ? input : preset.defaultAmount;
  return Math.min(preset.max, Math.max(preset.min, amount));
}

function applyDelta(value, delta) {
  return Number.isFinite(value) ? Math.max(0, value + delta) : null;
}

function project(data, completed, events, horizon) {
  const { cash: startingCash, savingsMonths } = evidenceFor(data, completed);
  const hasBankingWindow = data.months.length === 3;
  let balance = hasBankingWindow && Number.isFinite(startingCash) ? startingCash : null;
  const path = [balance];

  const months = Array.from({ length: horizon }, (_, index) => {
    const referenceIndex = index % 3;
    const month = hasBankingWindow ? data.months[referenceIndex] : {};
    const monthNumber = index + 1;
    const impact = lifeEventImpact(events, monthNumber);
    const regularIncome = applyDelta(month.income, impact.income - impact.incomeReduction);
    const income = applyDelta(regularIncome, impact.payout);
    const essentials = applyDelta(month.essentials, impact.essentials);
    const regularSpending = applyDelta(month.discretionary, -impact.spendingReduction);
    const discretionary = applyDelta(regularSpending, impact.cost);
    const net = [income, essentials, discretionary].every(Number.isFinite)
      ? income - essentials - discretionary
      : null;
    const savingsReference = savingsMonths[referenceIndex];
    const savingPlan = applyDelta(savingsReference?.saved, impact.saving);
    const saved = Number.isFinite(net) && Number.isFinite(savingPlan)
      ? Math.min(savingPlan, Math.max(0, net))
      : null;

    let onTime = month.onTime === false ? false : null;
    if (month.onTime === true && [balance, income, essentials].every(Number.isFinite)) {
      onTime = balance + income >= essentials;
    }
    balance = Number.isFinite(balance) && Number.isFinite(net) ? balance + net : null;
    path.push(balance);
    return {
      ...month, label: "Month " + (index + 1), income, essentials, discretionary,
      saved, savingsTarget: savingsReference?.savingsTarget, onTime
    };
  });

  const monthlyCost = lifeEventImpact(events, horizon).essentials;
  const essentials = applyDelta(data.essentials, monthlyCost);
  const liquidCash = Number.isFinite(balance) ? Math.max(0, balance) : null;
  const scoringMonths = months.slice(-3);
  const score = scoreProfile({ ...data, months: scoringMonths, essentials }, completed, {
    cash: liquidCash, funding: projectedFunding(path, essentials), source: `What-if projection · ${horizon} months`
  });
  return { balance, essentials, months: scoringMonths, score, path };
}

function average(months, measure) {
  if (months.length !== 3) return null;
  const values = months.map(measure);
  return values.every(Number.isFinite) ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function formatMoney(value) {
  return Number.isFinite(value) ? euro.format(value) : "Missing";
}

function formatCash(balance) {
  return Number.isFinite(balance) && balance < 0
    ? euro.format(-balance) + " shortfall"
    : formatMoney(balance);
}

function monthlySpending(month) {
  return [month.essentials, month.discretionary].every(Number.isFinite)
    ? month.essentials + month.discretionary
    : null;
}

function savingMonths(months) {
  if (months.length !== 3 || !months.every(month => Number.isFinite(month.saved) && month.savingsTarget > 0)) {
    return "Missing";
  }
  return months.filter(month => month.saved >= month.savingsTarget).length + " of 3";
}

export function simulateLifeEvents(data, completed = [], events = [], requestedHorizon = 3) {
  const timeline = normalizeLifeEvents(events);
  const lastMonth = Math.max(1, ...timeline.map(event => event.month));
  const minimumHorizon = FORECAST_WINDOWS.find(window => window >= lastMonth);
  const horizon = FORECAST_WINDOWS.includes(requestedHorizon) && requestedHorizon >= minimumHorizon
    ? requestedHorizon : minimumHorizon;
  const current = scoreProfile(data, completed);
  const reference = project(data, completed, [], horizon);
  const changed = project(data, completed, timeline, horizon);
  const inputs = [
    { label: "Average monthly income", before: formatMoney(average(reference.months, month => month.income)), after: formatMoney(average(changed.months, month => month.income)) },
    { label: "Recurring monthly essentials", before: formatMoney(reference.essentials), after: formatMoney(changed.essentials) },
    { label: "Average monthly spending", before: formatMoney(average(reference.months, monthlySpending)), after: formatMoney(average(changed.months, monthlySpending)) },
    { label: "Months meeting savings targets", before: savingMonths(reference.months), after: savingMonths(changed.months) },
    { label: "End-of-period cash", before: formatCash(reference.balance), after: formatCash(changed.balance) }
  ];
  return {
    timeline, horizon, minimumHorizon, current, reference: reference.score, projected: changed.score,
    baselineCash: reference.path, scenarioCash: changed.path,
    changes: metricChanges(current, changed.score),
    eventChanges: metricChanges(reference.score, changed.score),
    inputs,
    assumptions: [
      "Both paths start with today’s accessible cash and repeat your latest three months of income and spending in today’s euros.",
      "Monthly events apply from the selected month onwards. One-time costs and payouts apply in their selected month.",
      "Monthly surplus stays in accessible cash. Savings follow the latest recorded pattern and are limited by that month’s available surplus.",
      "Estimated PULS uses cash and spending at the end of the forecast. Projected funding readiness responds to the lowest projected cash balance."
    ]
  };
}

export function simulateLifeChange(data, completed = [], presetId, input) {
  const preset = LIFE_CHANGES.find(option => option.id === presetId) ?? LIFE_CHANGES[0];
  const amount = amountFor(preset, input);
  return { preset, amount, ...simulateLifeEvents(data, completed, [{ id: preset.id, amount, month: 1 }]) };
}
