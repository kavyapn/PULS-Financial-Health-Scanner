import { evidenceFor, habitStatementFor, missionsFor, PERSONAS, scoreProfile } from "./model.js";
import { LESSONS, lessonsFor, learningPractice } from "./learning.js";
import { mascot, savingsMonthsMet, scoreBand, weeklyAdvice } from "./coaching.js";
import { weeklyChart, weeklySparkline } from "./insights.js";
import { weeklyScores } from "./growth.js";
import { GERMAN_SAVERS, SOURCES } from "./measurement.js";
import { PRIORITIES, priorityChoices } from "./priorities.js";
import { DB_BOOKING } from "./advisor.js";
import { realCashValue } from "./cash-allocation.js";

const money = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

export const euro = value => Number.isFinite(value) ? money.format(value) : "Unavailable";
export const decimal = value => number.format(value);
export const day = value => date.format(new Date(value));
export const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);

export const scoreNumber = score => score.score ?? `${score.low}–${score.high}`;
export const scoreText = score => score.score === null ? `${scoreNumber(score)} / 100 possible` : `${score.score} / 100`;

export function button(label, action, variant = "", attrs = "") {
  return `<button type="button" class="button ${variant}" data-action="${action}" ${attrs}>${label}</button>`;
}

export function chip(text, variant = "") {
  return `<span class="chip ${variant}">${escapeHtml(text)}</span>`;
}

export function backButton(action, label) {
  return `<button type="button" class="back-button" data-action="${action}"><span aria-hidden="true">←</span> ${label}</button>`;
}

export function pipSpeech(text, expression) {
  return `<div class="pip-scene"><p class="pip-bubble">${escapeHtml(text)}</p>
    <span class="pip-character">${mascot(expression)}</span></div>`;
}

export function branchHome() {
  return `<section class="branch-welcome">
    <div class="welcome-content"><span class="eyebrow">Branch experience</span>
      <h1>PULS</h1><p class="welcome-subtitle">Your financial health</p>
      <p class="welcome-lead">Understand where you stand and take the next step toward a life goal.</p>
      ${button('Insert a bank card <span aria-hidden="true">→</span>', "branch", "welcome-action")}
    </div>
    <div class="welcome-art" aria-hidden="true">
      <div class="reader-shadow"></div>
      <div class="bank-card-art"><img src="./assets/deutsche-bank.svg" alt=""><i></i><span>Deutsche Bank</span></div>
      <div class="reader-art"><span></span></div>
    </div>
  </section>`;
}

export function scanInProgress(mode) {
  return `<section class="scan-transition" aria-labelledby="scan-transition-title">
    <div class="scan-illustration" aria-hidden="true">
      <div class="bank-card-art"><img src="./assets/deutsche-bank.svg" alt=""><i></i><span>Deutsche Bank</span></div>
      <div class="reader-art"><span></span></div>
    </div>
    <div class="scan-transition-copy" role="status">
      <h1 id="scan-transition-title">${mode === "terminal" ? "Reading your Deutsche Bank card" : "Scanning your demo account"}</h1>
      <p>Checking your sample balances and banking activity.</p>
    </div>
  </section>`;
}

export function phoneNavigation(active) {
  const items = [
    ["bank-home", "Overview", "logo"],
    ["invest", "Investments", "↗"],
    ["services", "Services", "▤"]
  ];
  return `<nav class="bank-navigation" aria-label="Mobile banking">${items.map(([action, label, icon]) =>
    `<button type="button" data-action="${action}" ${action === active ? 'aria-current="page"' : ""}>
      ${icon === "logo" ? '<img src="./assets/deutsche-bank.svg" width="19" height="19" alt="">' : `<span class="bank-nav-icon" aria-hidden="true">${icon}</span>`}
      ${label}</button>`).join("")}</nav>`;
}

