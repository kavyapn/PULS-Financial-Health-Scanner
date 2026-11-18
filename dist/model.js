import { ATTITUDE_ITEMS, KNOWLEDGE_ITEMS, questionPoints } from "./measurement.js";
import { scoreWeights } from "./priorities.js";

export const PLAN_ACTIONS = ["scenario-reviewed", "family-forecast-saved", "retirement-forecast-saved"];

export const PERSONAS = {
  lena: {
    id: "lena",
    name: "Lena",
    age: 24,
    event: "First salary",
    headline: "Build a cash buffer",
    description: "A regular paycheck, little cash set aside, and an irregular savings habit.",
    icon: "wallet",
    goal: "Cover one month of essential costs"
  },
  alex: {
    id: "alex",
    name: "Alex",
    age: 29,
    event: "Starting a business",
    headline: "Plan for variable income",
    description: "Client payments vary, and some personal and business money sits in the same account.",
    icon: "briefcase-business",
    goal: "Fund six months of personal essentials"
  },
  maya: {
    id: "maya",
    name: "Maya",
    age: 31,
    event: "Receiving an inheritance",
    headline: "Understand inherited assets",
    description: "An inherited portfolio brings new decisions about liquidity and investment risk.",
    icon: "landmark",
    goal: "Meet estate costs while keeping a cash reserve"
  }
};

