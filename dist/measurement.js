export const SOURCES = {
  toolkit: "https://www.oecd.org/en/publications/oecd-infe-toolkit-for-measuring-financial-literacy-inclusion-and-well-being-2026_92f2d439-en.html",
  cfpbWorksheet: "https://files.consumerfinance.gov/f/documents/bcfp_fin-well-being_full-scorecard.pdf",
  cfpbData: "https://www.consumerfinance.gov/data-research/financial-well-being-survey-data/",
  findex: "https://www.worldbank.org/en/publication/globalfindex/download-data",
  findexReport: "https://www.worldbank.org/en/publication/globalfindex/report",
  bundesbank: "https://www.bundesbank.de/de/bundesbank/forschung/fdsz/forschungsdaten/oecd-infe-604686",
  germany: "https://www.oecd.org/de/publications/finanzkompetenz-in-deutschland-starken_77d40624-de/full-report/component-4.html",
  phf: "https://www.bundesbank.de/de/bundesbank/forschung/fdsz/forschungsdaten/phf-856346",
  hfcs: "https://www.ecb.europa.eu/stats/ecb_surveys/hfcs/html/index.en.html",
  pulse: "https://finhealthnetwork.org/programs/financial-health-pulse/data/pulse-data-download/"
};

export const GERMAN_SAVERS = 88;
// CFPB 2016 PUF, weighted mean of FWBscore using finalwt, 6,389 usable rows.
export const CFPB_US_MEAN = 54.2;
// Findex 2025 CSV, 2024, all adults, account_t_d for DEU and WLD.
export const FINDEX_ACCOUNT_OWNERSHIP = { germany: 98.3, world: 78.7 };
// Global Findex 2025, Figure ES.8, low- and middle-income economies.
export const FINDEX_EMERGENCY_FUNDS = 56;
const SCORE_VERSION = "2026.1";

const agreement = ["Strongly disagree", "Disagree", "Neither agree nor disagree", "Agree", "Strongly agree"];
const frequency = ["Never", "Rarely", "Sometimes", "Often", "Always"];
const description = ["Not at all", "A little", "Somewhat", "Well", "Completely"];

export const KNOWLEDGE_ITEMS = [
  { id:"QK3", prompt:"You have €80. Prices for the things you buy rise over the next year and your €80 stays the same. What can you buy with it next year?", options:["More", "The same amount", "Less"], credit:[2] },
  { id:"QK4", prompt:"A friend borrows €40 and pays back exactly €40. How much interest did they pay?", options:["€0", "€4", "€40"], credit:[0] },
  { id:"QK5", prompt:"You put €200 into a savings account paying 2% a year. With no fees, taxes or other transactions, what is the balance after one year?", options:["€200", "€204", "€220"], credit:[1] },
  { id:"QK6", prompt:"You leave that €200 and all its interest in the same account for five years at 2% a year. What will the balance be?", options:["Less than €220", "Exactly €220", "More than €220"], credit:[2], requires:"QK5" },
  { id:"QK7_1", prompt:"An investment promises much higher returns than similar investments. What is reasonable to expect about its risk?", options:["The risk is likely lower", "The risk is likely higher", "High returns remove the risk"], credit:[1] },
  { id:"QK7_2", prompt:"Which situation is an example of high inflation?", options:["Prices across the economy rise quickly", "Only one shop cuts its prices", "Average prices stay flat"], credit:[0] },
  { id:"QK7_3", prompt:"Which would usually reduce your exposure to a single company’s performance?", options:["Buying more shares in the same company", "Spreading the investment across many companies", "Holding the same number of shares for longer"], credit:[1] },
  { id:"QK8", prompt:"Market interest rates rise. What typically happens to the price of an existing fixed-rate bond, all else equal?", options:["It rises", "It stays the same", "It falls"], credit:[2] }
];

export const BEHAVIOUR_ITEMS = [
  { id:"QS1_4", prompt:"I check what’s happening with my money regularly.", options:agreement, credit:[3, 4] },
  { id:"QS1_6", prompt:"I work towards the longer-term financial goals I set.", options:agreement, credit:[3, 4] },
  { id:"QS2_3", prompt:"How often do you check whether a purchase fits your budget before buying?", options:frequency, credit:[3, 4] }
];

export const ATTITUDE_ITEMS = [
  { id:"QS1_1", prompt:"Spending now feels more rewarding to me than saving for the long term.", options:agreement, credit:[0, 1] },
  { id:"QS1_8", prompt:"I value taking steps today to be financially secure later.", options:agreement, credit:[3, 4] },
  { id:"QS1_9", prompt:"I put spending on the life I want now ahead of saving for later.", options:agreement, credit:[0, 1] },
  { id:"QS3_4", prompt:"How well does this describe you? I focus on today and leave future finances for later.", options:description, credit:[0, 1] }
];

function validAnswer(item, value) {
  return Number.isInteger(value) && value >= 0 && value <= item.options.length;
}