function compactWidget(data, session, score) {
  const weeks = score ? weeklyScores(data,session.activity) : [];
  return `<button type="button" class="health-widget bank-widget" data-action="${score?"open-puls":"mobile-start"}"
    aria-label="${score ? `Open PULS. Financial health score ${scoreText(score)}.` : "Start a PULS scan"}">
    ${score ? weeklySparkline(weeks) : ""}
    <span class="bank-widget-top"><span><strong>PULS</strong><small>Financial Health</small></span><span aria-hidden="true">↗</span></span>
    <span class="bank-widget-center">
      ${score ? `<span class="bank-widget-score">${scoreNumber(score)}<small> / 100</small></span>` : '<span class="bank-widget-start">Start a scan</span>'}
      <span class="bank-widget-note">${score ? "Your weekly score" : "See where you stand"}</span>
    </span>
  </button>`;
}

const areas = {
  fitness: ["Fitness","Cash and portfolio"], behaviour: ["Habits","Spending and saving"],
  literacy: ["Knowledge","Learning path"], readiness: ["Readiness","Simulator"]
};

const scoreLabelPaths = {
  fitness: "M 37 112 A 119 119 0 0 1 118 36",
  behaviour: "M 182 36 A 119 119 0 0 1 263 112",
  literacy: "M 26 192 A 131 131 0 0 0 115 276",
  readiness: "M 185 276 A 131 131 0 0 0 274 192"
};

function scoreAreas(score) {
  return `<div class="score-circle" role="group" aria-label="Four score areas">
    <svg class="score-circle-labels" viewBox="0 0 300 300" aria-hidden="true">
      <defs>${score.dimensions.map(({id}) => `<path id="score-label-${id}" d="${scoreLabelPaths[id]}"></path>`).join("")}</defs>
      ${score.dimensions.map(({id}) => `<text><textPath href="#score-label-${id}" startOffset="50%" text-anchor="middle">${areas[id][0]}</textPath></text>`).join("")}
    </svg>
    <div class="score-area-buttons">${score.dimensions.map(group => {
      const status = scoreBand(group);
      const destination = areas[group.id][1];
      return `<button type="button" class="score-area-button ${status.id}" data-action="dimension" data-id="${group.id}"
        aria-label="${group.label} ${scoreText(group)}, ${status.label}. Open ${destination}.">
        <svg class="score-slice" viewBox="0 0 144 144" aria-hidden="true">
          <path d="M 134 2 A 146 146 0 0 0 2 134 Q 1.25 142 9 142 H 135 Q 142 142 142 135 V 9 Q 142 1.25 134 2 Z"></path>
        </svg>
        <strong>${scoreNumber(group)}</strong>
      </button>`;
    }).join("")}</div>
  </div>`;
}

export function fitHealthOutline(widget) {
  const {width, height} = widget.getBoundingClientRect();
  const radius = widget.querySelector(".score-circle").getBoundingClientRect().width / 2;
  if (!width || !radius) return;
  const center = width / 2;
  const shoulder = height - radius;
  const corner = Math.min(20, Math.max(14, width * .045));
  const join = Math.min(21, center - radius - corner - 1);
  // The two arcs touch where the centers and the join point lie on the same line.
  const separation = Math.sqrt(radius * (radius + 2 * join));
  const tangentX = separation * radius / (radius + join);
  const tangentY = shoulder + join * radius / (radius + join);
  widget.querySelector("#puls-health-outline path").setAttribute("d", [
    `M ${corner} 0 A ${corner} ${corner} 0 0 0 0 ${corner}`,
    `V ${shoulder - corner} A ${corner} ${corner} 0 0 0 ${corner} ${shoulder}`,
    `H ${center - separation} A ${join} ${join} 0 0 1 ${center - tangentX} ${tangentY}`,
    `A ${radius} ${radius} 0 0 0 ${center + tangentX} ${tangentY}`,
    `A ${join} ${join} 0 0 1 ${center + separation} ${shoulder} H ${width - corner}`,
    `A ${corner} ${corner} 0 0 0 ${width} ${shoulder - corner} V ${corner}`,
    `A ${corner} ${corner} 0 0 0 ${width - corner} 0 Z`
  ].join(" "));
  widget.classList.add("has-outline");
}

