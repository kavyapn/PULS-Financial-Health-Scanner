import { evidenceFor } from "./model.js";
import { lifeEventImpact, normalizeLifeEvents } from "./growth.js";

export function cashAllocation(data, completed, plans, events, addedCash = 0) {
  const { cash } = evidenceFor(data, completed);
  const demoSavings = Number.isFinite(data.demoSavings) ? data.demoSavings : 0;
  const available = Number.isFinite(cash) ? cash + demoSavings + addedCash : null;
  const reserveMonths = plans.some(plan => plan.goal === "buffer" && plan.priorities.includes(1)) ? 3 : 1;
  const reserve = Number.isFinite(data.essentials) ? reserveMonths * data.essentials : null;
  const scheduled = normalizeLifeEvents(events);
  const costs = [1, 2, 3].reduce((total, month) => total + lifeEventImpact(scheduled, month).cost, 0);
  const unallocated = available === null || reserve === null ? null : Math.max(0, available - reserve - costs);
  return {available, addedCash, demoSavings, reserveMonths, reserve, costs, unallocated};
}

export function realCashValue(cash, rate, years) {
  return Number.isFinite(cash) ? cash / Math.pow(1 + rate / 100, years) : null;
}