export function questionPoints(items, answers) {
  if (!answers || !items.every(item => validAnswer(item, answers[item.id]))) return null;
  const correct = new Set(items.filter(item => item.credit.includes(answers[item.id])).map(item => item.id));
  return items.filter(item => correct.has(item.id) && (!item.requires || correct.has(item.requires))).length;
}

// Columns from the standard CFPB worksheet: self 18–61, self 62+,
// interviewer 18–61, interviewer 62+.
const WELL_BEING_TABLE = [
  [14,14,16,18], [19,20,21,23], [22,24,24,26], [25,26,27,28], [27,29,29,30],
  [29,31,31,32], [31,33,33,33], [32,35,34,35], [34,36,36,36], [35,38,38,38],
  [37,39,39,39], [38,41,40,40], [40,42,42,41], [41,44,43,43], [42,45,44,44],
  [44,46,45,45], [45,48,47,46], [46,49,48,47], [47,50,49,48], [49,52,50,49],
  [50,53,52,50], [51,54,53,52], [52,56,54,53], [54,57,55,54], [55,58,57,55],
  [56,60,58,56], [58,61,59,57], [59,63,60,58], [60,64,62,60], [62,66,63,61],
  [63,67,65,62], [65,69,66,64], [66,71,68,65], [68,73,70,67], [69,75,71,68],
  [71,77,73,70], [73,79,76,72], [75,82,78,75], [78,84,81,77], [81,88,85,81], [86,95,91,87]
];

export function cfpbScore(total, ageBand, mode) {
  if (!Number.isInteger(total) || total < 0 || total >= WELL_BEING_TABLE.length ||
      !["18-61","62+"].includes(ageBand) || !["self","assisted"].includes(mode)) return null;
  const column = (mode === "assisted" ? 2 : 0) + Number(ageBand === "62+");
  return WELL_BEING_TABLE[total][column];
}

const validDate = value => typeof value === "string" && Number.isFinite(Date.parse(value));
const scoreValue = value => Number.isInteger(value) && value >= 0 && value <= 100;
const yearOf = value => new Date(value).getUTCFullYear();

export function normalizeMeasurements(input) {
  const capability = input?.capability;
  const wellBeing = input?.wellBeing;
  const uniqueYears = new Map();
  const annual = Array.isArray(input?.annual) ? input.annual : [];
  for (const item of annual) {
    if (!item || !validDate(item.at) || item.method !== SCORE_VERSION || !scoreValue(item.low) ||
        !scoreValue(item.high) || item.high < item.low || !scoreValue(item.coverage)) continue;
    const year = yearOf(item.at);
    if (!uniqueYears.has(year) || Date.parse(uniqueYears.get(year).at) < Date.parse(item.at)) {
      uniqueYears.set(year, {
        year, at:item.at, method:item.method, low:item.low, high:item.high, coverage:item.coverage,
        wellBeing:scoreValue(item.wellBeing) ? item.wellBeing : null,
        netAssets:Number.isFinite(item.netAssets) ? item.netAssets : null
      });
    }
  }
  const questions = [...KNOWLEDGE_ITEMS, ...BEHAVIOUR_ITEMS, ...ATTITUDE_ITEMS];
  return {
    capability: validDate(capability?.at) && questions.every(item => validAnswer(item, capability.answers?.[item.id]))
      ? {at:capability.at, answers:Object.fromEntries(questions.map(item => [item.id, capability.answers[item.id]]))} : null,
    wellBeing: validDate(wellBeing?.at) && cfpbScore(wellBeing.total,wellBeing.ageBand,wellBeing.mode) !== null
      ? {at:wellBeing.at, total:wellBeing.total, ageBand:wellBeing.ageBand, mode:wellBeing.mode} : null,
    annual:[...uniqueYears.values()].sort((a,b) => b.year - a.year)
  };
}

export function annualCheckpoint(score, wellBeing, netAssets, at = new Date().toISOString()) {
  const year = yearOf(at);
  const outcome = wellBeing && yearOf(wellBeing.at) === year
    ? cfpbScore(wellBeing.total, wellBeing.ageBand, wellBeing.mode) : null;
  return {year, at, method:SCORE_VERSION, low:score.low, high:score.high, coverage:score.coverage, wellBeing:outcome, netAssets};
}

export function householdPosition(data, cash, added, retirementIncome) {
  const accessible = Number.isFinite(cash) ? cash + added.cash : null;
  const investments = Number.isFinite(data.depot?.total) ? data.depot.total + added.investment : null;
  const debt = Number.isFinite(data.debt?.balance) ? data.debt.balance : null;
  const assets = accessible === null || investments === null ? null : accessible + investments + added.other;
  return {accessible, investments, other:added.other, debt, assets,
    net:assets === null || debt === null ? null : assets - debt,
    retirementIncome:Number.isFinite(retirementIncome) ? retirementIncome : null};
}
