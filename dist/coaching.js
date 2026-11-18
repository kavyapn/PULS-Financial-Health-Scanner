import { evidenceFor, PERSONAS, scoreProfile } from "./model.js";
import { LESSONS, lessonsFor } from "./learning.js";
import { focusLabels } from "./priorities.js";
import { advisorSupport } from "./advisor.js";
import { cashAllocation } from "./cash-allocation.js";
import { describePlan } from "./branch.js";

const eur = n => new Intl.NumberFormat("en-IE", {style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
const scoreName = score => score.score ?? `${score.low}–${score.high}`;
const poses = ["hello","think","celebrate","reassure"];
const destinations = {
  fitness: {type:"fitness", label:"Open financial fitness"},
  cash: {type:"fitness", id:"cash", label:"See unallocated cash and inflation"},
  habits: {type:"behaviour", label:"See spending and savings"},
  portfolio: {type:"invest", label:"See portfolio allocation"},
  events: {type:"simulator", label:"Open the life-event forecast"},
  family: {type:"long-plan", id:"family", label:"Open the family forecast"},
  retirement: {type:"long-plan", id:"retirement", label:"Open the retirement forecast"},
  learning: {type:"learn", label:"Open your learning path"},
  videos: {type:"learn", id:"videos", label:"Browse educational videos"},
  progress: {type:"progress", label:"See score progress"},
  report: {type:"report", label:"Open score details"},
  priorities: {type:"priorities", label:"Personalize priorities"},
  assets: {type:"data", label:"Add data sources"},
  advisor: {type:"advisor", label:"Prepare a meeting brief"},
  ...Object.fromEntries(LESSONS.map(lesson => [lesson.id, {type:"lesson", id:lesson.id, label:lesson.title}]))
};

export const coachDestinationOptions = Object.entries(destinations).map(([id, action]) => [id, action.label]);
export const coachDestination = id => typeof id === "string" && Object.hasOwn(destinations, id) ? destinations[id] : null;
export const coachReaction = value => poses.includes(value) ? value : null;

function requestedDestination(question) {
  if (!/\b(open|show|go to|take me|link|find|where|read|watch)\b/.test(question)) return null;
  if (/\blesson\b/.test(question)) {
    const lesson = [
      [/cash|buffer/, "lesson-cash"], [/borrow|loan/, "lesson-borrowing"], [/diversi|portfolio|concentrat/, "lesson-diversification"],
      [/fraud|scam|suspicious/, "lesson-fraud"], [/payday|habit|saving/, "lesson-payday"],
      [/lean month|planning/, "lesson-plan-gap"], [/runway|entrepreneur/, "lesson-personal-runway"],
      [/network|support/, "lesson-support-network"], [/succession|handover/, "lesson-family-handover"], [/impact|giving/, "lesson-impact-goal"]
    ].find(([pattern]) => pattern.test(question));
    return lesson?.[1] ?? "learning";
  }
  return [
    [/retire|pension/, "retirement"], [/family forecast/, "family"], [/inflation|unallocated cash/, "cash"],
    [/invest|portfolio/, "portfolio"], [/spen|saving|habits/, "habits"], [/fitness/, "fitness"],
    [/priority|priorities|weights/, "priorities"], [/progress|history/, "progress"], [/score details|report/, "report"],
    [/video/, "videos"], [/learn|knowledge/, "learning"], [/event|simulator/, "events"]
  ].find(([pattern]) => pattern.test(question))?.[1] ?? null;
}

export function scoreBand(score) {
  if (score.score === null) return { id: "partial", label: "Incomplete" };
  if (score.score < 50) return { id: "attention", label: "Needs work" };
  return score.score >= 75 ? { id: "strong", label: "Strong" } : { id: "normal", label: "Normal" };
}

export function savingsMonthsMet(score) {
  const metric = score.dimensions.find(group => group.id === "behaviour")?.metrics.find(item => item.id === "saving-habit");
  return Number.isFinite(metric?.score) ? Math.round(metric.score * 3 / 100) : null;
}

export function weeklyAdvice(data, score, activity, options = {}) {
  const {plans = [], events = [], imports} = options;
  const completed = activity.map(item => typeof item === "string" ? item : item.id);
  const lesson = lessonsFor(data, score, activity).find(item => item.recommended);
  const monthsMet = savingsMonthsMet(score);
  const savings = { type: "behaviour", label: "Review your savings", text: monthsMet !== null
    ? `You met your savings target in ${monthsMet} of the last 3 months. Pick one amount you can repeat next payday.`
    : "Review the last three months of spending and choose a realistic target." };
  const goals = { type: "simulator", label: "Test a life event", text: "Compare what your cash could look like before and after a change." };
  const actions = lesson ? [{ type: "lesson", id: lesson.id, label: lesson.title, text: lesson.reason }, savings] : [savings, goals];
  const advisor = advisorSupport(data, plans, events);
  if (advisor.wealth) actions.push({type:"advisor", label:"Prepare a wealth conversation", text:advisor.reason});
  const cash = evidenceFor(data, completed).cash;
  const months = Number.isFinite(cash) && data.essentials > 0 ? (cash / data.essentials).toFixed(1) : null;
  const share = data.depot?.largestHolding?.share;
  const facts = [
    monthsMet === null ? null : `You met your savings target in ${monthsMet} of the last 3 months.`,
    months === null ? null : `Your recorded cash covers about ${months} months of essential costs.`,
    Number.isFinite(share) && data.depot?.total > 0 ? `Your largest issuer exposure is ${share}% of the portfolio.` : null,
    imports ? `You’ve added ${eur(imports.cash)} in accessible cash, ${eur(imports.investment)} in investments and ${eur(imports.other)} in other assets.` : null
  ].filter(Boolean);
  const highlight = lesson?.id === "lesson-cash" && months !== null ? `Your recorded cash covers about ${months} months of essential costs.`
    : advisor.wealth ? advisor.reason : facts[0];
  const summary = [highlight, actions[0].text].filter(Boolean).join(" ");
  const after = lesson?.canImproveScore ? scoreProfile(data, [...completed, lesson.id]) : null;
  const points = score.score !== null && after?.score != null ? Math.max(0, after.score - score.score) : 0;
  return {title:"This week with Pip", actions, summary, points, facts, advisor};
}

export function coachContext(data, score, activity, imports, {plans = [], events = [], advice = weeklyAdvice(data, score, activity, {plans,events,imports})} = {}) {
  const ids = activity.map(item => typeof item === "string" ? item : item.id);
  const last = data.months.at(-1);
  const cash = evidenceFor(data, ids).cash;
  const spending = last.essentials + last.discretionary;
  const allocation = cashAllocation(data, ids, plans, events, imports?.cash ?? 0);
  return {
    score: scoreName(score), coverage: score.coverage, age: PERSONAS[data.id].age, cash, essentials: data.essentials,
    income: last.income, spending, savings: last.saved, surplus: last.income - spending,
    depot: data.depot?.total ?? null,
    topSpending: [...data.spending].sort((a,b) => b.amount - a.amount).slice(0,3),
    dimensions: score.dimensions.map(group => ({
      label: group.label, score: scoreName(group),
      inputs: group.metrics.map(item => ({label:item.label, input:item.input, missing:item.missing}))
    })),
    savingsMonthsMet: savingsMonthsMet(score), suggestions: advice.actions,
    topicsEmphasized: focusLabels(data.priorities),
    topicsDeEmphasized: focusLabels(data.priorities, -1),
    plans:plans.map(describePlan), events, advisor:{reason:advice.advisor.reason, help:advice.advisor.help},
    unallocatedCash:allocation.unallocated,
    ...(allocation.demoSavings ? {demoSavingsIncludedInAllocation:allocation.demoSavings, totalCashForAllocation:allocation.available} : {}),
    ...(imports ? { additionalTotals: imports } : {})
  };
}

export function localCoach(question, context) {
  const q = question.toLowerCase();
  let answer;
  let action = context.suggestions[0];
  const requested = requestedDestination(q);
  if (requested) {
    action = coachDestination(requested);
    answer = `Choose “${action.label}” to go there.`;
  } else if (/^(hi|hello|hey|how are you)[!.?\s]*$/.test(q.trim())) {
    answer = "Hi, I’m Pip. Ask me about your score, spending, cash buffer, or a life event you’re planning.";
  } else if (/wealth manager|advis[oe]r|(?:book|schedule).*(?:meeting|call|appointment)/.test(q)) {
    answer = `${context.advisor.help} Open the meeting brief to review your goals and questions before arranging a conversation.`;
    action = {type:"advisor", label:"Prepare a meeting brief"};
  } else if (/import|added assets?|external|other bank|property|owned/.test(q)) {
    const assets = context.additionalTotals;
    answer = assets ? `Your added assets total ${eur(assets.cash + assets.investment + assets.other)}. That includes ${eur(assets.cash)} in accessible cash, ${eur(assets.investment)} in investments and ${eur(assets.other)} in other assets.`
      : "Use Add data sources to give Pip your asset totals.";
    action = { type:"data", label:"Open data sources" };
  } else if (/unallocated|idle cash|inflation|buying power/.test(q)) {
    answer = Number.isFinite(context.unallocatedCash)
      ? `You have ${eur(context.unallocatedCash)} after allowing for your reserve and near-term costs. Use the inflation estimate to see what that cash could buy over time.`
      : "Add the cash balance and essential costs so we can estimate your available cash and its buying power.";
    action = coachDestination("cash");
  } else if (/retire|pension|child|family|year|future/.test(q)) {
    answer = `Your latest recorded income minus spending was ${eur(context.surplus)}. Use a family or retirement forecast to see how different costs or income would affect you over time.`;
    action = coachDestination(/retire|pension/.test(q) ? "retirement" : "family");
  } else if (/portfolio|invest|diversi/.test(q)) {
    const exposure = context.dimensions[0].inputs.find(item => /exposure/i.test(item.label));
    answer = `Your sample portfolio value is ${context.depot === null ? "unavailable" : eur(context.depot)}. Largest issuer exposure: ${exposure?.input || "unavailable"}. You can review what drove the fitness score in your scan.`;
    action = { type:"fitness", label:"Review your portfolio exposure" };
  } else if (/debt|repay|loan/.test(q)) {
    const debt = context.dimensions[0].inputs.find(item => item.label === "Debt repayments");
    answer = debt?.missing ? "The scan is missing your required monthly debt repayments. That leaves a range in the financial fitness score."
      : `Your sample snapshot shows ${debt.input}. This factor measures how much of your take-home income is committed to debt repayments.`;
    action = { type:"fitness", label:"Review financial fitness" };
  } else if (/spen|expense|income|salary|budget/.test(q)) {
    const top = context.topSpending[0];
    answer = `Last recorded month: ${eur(context.income)} income and ${eur(context.spending)} spending. ${top ? `${top.label} was your largest category at ${eur(top.amount)}.` : ""}`;
    action = { type:"behaviour", label:"See spending analysis" };
  } else if (/cash|buffer|emergenc/.test(q)) {
    const months = context.essentials > 0 ? (context.cash / context.essentials).toFixed(1) : null;
    answer = `Your banking snapshot shows ${eur(context.cash)} in accessible cash. ${months ? `That covers about ${months} months of essential costs.` : ""} Try a one-off expense in the simulator to see what would happen.`;
    action = { type:"simulator", label:"Open the simulator" };
  } else if (/score|health|why/.test(q)) {
    const missing = context.dimensions.flatMap(group => group.inputs.filter(item => item.missing).map(item => item.label));
    answer = `Your PULS is ${context.score} out of 100. ${missing.length ? `The range reflects missing information about ${missing.join(", ")}.` : "It combines fitness, habits, knowledge and readiness."} ${action.text}`;
  } else answer = action.text;
  const destination = requested ?? Object.entries(destinations).find(([, route]) =>
    route.type === action?.type && route.id === action?.id)?.[0] ?? null;
  const reaction = /\b(thanks|thank you|celebrate)\b/.test(q) ? "celebrate"
    : /\b(worried|debt|shortfall|stress)\b/.test(q) ? "reassure" : "hello";
  return { answer, action, destination, reaction, source:"demo" };
}


export function mascot(expression = "hello") {
  const pose = coachReaction(expression) ?? "hello";
  return '<span class="pip pip-' + pose + '" aria-hidden="true"></span>';
}
