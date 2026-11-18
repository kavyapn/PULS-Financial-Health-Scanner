import { evidenceFor, PERSONAS, scoreProfile } from "./model.js";
import { lifeEventImpact, normalizeLifeEvents, projectedFunding } from "./growth.js";

function within(input, fallback, low, high) {
  return typeof input === "number" && Number.isFinite(input) ? Math.min(high,Math.max(low,input)) : fallback;
}

function average(values) {
  return values.length && values.every(Number.isFinite)
    ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function estimatedScore(data, completed, savings, path, income, essentials, discretionary, extraSaving = 0) {
  const surplus = [income, essentials, discretionary].every(Number.isFinite)
    ? Math.max(0, income - essentials - discretionary) : null;
  const months = savings.map(month => ({
    ...month, income, essentials, discretionary,
    saved: Number.isFinite(month.saved) && surplus !== null ? Math.min(month.saved + extraSaving, surplus) : null
  }));
  const cash = path.at(-1);
  return scoreProfile({ ...data, essentials, months }, completed, {
    cash: cash === null ? null : Math.max(0, cash),
    funding: projectedFunding(path, essentials),
    source: "Long-term what-if projection"
  });
}

export function projectLongTerm(data, completed, input = {}, assets = {}, events = []) {
  const retirement = input.goal === "retirement";
  const age = PERSONAS[data.id].age;
  const timeline = normalizeLifeEvents(events);
  const familyEvents = timeline.filter(event => ["parenthood","marriage"].includes(event.id) || event.suggestion?.startsWith("family:"));
  const firstFamilyMonth = Math.min(...familyEvents.map(event => event.month));
  const familyYears = Number.isFinite(firstFamilyMonth) ? Math.ceil(firstFamilyMonth / 12) : 10;
  const years = Math.round(within(input.years, retirement ? 67-age : familyYears, 1, 50));
  const cost = within(input.cost, retirement || familyEvents.length ? 0 : 10000,0,1e6);
  const monthly = within(input.monthly,retirement ? 1600 : familyEvents.length ? 0 : 500,0,20000);
  const annualReturn = within(input.annualReturn,0,-5,8);
  const {cash, savingsMonths} = evidenceFor(data,completed);
  const income = average(data.months.map(month => month.income));
  const essentials = average(data.months.map(month => month.essentials));
  const discretionary = average(data.months.map(month => month.discretionary));
  const spending = essentials === null || discretionary === null ? null : essentials + discretionary;
  const liquid = Number.isFinite(cash) ? cash + (assets.cash ?? 0) : null;
  const reserve = retirement ? data.depot?.total : 0;
  const starting = liquid !== null && Number.isFinite(reserve) ? liquid + reserve + (retirement ? assets.investment ?? 0 : 0) : null;
  const net = income !== null && spending !== null ? income-spending : null;
  const afterwards = retirement ? 10 : 3;
  const end = years+afterwards;
  const ticks = [...new Set([0,Math.round(years/3),Math.round(years*2/3),years,end])].sort((a,b)=>a-b);
  const monthlyReturn = Math.pow(1+annualReturn/100,1/12)-1;
  let baseline = starting, scenario = starting;
  let baselineCash = liquid, scenarioCash = liquid;
  const baselinePath = [baseline], scenarioPath = [scenario];
  const baselineCashPath = [liquid], scenarioCashPath = [liquid];
  const advance = (balance, flow, bill = 0) => balance === null || flow === null
    ? null : balance + Math.max(0, balance) * monthlyReturn + flow - bill;
  const add = (value, change) => value === null ? null : Math.max(0, value + change);
  let atGoal = null;
  let futureIncome, futureEssentials, futureDiscretionary, futureNet, extraSaving;
  for (let month=1; month<=end*12; month+=1) {
    const impact = lifeEventImpact(timeline, month);
    const afterGoal = month > years * 12;
    futureIncome = retirement && afterGoal ? monthly : add(income, impact.income - impact.incomeReduction);
    futureEssentials = add(essentials, impact.essentials + (!retirement && afterGoal ? monthly : 0));
    futureDiscretionary = add(discretionary, -impact.spendingReduction);
    extraSaving = impact.saving;
    futureNet = [futureIncome, futureEssentials, futureDiscretionary].every(Number.isFinite)
      ? futureIncome - futureEssentials - futureDiscretionary : null;
    const flow = futureNet === null ? null : futureNet + impact.payout - impact.cost;
    const bill = !retirement && month === years*12 ? cost : 0;
    baseline = advance(baseline, net);
    scenario = advance(scenario, flow, bill);
    baselineCash = advance(baselineCash, net);
    scenarioCash = advance(scenarioCash, flow, bill);
    baselineCashPath.push(baselineCash);
    scenarioCashPath.push(scenarioCash);
    if (month === years*12) atGoal = scenario;
    if (ticks.includes(month/12)) {
      baselinePath.push(baseline);
      scenarioPath.push(scenario);
    }
  }
  return {goal:retirement?"retirement":"family",years,cost,monthly,annualReturn, income,spending,net,futureNet,starting,afterwards,
    atGoal,final:scenario,baselinePath,scenarioPath,ticks, ageAtGoal:age+years, includedEvents:timeline.length,
    baselineScore: estimatedScore(data, completed, savingsMonths, baselineCashPath, income, essentials, discretionary),
    scenarioScore: estimatedScore(data, completed, savingsMonths, scenarioCashPath, futureIncome, futureEssentials, futureDiscretionary, extraSaving)
  };
}