function healthWidget(data, activity, score, next) {
  const band = scoreBand(score);
  const status = band.label + (score.score === null ? ` · ${score.coverage}% coverage` : "");
  return `<section class="health-widget main-health" aria-label="PULS Financial Health">
    <svg class="health-outline" width="0" height="0" aria-hidden="true">
      <clipPath id="puls-health-outline"><path></path></clipPath>
    </svg>
    <div class="row spread health-heading">
      <h1 class="health-kicker">PULS Financial Health</h1>
      ${button('View progress <span aria-hidden="true">›</span>', "stage", "on-dark health-progress", 'data-index="3"')}
    </div>
    <div class="health-score-center"><strong>${scoreNumber(score)}<small> / 100</small></strong>
      <button type="button" class="score-status health-next ${band.id}" data-action="coach-next" data-id="${next.type}" data-next="${next.id ?? ""}"
        aria-label="${escapeHtml(status + ". Next step: " + next.label)}">${status}<span aria-hidden="true">›</span></button>
    </div>
    ${weeklyChart(weeklyScores(data, activity))}
    ${scoreAreas(score)}
  </section>`;
}

export function bankingHome(data, session, score) {
  const persona = data && PERSONAS[data.id];
  const ids = session?.activity.map(item => item.id) ?? [];
  const cash = data ? evidenceFor(data, ids).cash : null;
  const depot = data?.depot?.total;
  const total = Number.isFinite(cash) && Number.isFinite(depot) ? cash + depot : null;
  return `<div class="mobile-banking stack">
    <section class="balance-hero" aria-labelledby="bank-title">
      <div class="row spread"><h1 id="bank-title">Financial overview</h1>
        ${button("Inbox", "services", "bank-inbox")}</div>
      ${data ? `<div class="balance-ring"><div><span>Total · EUR</span><strong>${euro(total)}</strong><small>${persona.name}’s demo accounts</small></div></div>`
        : '<p class="balance-empty">Choose a demo profile to explore your financial overview.</p>'}
    </section>
    ${data ? `<section class="accounts" aria-labelledby="accounts-title"><h2 id="accounts-title">Accounts</h2>
      <div class="account-row"><span>Accessible cash</span><strong>${euro(cash)}</strong></div>
      <button type="button" class="account-row" data-action="invest"><span>Securities account</span><strong>${euro(depot)} <span class="chevron" aria-hidden="true">›</span></strong></button>
    </section>` : ""}
    <div class="bank-for-you"><h2>For you</h2>${compactWidget(data, session, score)}</div>
  </div>`;
}

export function groupSummary(group, subtitle) {
  return `<section class="group-summary" aria-label="${group.label} score">
    <div class="score-ring ${scoreBand(group).id}" style="--score:${group.low}%"><div><strong>${scoreNumber(group)}</strong><small>out of 100</small></div></div>
    <div><h2>${group.label}</h2><span class="score-status ${scoreBand(group).id}">${scoreBand(group).label}</span>${subtitle ? `<p class="subtle">${escapeHtml(subtitle)}</p>` : ""}
      ${group.score === null ? `<p class="subtle">${group.coverage}% of this area by weight</p>` : ""}</div>
  </section>`;
}

export function groupInputs(group, open = false, title = "What shapes this score?") {
  return `<details class="card details" ${open ? "open" : ""}><summary>${title}</summary>
    <div class="details-inner"><dl class="metric-list">${group.metrics.map(item => `<div>
      <dt>${escapeHtml(item.label)}</dt><dd><strong>${item.missing ? "Missing" : escapeHtml(item.input)}</strong>
      <small>${escapeHtml(item.source)} · ${decimal(item.weight)} points available</small></dd>
    </div>`).join("")}</dl></div></details>`;
}

