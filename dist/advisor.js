export const DB_BOOKING = "https://www.deutsche-bank.de/opra4/pfb/advisor-appointments/";
const DB_WEALTH_CONTACT = "https://www.deutsche-bank.de/pk/dialog/wealth-management/contact-form-wealth.html";
const DB_WEALTH_SERVICES = "https://www.deutsche-bank.de/vk/wealth-management/unsere-dienstleistungen.html";
const DB_SUCCESSION = "https://wealth.db.com/en/what-we-do/bank-for-entrepreneurs/business-lifecycle-exiting-stage.html";

export function advisorSupport(data, plans = [], events = []) {
  const goals = new Set(plans.map(plan => plan.goal));
  const eventIds = new Set(events.map(event => event.id));
  const share = data.depot?.largestHolding?.share;
  let topic;
  if (goals.has("succession") || eventIds.has("family-succession")) topic = {
    reason:"A family business handover brings together ownership, cash needs and family decisions.",
    help:"A wealth manager can help coordinate succession planning with your family and independent advisors.",
    agenda:["Which ownership and decision rights will change at the handover?", "How much liquidity should the family keep available through the transition?"],
    services:DB_SUCCESSION
  };
  else if (goals.has("inheritance") || eventIds.has("inheritance")) topic = {
    reason:"Your inheritance plan involves decisions about when cash becomes available and how the assets fit your goals.",
    help:"A wealth manager can review the balance sheet, portfolio concentration and liquidity needs with you.",
    agenda:["Which inherited assets will be accessible when expenses are due?", "How does the inherited portfolio fit the rest of your assets and goals?"]
  };
  else if (goals.has("business") || eventIds.has("entrepreneurship")) topic = {
    reason:"Your business plan can affect the cash available for household expenses.",
    help:"A wealth manager can help you review personal liquidity alongside business plans and bring in the appropriate specialists.",
    agenda:["How much cash should stay available for household costs?", "Which business commitments or financing decisions need a separate review?"]
  };
  else if (Number.isFinite(share) && share >= 35) topic = {
    reason:`${share}% of your recorded portfolio is exposed to one issuer.`,
    help:"A wealth manager can review how that exposure fits your wider assets, liquidity needs and investment goals.",
    agenda:["How much of the portfolio depends on this issuer across direct holdings and funds?", "How much cash do you expect to need for upcoming plans?"]
  };
  if (!topic) return {
    wealth:false, reason:"Bring the goals and assumptions you want to discuss.",
    help:"A DB advisor can help you review your budget, reserve and longer-term planning options.",
    agenda:["Which goal needs attention first?", "Which assumptions would you like to check with an advisor?"],
    booking:DB_BOOKING
  };
  const agenda = [...topic.agenda];
  if (data.priorities?.impact === 1) agenda.push("How could giving or other impact goals fit into the wider plan?");
  if (data.priorities?.community === 1) agenda.push("Who should be involved in the next decision, and what can each person help with?");
  return {...topic, agenda, wealth:true, booking:DB_WEALTH_CONTACT, services:topic.services ?? DB_WEALTH_SERVICES};
}