const money = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
});
const decimal = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 1 });
const monthLabels = ["Now", "Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6"];
const euro = value => money.format(value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const skills = ["cash", "diversification", "borrowing"];
const startingSkillOrder = {
  lena: ["diversification", "borrowing", "cash"],
  alex: ["diversification", "borrowing", "cash"],
  maya: ["borrowing", "cash", "diversification"]
};
const questSkills = { "lena-quiz": "cash", "alex-quiz": "cash", "maya-quiz": "diversification" };
const followUpSavings = {
  lena: [175, 200],
  alex: [200, 240],
  maya: [500, 500]
};
const followUpDate = "2027-01-02";

export async function getBankingData(id, options) {
  if (!Object.hasOwn(PERSONAS, id)) throw new Error("Choose a demo persona.");
  const endpoint = new URL(`./api/banking/${id}.json`, import.meta.url);
  const response = await fetch(endpoint, options);
  if (!response.ok) throw new Error("The demo bank could not load this profile. Please try again.");
  const data = await response.json();
  if (data.id !== id || !Array.isArray(data.months)) {
    throw new Error("The demo bank returned an unexpected profile. Please try again.");
  }
  return data;
}

const missions = {
  lena: [
    {
      id: "lena-quiz",
      title: "Spot the safer cash buffer",
      description: "Practice deciding where emergency money belongs.",
      xp: 20,
      action: "Check my answer",
      question: "Which matters most for money you may need for an urgent bill?",
      choices: ["It is easy to access and its value is stable.", "Its price can rise quickly.", "It has a long lock-in period."],
      correct: 0,
      evidence: "Passed a fresh question on liquidity and capital stability."
    },
    {
      id: "lena-plan",
      title: "Make a payday plan",
      description: "Review last month's spending and record a €175 savings target for the next payday.",
      xp: 30,
      action: "Record payday plan",
      evidence: "Recorded a spending review and dated savings plan for the next payday."
    },
    {
      id: "lena-save",
      title: "Verify your first deposit",
      description: "Load a sample next-payday statement showing €175 of new income saved.",
      xp: 40,
      action: "Load sample deposit",
      evidence: "A sample bank statement confirms €175 added from the next paycheck."
    }
  ],
  alex: [
    {
      id: "alex-quiz",
      title: "Find your personal cash",
      description: "Identify what you can actually use for household expenses.",
      xp: 20,
      action: "Check my answer",
      question: "What belongs in your personal cash runway?",
      choices: ["Every euro in the business account.", "Accessible personal cash and confirmed personal draws.", "Invoices you expect to issue later this year."],
      correct: 1,
      evidence: "Passed a fresh question on distinguishing business funds from personal cash."
    },
    {
      id: "alex-separate",
      title: "Separate personal and business money",
      description: "Load a sample reconciliation identifying €1,500 of personal funds in the mixed account.",
      xp: 30,
      action: "Load sample reconciliation",
      evidence: "A sample reconciliation identifies €1,500 as personal cash. The rest is reserved for the business."
    },
    {
      id: "alex-plan",
      title: "Write a lean-month plan",
      description: "Record a conservative personal draw, a fallback for a delayed payment, and a date to review the plan.",
      xp: 40,
      action: "Record fallback plan",
      evidence: "Documented a personal draw, a fallback, and a review date."
    }
  ],
  maya: [
    {
      id: "maya-quiz",
      title: "Check your diversification knowledge",
      description: "Learn what a large exposure to one company means for your inherited portfolio.",
      xp: 20,
      action: "Check my answer",
      question: "If 60% of your depot is exposed to one company, what is the main risk?",
      choices: ["All of your assets become inaccessible.", "The other holdings always offset that risk.", "One company's performance can drive much of your portfolio's result."],
      correct: 2,
      evidence: "Passed a fresh question on single-company concentration."
    },
    {
      id: "maya-map",
      title: "Map when inherited cash is available",
      description: "Load a sample estate schedule with a documented €8,500 cash distribution in month 2.",
      xp: 30,
      action: "Load sample estate schedule",
      evidence: "Recorded a sample €8,500 cash distribution for month 2 and dated a review of upcoming costs."
    },
    {
      id: "maya-protection",
      title: "Fill the missing protection review",
      description: "Load a sample review covering income interruption, dependants and a dated next step.",
      xp: 40,
      action: "Load sample protection review",
      evidence: "A sample review records the client's protection needs and next review date."
    }
  ]
};

export function missionsFor(data) {
  return missions[data.id] ?? [];
}

export function habitStatementFor(data) {
  const amounts = followUpSavings[data.id];
  const latest = data.months.at(-1);
  if (!amounts || latest?.month !== "2026-10" || !(latest.savingsTarget > 0)) return null;

  const target = data.id === "lena" ? 175 : latest.savingsTarget;
  const months = [
    { month: "2026-11", label: "Nov", saved: amounts[0], savingsTarget: target },
    { month: "2026-12", label: "Dec", saved: amounts[1], savingsTarget: target }
  ];
  return {
    id: "habit-statement",
    title: "Verify your savings routine",
    description: "Review a sample follow-up statement covering two later months of saving.",
    action: "Load sample savings follow-up",
    evidence: `A sample statement confirms ${euro(amounts[0])} saved in November and ${euro(amounts[1])} in December, both meeting the recorded target of ${euro(target)}.`,
    asOf: followUpDate,
    months
  };
}

export function evidenceFor(data, completed = []) {
  const done = new Set(missionsFor(data).map(mission => mission.id).filter(id => completed.includes(id)));
  const next = {
    cash: data.cash,
    literacyCorrect: data.literacy?.correct ?? null,
    reviewedSpending: data.reviewedSpending,
    savingsMonths: data.months,
    funding: data.plans?.funding ?? null,
    protection: data.plans?.protection ?? null,
    distribution: 0,
    updates: new Set()
  };
  function update(key, value) {
    next[key] = value;
    next.updates.add(key);
  }
  const learned = literacySkills(data, completed);
  if (learned && learned.length > next.literacyCorrect) {
    update("literacyCorrect", learned.length);
  }
  if (done.has("lena-plan")) {
    update("reviewedSpending", true);
    update("funding", 100);
  }
  if (done.has("lena-save") && Number.isFinite(data.cash)) update("cash", data.cash + 175);
  if (done.has("alex-separate")) {
    update("reviewedSpending", true);
    if (Number.isFinite(data.cash) && Number.isFinite(data.event.personalReclassification)) {
      update("cash", data.cash + data.event.personalReclassification);
    }
  }
  if (done.has("alex-plan")) update("funding", 100);
  if (done.has("maya-map")) {
    update("funding", 100);
    update("distribution", data.event.distribution);
  }
  if (done.has("maya-protection")) update("protection", 100);
  const savedForecast = completed.includes("family-forecast-saved") || completed.includes("retirement-forecast-saved");
  const planCredit = savedForecast ? 75 : completed.includes("scenario-reviewed") ? 50 : null;
  if (planCredit !== null && (next.funding ?? 0) < planCredit) update("funding", planCredit);
  if (completed.includes("habit-statement")) {
    const statement = habitStatementFor(data);
    if (statement) update("savingsMonths", [...data.months, ...statement.months].slice(-3));
  }
  return next;
}

export function literacySkills(data, completed = []) {
  const { correct, total } = data.literacy ?? {};
  if (!Number.isInteger(correct) || total !== skills.length || correct < 0 || correct > total) return null;

  const mastered = new Set((startingSkillOrder[data.id] ?? skills).slice(0, correct));
  const done = new Set(completed);
  const questId = `${data.id}-quiz`;
  if (done.has(questId) && Object.hasOwn(questSkills, questId)) mastered.add(questSkills[questId]);
  for (const skill of skills) {
    if (done.has(`lesson-${skill}`)) mastered.add(skill);
  }
  return [...mastered];
}

function metric(id, label, weight, score, input, source, rule) {
  const known = Number.isFinite(score);
  return {
    id,
    label,
    weight,
    input: known ? input : "Missing",
    source,
    rule,
    score: known ? score : null,
    contribution: known ? score * weight / 100 : null,
    missing: !known
  };
}

function dimension(id, label, inputs, weight) {
  const baseWeight = inputs.reduce((total, item) => total + item.weight, 0);
  const missingWeight = inputs.filter(item => item.missing).reduce((total, item) => total + item.weight, 0);
  const earned = inputs.reduce((total, item) => total + (item.contribution ?? 0), 0);
  const metrics = inputs.map(item => ({
    ...item,
    weight: item.weight * weight / baseWeight,
    contribution: item.missing ? null : item.contribution * weight / baseWeight
  }));
  return {
    id,
    label,
    weight,
    score: missingWeight ? null : Math.round(100 * earned / baseWeight),
    coverage: Math.round(100 * (baseWeight - missingWeight) / baseWeight),
    low: Math.round(100 * earned / baseWeight),
    high: Math.round(100 * (earned + missingWeight) / baseWeight),
    metrics
  };
}

function shareOfMonths(months, hasValue, meetsCondition) {
  if (months.length !== 3 || !months.every(hasValue)) return null;
  return months.filter(meetsCondition).length;
}

function planInput(score) {
  return {
    0: "No plan recorded",
    50: "Need identified",
    75: "Dated forecast saved",
    100: "Dated next step recorded"
  }[score];
}

function recentAverage(months, valueFor) {
  const values = months.map(valueFor);
  return values.length === 3 && values.every(Number.isFinite)
    ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function scoreProfile(data, completed = [], projection) {
  const evidence = evidenceFor(data, completed);
  const snapshotSource = `Mock banking API · ${data.asOf}`;
  const apiSource = projection ? projection.source ?? "Three-month what-if projection" : snapshotSource;
  const sourceFor = (key, baseline) => evidence.updates.has(key) ? "Completed demo action" : baseline;
  const cash = projection ? projection.cash : evidence.cash;
  const weights = scoreWeights(data.priorities);
  const projectedFunding = projection && Object.hasOwn(projection, "funding");
  const funding = projectedFunding ? projection.funding : evidence.funding;
  const reserveMonths = Number.isFinite(cash) && data.essentials > 0
    ? cash / data.essentials
    : null;
  const positiveMonths = shareOfMonths(
    data.months,
    month => [month.income, month.essentials, month.discretionary].every(Number.isFinite),
    month => month.income >= month.essentials + month.discretionary
  );
  const averageIncome = recentAverage(data.months, month => month.income);
  const averageSpending = recentAverage(data.months, month => [month.essentials, month.discretionary].every(Number.isFinite)
    ? month.essentials + month.discretionary : null);
  const headroom = averageIncome > 0 && averageSpending !== null ? (averageIncome - averageSpending) / averageIncome : null;
  const debtPayments = data.debt?.monthlyPayments;
  const debtShare = averageIncome > 0 && Number.isFinite(debtPayments) && debtPayments >= 0 ? debtPayments / averageIncome : null;
  const onTimeMonths = shareOfMonths(
    data.months,
    month => typeof month.onTime === "boolean",
    month => month.onTime
  );
  const savingsWindow = projection ? data.months : evidence.savingsMonths;
  const savingsMonths = shareOfMonths(
    savingsWindow,
    month => Number.isFinite(month.saved) && month.savingsTarget > 0,
    month => month.saved >= month.savingsTarget
  );
  const largestShare = data.depot?.total === 0 ? 0 : data.depot?.largestHolding?.share;
  const concentration = Number.isFinite(largestShare)
    ? clamp((60 - largestShare) / 50, 0, 1) * 100
    : null;
  const literacyTotal = data.literacy?.total;
  const literacy = Number.isFinite(evidence.literacyCorrect) && literacyTotal > 0
    ? evidence.literacyCorrect / literacyTotal * 100
    : null;
  const conceptPoints = questionPoints(KNOWLEDGE_ITEMS, data.capability?.knowledge);
  const attitudePoints = questionPoints(ATTITUDE_ITEMS, data.capability?.attitudes);

  const dimensions = [
    dimension("fitness", "Financial fitness", [
      metric("buffer", "Cash buffer", 11, reserveMonths === null ? null : clamp(reserveMonths / 3, 0, 1) * 100,
        `${euro(cash)} cash ÷ ${euro(data.essentials)} monthly essentials = ${decimal.format(reserveMonths)} months`,
        projection ? apiSource : sourceFor("cash", apiSource), "Three months of essentials earns full points. Partial coverage earns points proportionally."),
      metric("cash-flow", "Non-negative cash flow", 5, positiveMonths === null ? null : positiveMonths / 3 * 100,
        `${positiveMonths} of 3 months with income covering spending`,
        apiSource, "Share of three months with income at least equal to spending, before transfers to savings."),
      metric("headroom", "Monthly budget headroom", 5, headroom === null ? null : clamp(headroom / .20, 0, 1) * 100,
        `${euro(averageIncome - averageSpending)} left per month on average, ${decimal.format(headroom * 100)}% of take-home income`,
        apiSource, "Average take-home income minus essential and discretionary costs over three months. The demo scale gives full points at 20% and zero at 0% or below."),
      metric("debt-share", "Debt repayments", 4, debtShare === null ? null : clamp((.4 - debtShare) / .3, 0, 1) * 100,
        `${euro(debtPayments)} in required monthly repayments, ${decimal.format(debtShare * 100)}% of average take-home income`,
        Number.isFinite(debtPayments) ? apiSource : "Required monthly repayments unavailable",
        "The demo scale gives full points up to 10% of income and zero at 40% or more. Missing repayment amounts leave this factor open."),
      metric("on-time", "Essential payments on time", 5, onTimeMonths === null ? null : onTimeMonths / 3 * 100,
        `${onTimeMonths} of 3 months`, apiSource, "Share of three months with every required payment on time."),
      metric("concentration", "Single-company exposure", 5, concentration,
        data.depot?.total === 0 ? "No invested holdings" : `${largestShare}% in ${data.depot?.largestHolding?.label}`,
        snapshotSource, "Full points at 10% or below and zero at 60% or above, with a linear scale in between. Uses sample issuer exposure including through funds.")
    ], weights.fitness),
    dimension("behaviour", "Financial behaviour", [
      metric("saving-habit", "Followed a savings routine", 12, savingsMonths === null ? null : savingsMonths / 3 * 100,
        `${savingsMonths} of 3 months met a planned saving target · ${savingsWindow.map(month => month.label).join(", ")}`,
        !projection && evidence.updates.has("savingsMonths") ? `Sample savings statement · ${followUpDate}` : apiSource,
        "Share of three months when saving met the month's target."),
      metric("reviewed", "Reviewed spending", 8, typeof evidence.reviewedSpending === "boolean" ? Number(evidence.reviewedSpending) * 100 : null,
        evidence.reviewedSpending ? "Review recorded" : "Review due", sourceFor("reviewedSpending", "Demo questionnaire"),
        "Full points for a spending review in the assessment period.")
    ], weights.behaviour),
    dimension("literacy", "Knowledge", [
      metric("knowledge", "Practical knowledge check", 16, literacy, `${evidence.literacyCorrect} of ${literacyTotal} questions correct`,
        sourceFor("literacyCorrect", "Demo knowledge check"), "Share of three practical skills demonstrated. A passed check adds credit for each newly demonstrated skill."),
      metric("concepts", "Core financial concepts", 4, conceptPoints === null ? null : conceptPoints / KNOWLEDGE_ITEMS.length * 100,
        `${conceptPoints} of ${KNOWLEDGE_ITEMS.length} points`, "Sample answers · OECD/INFE 2026 adapted questions",
        "One point per correct concept. The compound-interest question also requires a correct simple-interest answer.")
    ], weights.literacy),
    dimension("readiness", "Future readiness", [
      metric("funding-plan", "Funding plan", 11, funding, projectedFunding ? `${Math.round(funding)} / 100 funding resilience` : planInput(funding),
        projectedFunding ? apiSource : sourceFor("funding", "Demo questionnaire"),
        projectedFunding ? "50 at break-even. The lowest balance relative to monthly essentials moves this toward 100 for a cushion or toward 0 for a shortfall."
          : "50 for a saved rehearsal or identified need, 75 for a saved dated forecast and 100 for a recorded next step."),
      metric("protection", "Protection review", 10, evidence.protection, planInput(evidence.protection),
        sourceFor("protection", evidence.protection === null ? "Review status unavailable" : "Demo questionnaire"),
        "0 for no review, 50 for an identified need, 100 for a dated next step. A review records the plan and its next review date."),
      metric("attitudes", "Long-term planning attitudes", 4, attitudePoints === null ? null : attitudePoints / ATTITUDE_ITEMS.length * 100,
        `${attitudePoints} of ${ATTITUDE_ITEMS.length} responses indicate a long-term focus`,
        "Sample self-report · OECD/INFE 2026 adapted questions", "Share of the four responses that reflect a longer-term orientation.")
    ], weights.readiness)
  ];
  const metrics = dimensions.flatMap(group => group.metrics);
  const missing = metrics.filter(item => item.missing);
  const missingWeight = missing.reduce((total, item) => total + item.weight, 0);
  const earned = metrics.reduce((total, item) => total + (item.contribution ?? 0), 0);
  return {
    score: missing.length ? null : Math.round(earned),
    coverage: Math.round(100 - missingWeight),
    low: Math.round(earned),
    high: Math.round(earned + missingWeight),
    dimensions,
    missing
  };
}

function scenarioValue(input, min, max, defaultValue) {
  return Number.isFinite(input) ? clamp(input, min, max) : defaultValue;
}

function lenaScenario(data, evidence, input, stress) {
  const min = 0;
  const max = 350;
  const defaultValue = 175;
  const value = scenarioValue(input, min, max, defaultValue);
  const shock = stress ? 400 : 0;
  const balances = monthLabels.map((_, month) => evidence.cash + value * month - (month >= 2 ? shock : 0));
  const firstSustainedMonth = balances.reduce((firstMonth, balance, month) =>
    balance < data.essentials ? month + 1 : firstMonth, 0);
  const observedRoom = Math.floor(data.months.reduce(
    (total, month) => total + month.income - month.essentials - month.discretionary, 0
  ) / data.months.length);
  return {
    title: "Build a one-month buffer",
    label: "Set aside each month",
    min, max, step: 25, defaultValue, unit: "€", value,
    stressLabel: "Add a €400 surprise expense in month 2",
    headline: firstSustainedMonth === 0 ? "One month covered today" : firstSustainedMonth < balances.length
      ? `One month covered by month ${firstSustainedMonth}`
      : `${euro(data.essentials - balances.at(-1))} short after six months`,
    detail: "The projection applies the same savings amount to each of the next six months.",
    checks: [
      { label: "Monthly target fits the average recent surplus", met: value <= observedRoom },
      { label: "Payday plan recorded", met: evidence.updates.has("funding") },
      { label: "First sample deposit verified", met: evidence.updates.has("cash") }
    ],
    stats: [
      { label: "Cash today", value: euro(evidence.cash) },
      { label: "Recent monthly surplus", value: euro(observedRoom) },
      { label: "Projected cash in month 6", value: euro(balances.at(-1)) }
    ],
    chart: { labels: monthLabels, values: balances, target: data.essentials, targetLabel: "One month of essentials" }
  };
}

function alexScenario(data, evidence, input, stress) {
  const min = 0;
  const max = 2400;
  const defaultValue = 1000;
  const value = scenarioValue(input, min, max, defaultValue);
  const balances = monthLabels.map((_, month) => {
    const paidMonths = month - (stress && month >= 2 ? 1 : 0);
    return evidence.cash + value * paidMonths - data.essentials * month;
  });
  const minimumBalance = Math.min(...balances);
  const unallocated = data.event.mixedBalance - (evidence.updates.has("cash") ? data.event.personalReclassification : 0);
  return {
    title: "Rehearse a lean business month",
    label: "Personal income available each month",
    min, max, step: 100, defaultValue, unit: "€", value,
    stressLabel: "Skip your personal draw in month 2",
    headline: minimumBalance < 0 ? `${euro(-minimumBalance)} maximum cash shortfall` : "Personal essentials funded for six months",
    detail: "The scenario uses verified personal cash and models essential household costs for six months.",
    checks: [
      { label: "Personal portion of the mixed account documented", met: evidence.updates.has("cash") },
      { label: "Personal essentials covered throughout the scenario", met: minimumBalance >= 0 },
      { label: "Fallback for a delayed payment documented", met: evidence.updates.has("funding") }
    ],
    stats: [
      { label: "Verified personal cash", value: euro(evidence.cash) },
      { label: "Mixed funds outside the forecast", value: euro(unallocated) },
      { label: "Projected cash in month 6", value: euro(balances.at(-1)) }
    ],
    chart: { labels: monthLabels, values: balances, target: 0, targetLabel: "Cash runs out" }
  };
}

function mayaScenario(data, evidence, input, stress) {
  const min = 4000;
  const max = 16000;
  const defaultValue = 8500;
  const value = scenarioValue(input, min, max, defaultValue);
  const settlementCost = value + (stress ? 2500 : 0);
  const reserveTarget = 3 * data.essentials;
  const balances = monthLabels.map((_, month) => evidence.cash
    + (month >= 2 ? evidence.distribution : 0)
    - (month >= 3 ? settlementCost : 0));
  const lowestBalance = Math.min(...balances);
  return {
    title: "Plan for inheritance costs",
    label: "One-off costs in month 3",
    min, max, step: 500, defaultValue, unit: "€", value,
    stressLabel: "Add €2,500 in unexpected costs",
    headline: lowestBalance >= reserveTarget ? "Cash reserve stays intact"
      : lowestBalance < 0 ? `${euro(-lowestBalance)} cash shortfall`
        : `${euro(reserveTarget - lowestBalance)} below your reserve target`,
    detail: "This projection isolates one-off inheritance cash flows. Ongoing personal income and spending are held flat.",
    checks: [
      { label: "Cash distribution date and amount documented", met: evidence.updates.has("distribution") },
      { label: "Three-month reserve covered throughout the scenario", met: lowestBalance >= reserveTarget },
      { label: "Protection review recorded", met: evidence.protection === 100 }
    ],
    stats: [
      { label: "Liquid personal cash", value: euro(evidence.cash) },
      { label: "Documented distribution in month 2", value: evidence.distribution ? euro(evidence.distribution) : "Unconfirmed" },
      { label: "Projected cash after costs", value: euro(balances.at(-1)) }
    ],
    chart: { labels: monthLabels, values: balances, target: reserveTarget, targetLabel: "Three-month reserve" }
  };
}

const scenarios = { lena: lenaScenario, alex: alexScenario, maya: mayaScenario };

export function scenarioFor(data, completed = [], sliderValue, stress = false) {
  return scenarios[data.id](data, evidenceFor(data, completed), sliderValue, stress);
}