function allocation(data) {
  const depot = data.depot;
  if (!depot?.allocation?.length) return '<p class="subtle">Portfolio allocation is unavailable for this profile.</p>';
  return `<p class="subtle">Depot value ${euro(depot.total)}${depot.largestHolding
      ? ` · Largest issuer ${escapeHtml(depot.largestHolding.label)} (${depot.largestHolding.share}%)` : ""}</p>
    <div class="allocation-rows">${depot.allocation.map(item => {
      const share = depot.total > 0 ? Math.round(100 * item.value / depot.total) : 0;
      return `<div class="bar-row"><div class="row spread"><span>${escapeHtml(item.label)}</span><strong>${share}%</strong></div>
        <div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${share}%"></div></div></div>`;
    }).join("")}</div>`;
}

export function portfolioPanel(data) {
  return `<section class="card"><h2>Portfolio allocation</h2>
    ${data ? allocation(data) : '<p class="subtle">Choose a demo profile to view its holdings.</p>'}</section>`;
}

export function cashImpactView(position, {rate, years}) {
  const cash = position.unallocated;
  if (cash === null) return pipSpeech("Add an accessible balance and your monthly essential costs to estimate cash available for other goals.", "think");
  const realValue = realCashValue(cash, rate, years);
  const loss = cash - realValue;
  const period = `${years} ${years === 1 ? "year" : "years"}`;
  const tip = cash > 0
    ? `You have ${euro(cash)} available after your reserve and planned costs. At ${decimal(rate)}% inflation and zero interest, it would buy about ${euro(loss)} less in ${period}. Compare rates, fees and how soon you might need the money.`
    : "Your reserve and near-term costs use the available cash. Review those needs first when deciding how much you can set aside for longer.";
  return `<div class="forecast-results">
      <div><span>Buying power in ${period}</span><strong>${euro(realValue)}</strong></div>
      <div><span>Reduction in buying power</span><strong>${euro(loss)}</strong></div>
    </div>${pipSpeech(tip, "think")}`;
}

function cashAllocationPanel(position, assumptions) {
  return `<section class="card stack cash-allocation">
    <div class="row spread wrap"><h2 id="cash-allocation-title" tabindex="-1">Unallocated cash</h2><strong class="cash-unallocated">${euro(position.unallocated)}</strong></div>
    <dl class="metric-list">
      <div><dt>Accessible cash${position.addedCash ? " with added balances" : ""}</dt><dd>${euro(position.available)}</dd></div>
      ${position.demoSavings ? `<div><dt>Demo savings included</dt><dd>${euro(position.demoSavings)}</dd></div>` : ""}
      <div><dt>Reserve target · ${position.reserveMonths} ${position.reserveMonths === 1 ? "month" : "months"} of essentials</dt><dd>${euro(position.reserve)}</dd></div>
      <div><dt>Planned one-time costs · next 3 months</dt><dd>${euro(position.costs)}</dd></div>
    </dl>
    <div class="row wrap cash-assumptions">
      <label class="field">Assumed annual inflation (%)<input id="cash-inflation" type="number" inputmode="decimal" min="0" max="20" step="0.1" value="${assumptions.rate}" required></label>
      <label class="field">Holding period<select id="cash-years">${[1,3,5,10].map(year =>
        `<option value="${year}" ${year === assumptions.years ? "selected" : ""}>${year} ${year === 1 ? "year" : "years"}</option>`).join("")}</select></label>
    </div>
    <div class="stack" id="cash-impact" aria-live="polite">${cashImpactView(position, assumptions)}</div>
  </section>`;
}

export function fitnessView(data, group, mode, position, assumptions) {
  const buffer = group.metrics.find(item => item.id === "buffer");
  const concentration = group.metrics.find(item => item.id === "concentration");
  const focused = !concentration.missing && concentration.score < (buffer.score ?? 100);
  const title = focused ? "Review your largest investment exposure" : "Check how long your cash could last";
  const note = focused ? "Look at how much one company contributes to your overall portfolio." : "Test a change to your income or expenses against the cash you can access.";
  return `<div class="stack narrow-page">
    ${groupSummary(group, "Cash reserves, room in your budget, debt repayments and investment exposure.")}
    <section class="card next-step"><span class="eyebrow">Next step</span><h2>${title}</h2><p>${note}</p>
      ${focused ? button("Explore diversification", "lesson", "", 'data-id="lesson-diversification"')
        : button("Test a life change", "stage", "", 'data-index="1"')}</section>
    ${groupInputs(group, true)}
    ${mode === "phone" ? button("See portfolio allocation", "invest", "secondary") : portfolioPanel(data)}
    ${position ? cashAllocationPanel(position, assumptions) : ""}
  </div>`;
}

export function behaviourView(data, group, activity) {
  const month = data.months.at(-1);
  const spending = month.essentials + month.discretionary;
  const history = habitStatementFor(data);
  const completed = activity.map(item => item.id);
  const recorded = history && completed.includes(history.id);
  const { savingsMonths } = evidenceFor(data, completed);
  const monthsMet = savingsMonthsMet({dimensions:[group]});
  return `<div class="stack narrow-page">
    ${groupSummary(group, "Savings consistency and spending reviews from your banking activity.")}
    <section class="card bank-analysis">
      <div class="row spread wrap"><h2>Spending analysis</h2><span class="subtle">${escapeHtml(month.label)} · demo snapshot</span></div>
      <div class="analysis-pair">
        <div><span>Take-home income</span><strong>${euro(month.income)}</strong></div>
        <div><span>Total spending</span><strong>${euro(spending)}</strong></div>
      </div>
      <div class="allocation-rows">${data.spending.map(item => `<div class="bar-row"><div class="row spread">
        <span>${escapeHtml(item.label)}</span><strong>${euro(item.amount)}</strong></div>
        <div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${spending > 0 ? Math.min(100, item.amount * 100 / spending) : 0}%"></div></div></div>`).join("")}</div>
      <details class="inline-details"><summary>Banking activity</summary>
        <div class="table-scroll"><table><thead><tr><th scope="col">Transaction</th><th scope="col" class="num">Amount</th></tr></thead>
        <tbody>${data.transactions.map(item => `<tr><td>${escapeHtml(item.description)}<small>${escapeHtml(item.date)} · ${escapeHtml(item.category)}</small></td>
          <td class="num">${euro(item.amount)}</td></tr>`).join("")}</tbody></table></div>
      </details>
    </section>
    <section class="card savings-panel">
      <h2 id="savings-consistency-title">Savings consistency</h2>
      <div class="table-scroll"><table aria-labelledby="savings-consistency-title">
        <thead><tr><th scope="col">Month</th><th scope="col" class="num">Target</th><th scope="col" class="num">Saved</th><th scope="col">Result</th></tr></thead>
        <tbody>${savingsMonths.map(({label, savingsTarget, saved}) => {
          const target = savingsTarget > 0 ? savingsTarget : null;
          const met = target !== null && Number.isFinite(saved) ? saved >= target : null;
          return `<tr><th scope="row">${escapeHtml(label)}</th><td class="num">${euro(target)}</td><td class="num">${euro(saved)}</td>
            <td class="${met === null ? "subtle" : met ? "status-good" : "status-low"}">${met === null ? "Unavailable" : met ? "Met" : "Missed"}</td></tr>`;
        }).join("")}</tbody>
      </table></div>
      ${monthsMet !== null ? `<p class="savings-comparison"><strong>${monthsMet} of 3</strong> months at or above your target</p>` : ""}
      <p class="subtle savings-comparison">In the 2022 German survey, ${GERMAN_SAVERS}% of adults reported actively saving. <a href="${SOURCES.germany}" target="_blank" rel="noopener">OECD/INFE results for Germany</a></p>
    </section>
    ${history ? `<section class="card next-step"><span class="eyebrow">Next step</span>
      <h2>Check your savings routine</h2><p>${escapeHtml(recorded ? history.evidence : history.description)}</p>
      ${recorded ? button("See what changed", "show-history", "secondary") : button(history.action, "habit")}</section>` : ""}
    ${groupInputs(group)}
  </div>`;
}

function learningRoad(lessons, quests, completed, encouragement, support) {
  const stops = lessons.flatMap((lesson, index) => {
    const state = lesson.passed ? "passed" : lesson.recommended ? "next" : "";
    const topic = lesson.focusOnly ? ` · ${PRIORITIES[lesson.focus].label}` : "";
    const note = lesson.passed ? "Completed · Practice again" : `${lesson.recommended ? "Start lesson · " : ""}1 min${topic}`;
    return [
      `<button type="button" data-action="lesson" data-id="${lesson.id}" class="road-stop ${state}"
        ${lesson.recommended ? 'aria-current="step"' : ""}>
        <span class="road-node" aria-hidden="true">${index + 1}</span>
        <span><strong>${escapeHtml(lesson.title)}</strong><small>${note}</small></span>
      </button>`,
      ...lessonVideos.filter(video => video.after === lesson.id).map(video =>
        `<a class="road-stop road-video" href="${video.href}" target="_blank" rel="noopener">
          <span class="road-node" aria-hidden="true">▶</span>
          <span><strong>${video.title}</strong><small>Video · Deutsche Bundesbank</small></span>
        </a>`)
    ];
  });
  const nextQuest = quests.find(quest => !completed.has(quest.id));
  stops.push(...quests.map((quest, index) => {
    const done = completed.has(quest.id);
    const ready = quest === nextQuest;
    const status = done ? " · Completed" : ready ? "" : " · Complete the previous quest first";
    return `<section class="road-stop road-checkpoint road-quest${done ? " passed" : ""}" tabindex="-1" aria-labelledby="road-title-${quest.id}">
      <div class="row"><span class="road-node" aria-hidden="true">${lessons.length + index + 1}</span>
        <div><h2 id="road-title-${quest.id}">${escapeHtml(quest.title)}</h2><small>Life-event quest${status}</small></div>
      </div>
      <p class="subtle">${escapeHtml(done ? quest.evidence : quest.description)}</p>
      ${ready ? button(quest.question ? "Start knowledge check" : escapeHtml(quest.action), "mission", "secondary", `data-id="${quest.id}"`) : ""}
    </section>`;
  }));
  stops.push(`<section class="road-stop road-checkpoint road-coaching" aria-labelledby="road-coaching-title">
    <div class="row"><span class="road-node" aria-hidden="true">${lessons.length + quests.length + 1}</span><h2 id="road-coaching-title">Live coaching</h2></div>
    <p class="subtle">Bring a question from a lesson or a plan to a Deutsche Bank advisor.</p>
    <div class="actions">
      <a class="button" href="${support?.booking ?? DB_BOOKING}" target="_blank" rel="noopener">${support?.wealth ? "Request a Wealth Management meeting" : "Schedule a meeting"}</a>
      ${button("Prepare a meeting brief","advisor","text-button")}
    </div>
  </section>`);
  const curve = "M 50 0 C 50 15 11 22 11 50 C 11 78 50 85 50 100";
  return `<div class="learning-road-map">
    <ol class="learning-road" aria-label="Learning road">${stops.map((stop, index) => `<li class="${index % 2 ? "right" : "left"}">
      <svg class="learning-road-curve" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="${curve}"></path><path class="road-markings" d="${curve}"></path>
      </svg>
      ${stop}
    </li>`).join("")}</ol>
    <aside class="pip-road-guide" aria-label="Pip’s guidance">${pipSpeech(encouragement, "reassure")}</aside>
  </div>`;
}

function learningEncouragement(lesson, data, completed) {
  if (!lesson) return "You’ve passed all the lessons. Try a life-event quest or bring a question to live coaching.";
  if (lesson.id !== "lesson-cash") return lesson.reason;
  const { cash } = evidenceFor(data, completed);
  return Number.isFinite(cash) && data.essentials > 0
    ? `Your banking snapshot shows ${euro(cash)} in cash and ${euro(data.essentials)} in monthly essentials. ${lesson.reason}`
    : lesson.reason;
}

const lessonVideos = [
  { after:"lesson-borrowing", title:"Interest and interest rates", href:"https://www.bundesbank.de/en/service/school-service/animation-videos/what-is-interest-and-what-are-interest-rates--860018" },
  { after:"lesson-cash", title:"Inflation and price stability", href:"https://www.bundesbank.de/en/service/school-service/animation-videos/price-stability-860060" }
];

export function learningView(data, score, activity, support) {
  const group = score.dimensions.find(item => item.id === "literacy");
  const practice = learningPractice(activity);
  const lessons = lessonsFor(data, score, activity);
  const nextLesson = lessons.find(lesson => lesson.recommended);
  const completed = new Set(activity.map(item => item.id));
  const quests = missionsFor(data);
  const completedQuests = quests.filter(quest => completed.has(quest.id));
  const xp = completedQuests.reduce((total, quest) => total + quest.xp, practice.xp);
  const currentLessons = new Map(lessons.map(lesson => [lesson.id, lesson]));
  const stops = lessonsFor(data, scoreProfile(data)).map(lesson => currentLessons.get(lesson.id));
  return `<div class="stack narrow-page learn-page">
    <header class="learning-heading">
      <div class="row spread wrap"><h1>Your learning path</h1><span class="score-status ${scoreBand(group).id}">${group.label} ${scoreNumber(group)} / 100</span></div>
      <p class="learning-progress"><strong>${practice.completed} of ${practice.total} passed · ${completedQuests.length} of ${quests.length} quests · ${xp} XP${practice.streak ? ` · ${practice.streak}-day streak` : ""}</strong></p>
    </header>
    ${learningRoad(stops, quests, completed, learningEncouragement(nextLesson, data, [...completed]), support)}
    ${groupInputs(group)}
  </div>`;
}

export function lessonView(lesson, activity, result) {
  if (!lesson) return "";
  if (result) {
    return `<div class="stack narrow-page">
      <section class="card lesson-result">
        <h1>Lesson passed</h1>
        <p><strong>${result.first ? `+${lesson.xp} XP` : "Practice complete"}</strong></p>
        ${result.before !== result.after ? `<p>Your Knowledge score rose from ${result.before} to ${result.after} / 100.</p>` : ""}
        ${pipSpeech(result.feedback, "celebrate")}
        <div class="actions">${button("Continue learning", "learn")}
          ${button("See score history", "show-history", "secondary")}</div>
      </section></div>`;
  }
  return `<div class="stack narrow-page">
    <section class="card lesson-page"><div class="row spread wrap"><span class="eyebrow">1-minute lesson</span>
      ${chip(activity.some(item => item.id === lesson.id) ? "Review" : `+${lesson.xp} XP`, "blue")}</div>
      <h1>${escapeHtml(lesson.title)}</h1><p>${escapeHtml(lesson.teach)}</p>
      <div class="lesson-example"><strong>Example</strong><p>${escapeHtml(lesson.example)}</p></div>
      <form id="lesson-quiz" data-id="${lesson.id}"><fieldset class="lesson-options">
        <legend>${escapeHtml(lesson.question)}</legend>
        ${lesson.choices.map((choice, i) => `<label class="quiz-choice"><input type="radio" name="answer" value="${i}" required>${escapeHtml(choice)}</label>`).join("")}
      </fieldset>
      <button type="submit" class="button">Check my answer</button>
      <div id="lesson-feedback" role="status"></div></form>
    </section></div>`;
}

export function reportView(data, score, plans, shared, methodology, priorities) {
  return `<div class="stack narrow-page">
    <section class="card report-intro"><h1>Score details</h1>
      <p>${PERSONAS[data.id].name}’s PULS · <strong>${scoreText(score)}</strong></p>
      <p class="subtle">Banking snapshot ${day(data.asOf)}</p>
      ${plans.length ? `<details class="inline-details report-goals"><summary>Goals included in your score details</summary>
        <ul>${plans.map(plan => `<li><strong>${escapeHtml(plan.goal)}</strong> · ${escapeHtml(plan.priorities.join(", "))}</li>`).join("")}</ul></details>` : ""}
      <div class="actions">${button("Export score details", "export", "secondary")}${button("Share with your advisor", "advisor")}</div>
      ${shared ? '<p class="receipt">✓ Brief saved in the demo advisor inbox</p>' : ""}
    </section>
    <section class="card"><h2>Score inputs and weights</h2>
      <p class="subtle">Each input earns up to its assigned points. Missing inputs widen the score range.</p>
      <details class="inline-details report-goals" id="score-priorities"><summary>Personalize priorities</summary>
        <form class="stack" id="priority-form">${priorityChoices(priorities)}
          <div><button class="button" type="submit">Save priorities</button></div>
        </form>
      </details>
      <div class="table-scroll"><table><thead><tr><th scope="col">Input and source</th><th scope="col" class="num">Weight</th><th scope="col" class="num">Points</th></tr></thead>
      <tbody>${score.dimensions.map(group => `<tr class="group-row"><th scope="row">${group.label}</th><td class="num">${group.weight}%</td><td></td></tr>
        ${group.metrics.map(item => `<tr><th scope="row"><strong>${escapeHtml(item.label)}</strong>
          <small>${item.missing ? "Missing" : escapeHtml(item.input)} · ${escapeHtml(item.source)}</small>
          <small>${escapeHtml(item.rule)}</small></th><td class="num">${decimal(item.weight)}%</td>
          <td class="num">${item.missing ? "—" : decimal(item.contribution)}</td></tr>`).join("")}`).join("")}</tbody></table></div>
    </section>
    ${methodology}
  </div>`;
}

export function activityInfo(data, id) {
  const quest = missionsFor(data).find(item => item.id === id);
  if (quest) return { title: quest.title, detail: quest.evidence };
  const lesson = LESSONS.find(item => item.id === id);
  if (lesson) return { title: lesson.title, detail: lesson.success };
  if (id === "habit-statement") return { title: "Savings follow-up", detail: habitStatementFor(data)?.evidence };
  const names = {
    baseline: "Opening scan", "scan-connected": "Opened banking snapshot", "scenario-reviewed": "Saved a life-event rehearsal",
    "rescan-reviewed": "Reviewed the rescan", "advisor-shared": "Shared a demo advisor brief",
    "priorities-updated": "Updated personal score weights", "family-forecast-saved": "Saved a family forecast",
    "retirement-forecast-saved": "Saved a retirement forecast"
  };
  return { title: names[id] ?? "Updated scan" };
}

export function scanView(data, score, session, advice = weeklyAdvice(data, score, session.activity)) {
  const next = advice.actions[0];
  return `<div class="stack scan-page">
    ${healthWidget(data,session.activity,score,next)}
    <button type="button" class="next-tile" data-action="coach-next" data-id="${next.type}" data-next="${next.id??""}">
      <span><small>Next step</small><strong>${escapeHtml(next.label)}</strong><small class="next-reason">${escapeHtml(next.text)}</small></span>
      <span class="chevron" aria-hidden="true">›</span>
    </button>
    ${advice.advisor.wealth ? `<section class="card stack advisor-entry">
      <h2>Talk through your next decision</h2><p>${escapeHtml(advice.advisor.reason)}</p>
      ${button("Prepare a wealth conversation", "advisor", "secondary")}
    </section>` : ""}
    <div class="score-links">
      ${button("Score details","report","quiet")}${button("Add data sources","data","quiet")}
    </div>
  </div>`;
}
