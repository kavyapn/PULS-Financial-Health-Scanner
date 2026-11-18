import { evidenceFor, getBankingData, habitStatementFor, missionsFor, PERSONAS, PLAN_ACTIONS, scenarioFor, scoreProfile } from "./model.js";
import { createHandoff, readHandoff } from "./handoff.js";
import { branchSteps, describePlan, normalizePlans, startBranch } from "./branch.js";
import { LESSONS } from "./learning.js";
import { FORECAST_WINDOWS, HISTORY_RANGES, LIFE_CHANGES, MAX_EVENT_MONTH, MAX_LIFE_EVENTS, normalizeLifeEvents, scoreHistory, scoreTrend, simulateLifeEvents, weeklyScores } from "./growth.js";
import { cashGraph, historyPointDetail, historyTrendView, historyView, lifeEventsView, simulatorView } from "./insights.js";
import { ASSET_TYPES, assetTotals, normalizeAssets, parseAssetReport } from "./assets-data.js";
import { coachContext, coachDestination, coachReaction, localCoach, weeklyAdvice } from "./coaching.js";
import { chatPanel, chatView, dataView, eventWizard, longPlanPreview, longPlanView, weeklyView } from "./feature-ui.js";
import { projectLongTerm } from "./long-plan.js";
import { annualCheckpoint, cfpbScore, householdPosition, normalizeMeasurements } from "./measurement.js";
import { annualPulseView, capabilityView, researchPanels } from "./research-ui.js";
import { changePriority, focusLabels, normalizePriorities } from "./priorities.js";
import { advisorSupport } from "./advisor.js";
import { cashAllocation } from "./cash-allocation.js";
import {
  activityInfo, backButton, bankingHome, behaviourView, branchHome, button, cashImpactView, chip, decimal, escapeHtml, euro, fitHealthOutline, fitnessView,
  groupInputs, groupSummary, learningView, lessonView, phoneNavigation, pipSpeech, portfolioPanel, reportView, scanInProgress, scanView, scoreText
} from "./puls-ui.js";

const main = document.querySelector("#main");
const siteHeader = document.querySelector(".site-header");
const bankNavigation = document.querySelector("#bank-navigation");
const moduleNavigation = document.querySelector("#puls-module-navigation");
const dialog = document.querySelector("#dialog");
const idleDialog = document.querySelector("#idle-dialog");
const toast = document.querySelector(".toast");
const healthOutline = new ResizeObserver(([{target}]) => fitHealthOutline(target));
const headerLayout = new ResizeObserver(fitSiteHeader);
const learningLayout = new ResizeObserver(fitLearningHeader);
headerLayout.observe(siteHeader, {box:"border-box"});
const steps = ["Health", "Simulator", "Learn", "Progress"];
const storeKey = "next-move-phone-v1";
const dateTime = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });
const url = new URL(location.href);
const READER_IDLE_MS = 150000;
const READER_WARNING_MS = 30000;

let mode = url.searchParams.get("mode") === "phone" ? "phone" : "terminal";
let session = null;
let data = null;
let bankPage = mode === "phone" ? "bank-home" : null;
let detail = null;
let lessonId = null;
let lessonResult = null;
let stopIntake = null;
let onboardingSources = false;
let scanTimer = null;
let loadVersion = 0;
let idleTimer;
let expiryTimer;
let countdownTimer;
let idleDeadline = 0;
let toastTimer;
let eventDraft = null;
let assetMode = null;
let assetPreview = null;
let assetError = "";
let chat = {open:false, messages:[], pending:false, draft:""};
let longPlanDrafts = {};
let priorityDraft = {};
let weeklyReply;
let advisorDraft;
let cashAssumptions = {rate:2, years:5};

function longInputs() {
  const goal = session.longGoal === "retirement" ? "retirement" : "family";
  return {...session.longPlans?.[goal], ...longPlanDrafts[goal], goal};
}

function longForecast() {
  const inputs = longInputs();
  const totals = assetTotals(session.assets);
  const availableAssets = totals.cash + (inputs.goal === "retirement" ? totals.investment : 0);
  const included = Boolean(inputs.includeAssets && availableAssets);
  return [projectLongTerm(data, evidenceIds(), inputs, included ? totals : {}, activeEvents()), availableAssets, included];
}

function readLongPlan(form) {
  const fields = new FormData(form);
  return {
    years: Number(fields.get("years")), monthly: Number(fields.get("monthly")),
    cost: Number(fields.get("cost")), annualReturn: Number(fields.get("annualReturn")),
    includeAssets: fields.has("includeAssets")
  };
}

function previewLongPlan(input) {
  const form = input.form;
  let slider;
  if (input.dataset.longSlider) {
    slider = input;
    form.elements.namedItem(input.dataset.longSlider).value = input.value;
  } else if (input.type === "number" && input.validity.valid) {
    slider = form.querySelector(`[data-long-slider="${input.name}"]`);
    slider.value = input.value;
  }
  if (slider) {
    const min = Number(slider.min), max = Number(slider.max);
    slider.style.setProperty("--slider-progress", `${(slider.valueAsNumber - min) / (max - min) * 100}%`);
  }
  if ([...form.querySelectorAll('input[type="number"]')].some(field => !field.validity.valid)) return;
  longPlanDrafts[longInputs().goal] = readLongPlan(form);
  const preview = document.querySelector("#long-plan-preview");
  const wasOpen = preview.querySelector("details").open;
  const [forecast] = longForecast();
  preview.innerHTML = longPlanPreview(forecast);
  preview.querySelector("details").open = wasOpen;
  document.querySelector("#readiness-summary").innerHTML = projectedReadiness(currentScore(), forecast.scenarioScore);
}

function readSaved() {
  try {
    const item = JSON.parse(localStorage.getItem(storeKey));
    if (item && Object.hasOwn(PERSONAS, item.persona) && Number.isInteger(item.stage) &&
        item.stage >= 0 && item.stage < steps.length && Array.isArray(item.activity)) return item;
  } catch {}
  return null;
}

function persist() {
  if (mode !== "phone" || !session) return;
  try {
    localStorage.setItem(storeKey, JSON.stringify(session));
  } catch {}
}

function announce(message) {
  toast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.textContent = ""; }, 4300);
}

function fitSiteHeader() {
  document.documentElement.style.setProperty("--site-header-height", `${siteHeader.getBoundingClientRect().height}px`);
}

function refreshHeader() {
  document.body.dataset.mode = mode;
  const sessionView = session?.stage === 2 && !detail ? "learning" : "puls";
  const inFlow = stopIntake || onboardingSources || scanTimer || eventDraft;
  document.body.dataset.view = inFlow ? "intake" : bankPage ?? (session ? sessionView : "welcome");
  const inModule = !inFlow && !bankPage && session && data;
  moduleNavigation.hidden = !inModule;
  moduleNavigation.innerHTML = inModule ? moduleNav() : "";
  for (const key of ["terminal", "phone"]) {
    document.querySelector(`.mode-switch [data-action="${key}"]`).setAttribute("aria-pressed", String(mode === key));
  }
  const activePage = mode === "phone" ? bankPage ?? "bank-home" : "";
  if (bankNavigation.dataset.active !== activePage) {
    bankNavigation.dataset.active = activePage;
    bankNavigation.innerHTML = activePage ? phoneNavigation(activePage) : "";
  }
  fitSiteHeader();
}

function changeMode(next) {
  mode = next;
  const address = new URL(location.href);
  if (mode === "phone") address.searchParams.set("mode", "phone");
  else address.searchParams.delete("mode");
  history.replaceState(null, "", address);
  refreshHeader();
}

function clearIdle() {
  clearTimeout(idleTimer);
  clearTimeout(expiryTimer);
  clearInterval(countdownTimer);
  countdownTimer = undefined;
  idleDeadline = 0;
  if (idleDialog.open) idleDialog.close();
}

function remainingSeconds() {
  return Math.max(0, Math.ceil((idleDeadline - Date.now()) / 1000));
}

function countdownText(seconds) {
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}

function updateIdleCountdown() {
  const seconds = remainingSeconds();
  const timer = document.querySelector("#session-countdown");
  const time = countdownText(seconds);
  if (timer && timer.textContent !== time) timer.textContent = time;
  if (!idleDialog.open) return;
  const value = document.querySelector("#idle-countdown");
  const remaining = `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
  if (value.textContent !== remaining) value.textContent = remaining;
  if (seconds === 30 || seconds === 10 || seconds === 5) {
    const live = document.querySelector("#idle-announcement");
    const message = remaining + " remaining.";
    if (live.textContent !== message) live.textContent = message;
  }
}

function showIdleWarning() {
  if (mode !== "terminal" || (!session && !stopIntake)) return;
  idleDeadline = Date.now() + READER_WARNING_MS;
  document.querySelector("#idle-announcement").textContent = "";
  idleDialog.showModal();
  updateIdleCountdown();
  idleDialog.querySelector("[data-action=keep-session]").focus();
  expiryTimer = setTimeout(() => {
    goHome();
    announce("Your branch session ended and its demo data was cleared.");
  }, READER_WARNING_MS);
}

function resetIdle() {
  if (mode !== "terminal" || (!session && !stopIntake) || idleDialog.open) return;
  idleDeadline = Date.now() + READER_IDLE_MS + READER_WARNING_MS;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(showIdleWarning, READER_IDLE_MS);
  countdownTimer ??= setInterval(updateIdleCountdown, 250);
  updateIdleCountdown();
}

function showDialog(title, content) {
  if (dialog.open) dialog.close();
  dialog.innerHTML = `<div class="dialog-heading"><h2 id="dialog-title">${escapeHtml(title)}</h2>
    <button type="button" class="close" data-action="dismiss" aria-label="Close dialog">×</button></div>
    <div class="dialog-copy">${content}</div>`;
  dialog.showModal();
}

function closeDialog() {
  if (dialog.open) dialog.close();
}

function moveFocus() {
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

function goHome() {
  loadVersion += 1;
  stopIntake?.();
  stopIntake = null;
  onboardingSources = false;
  clearTimeout(scanTimer);
  scanTimer = null;
  clearIdle();
  closeDialog();
  session = null;
  data = null;
  detail = null;
  eventDraft = null;
  chat = {open:false, messages:[], pending:false, draft:""};
  weeklyReply = null;
  advisorDraft = null;
  cashAssumptions = {rate:2, years:5};
  longPlanDrafts = {};
  bankPage = mode === "phone" ? "bank-home" : null;
  render();
  moveFocus();
}

function record(id, details = {}) {
  if (id !== "priorities-updated" && session.activity.some(item => item.id === id)) return;
  session.activity.push({ id, at: new Date().toISOString(), ...details });
  persist();
}

function hasActivity(id) {
  return session.activity.some(item => item.id === id);
}

function evidenceIds() {
  return session.activity.map(item => item.id);
}

function currentScore() {
  return scoreProfile(data, evidenceIds());
}

function guidance(score) {
  return weeklyAdvice(data, score, session.activity, {
    plans:session.plans, events:activeEvents(), imports:session.assets.length ? assetTotals(session.assets) : null
  });
}

function currentHousehold() {
  const { cash } = evidenceFor(data, evidenceIds());
  return householdPosition(data, cash, assetTotals(session.assets), session.longPlans?.retirement?.monthly);
}

function cashPosition() {
  return cashAllocation(data, evidenceIds(), session.plans, activeEvents(), assetTotals(session.assets).cash);
}

function currentAdvisor() {
  return advisorSupport(data, session.plans, activeEvents());
}

function describedPlans() {
  return session.plans.map(describePlan);
}

function onboardingEvents(plans) {
  const suggested = new Map();
  for (const plan of plans.map(describePlan)) {
    for (const id of plan.presets) {
      if (plan.suggestedMonth < (suggested.get(id)?.month ?? Infinity)) {
        const preset = LIFE_CHANGES.find(item => item.id === id);
        suggested.set(id, { id, amount:preset.defaultAmount, month:plan.suggestedMonth, suggestion:`${plan.id}:${id}` });
      }
    }
  }
  return normalizeLifeEvents([...suggested.values()]);
}

function activeEvents() {
  if (Array.isArray(session.events)) return normalizeLifeEvents(session.events);
  if (session.life) return normalizeLifeEvents([{ ...session.life, month: 1 }]);
  return onboardingEvents(session.plans);
}

function updateGoals(plans) {
  if (session.life && !Array.isArray(session.events)) {
    session.events = normalizeLifeEvents([{...session.life, month:1}, ...onboardingEvents(plans)]);
    delete session.life;
    session.plans = plans;
    return;
  }
  if (Array.isArray(session.events)) {
    const prior = new Map(onboardingEvents(session.plans).map(event => [event.suggestion,event]));
    const revised = new Map(onboardingEvents(plans).map(event => [event.suggestion,event]));
    const events = activeEvents().flatMap(event => {
      if (!event.suggestion) return [event];
      const next = revised.get(event.suggestion);
      if (!next) return [];
      return [{ ...event, month:event.month === prior.get(event.suggestion)?.month ? next.month : event.month }];
    });
    session.events = normalizeLifeEvents([...events, ...[...revised.values()].filter(event => !prior.has(event.suggestion))]);
  }
  session.plans = plans;
}

function lifeForecast() {
  const extras = assetTotals(session.assets);
  const forecastData = session.includeShortAssets && extras.cash && Number.isFinite(data.cash)
    ? {...data, cash:data.cash + extras.cash} : data;
  return simulateLifeEvents(forecastData, evidenceIds(), activeEvents(), session.forecastMonths);
}

function moduleNav() {
  const nested = session.stage !== 0 || detail;
  const week = adviceWeek();
  const unread = week && session.adviceReadWeek !== week;
  return `<nav class="puls-navigation" aria-label="PULS">
    <div class="row spread wrap">
      ${detail === "lesson" ? backButton("learn","Learning path") : detail === "capability" ? backButton("report","Score details") : nested ? backButton("back-puls","PULS")
        : mode === "phone" ? backButton("bank-home", "Banking overview") : '<span class="puls-product">PULS</span>'}
      <div class="row">
        <button type="button" class="advice-bell" data-action="weekly" aria-label="Weekly advice" ${unread ? 'aria-description="1 unread notification"' : ""}
          ${detail === "weekly" ? 'aria-current="page"' : ""}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0"></path>
          </svg>
          ${unread ? '<span class="notification-badge" aria-hidden="true">1</span>' : ""}
        </button>
        ${mode === "terminal" ? `${button(
        `End session <span class="session-countdown" id="session-countdown" aria-hidden="true">${countdownText(remainingSeconds())}</span>`,
        "end", "quiet", 'aria-describedby="branch-time-description"')}
        <span id="branch-time-description" class="sr-only">The timer resets when you use the terminal. You’ll get a warning before the session ends.</span>` : ""}
      </div>
    </div>
  </nav>`;
}

function adviceWeek() {
  return weeklyScores(data, session.activity).at(-1)?.week;
}

function detailedRehearsal() {
  const scenario = scenarioFor(data, evidenceIds(), session.scenario, session.stress);
  return `<details class="card details" id="detailed-rehearsal">
    <summary>Explore ${PERSONAS[data.id].name}’s six-month rehearsal</summary>
    <div class="details-inner stack">
      <h2>${escapeHtml(scenario.title)}</h2>
      <p class="subtle">${escapeHtml(scenario.detail)}</p>
      <div class="controls">
        <div class="row spread wrap"><label for="scenario-value">${escapeHtml(scenario.label)}</label>
          <output id="scenario-value-out" for="scenario-value">${euro(scenario.value)}</output></div>
        <input type="range" id="scenario-value" min="${scenario.min}" max="${scenario.max}" step="${scenario.step}" value="${scenario.value}" aria-valuetext="${euro(scenario.value)}">
        <label class="check-option"><input type="checkbox" id="scenario-stress" ${session.stress ? "checked" : ""}> ${escapeHtml(scenario.stressLabel)}</label>
      </div>
      <div class="stack" id="rehearsal-result" aria-live="polite">${rehearsalResult(scenario)}</div>
    </div>
  </details>`;
}

function rehearsalResult(scenario) {
  const months = scenario.chart.labels;
  const startingPlan = scenarioFor(data, evidenceIds());
  const goal = rehearsalGoal(scenario.chart);
  const endChange = scenario.chart.values.at(-1) - startingPlan.chart.values.at(-1);
  const difference = endChange === 0 ? "Same cash balance after six months."
    : `${euro(Math.abs(endChange))} ${endChange > 0 ? "more" : "less"} cash after six months.`;
  return `<h3>${escapeHtml(scenario.headline)}</h3>
    ${cashGraph(startingPlan.chart.values, scenario.chart.values,
      months.map((_, index) => index === 0 ? "Today" : `M${index}`), ["This rehearsal", "Starting plan"], "Projected cash", goal)}
    <section class="rehearsal-impact" aria-label="Goal impact">
      <h3>${escapeHtml(goal.label)}</h3>
      <div class="forecast-results"><div><span>Starting plan</span><strong>${rehearsalTarget(startingPlan.chart.values, goal)}</strong></div>
        <div><span>This rehearsal</span><strong>${rehearsalTarget(scenario.chart.values, goal)}</strong></div></div>
      <p class="subtle">${difference}</p>
    </section>
    <dl class="metric-list">${scenario.stats.map(item => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join("")}</dl>
    <ul class="checklist">${scenario.checks.map(item => `<li><span class="${item.met ? "met" : "pending"}">${item.met ? "✓" : "○"}</span>
      ${escapeHtml(item.label)}<span class="sr-only">${item.met ? " met" : " open"}</span></li>`).join("")}</ul>
    <details class="inline-details"><summary>Monthly balances</summary><dl class="metric-list">
      <div><dt>${escapeHtml(scenario.chart.targetLabel)}</dt><dd>${euro(scenario.chart.target)}</dd></div>
      ${months.map((month, i) => `<div><dt>${escapeHtml(month)}</dt><dd>${euro(scenario.chart.values[i])}</dd></div>`).join("")}</dl></details>`;
}

function rehearsalGoal(chart) {
  if (data.id === "lena" && session.plans.some(plan => plan.goal === "buffer" && plan.priorities.includes(1))) {
    return { label: "Three months of essential costs", amount: 3 * data.essentials, throughout: false };
  }
  return { label: data.id === "alex" ? "Fund six months of essential costs" : chart.targetLabel,
    amount: chart.target, throughout: data.id !== "lena" };
}

function rehearsalTarget(values, goal) {
  if (goal.throughout) {
    const shortfall = goal.amount - Math.min(...values);
    return shortfall > 0 ? `${euro(shortfall)} short at the tightest point` : "Covered throughout";
  }
  const month = values.findLastIndex(value => value < goal.amount) + 1;
  if (!month) return "Covered today";
  return month < values.length ? `Covered by month ${month}` : `${euro(goal.amount - values.at(-1))} still needed`;
}

function projectedReadiness(current, projected) {
  const readiness = score => score.dimensions.find(item => item.id === "readiness");
  return groupSummary(readiness(projected), `Projected for this forecast · Current readiness ${scoreText(readiness(current))}`);
}

function planView(score) {
  const plans = describedPlans();
  const plan = plans[0];
  const group = score.dimensions.find(item => item.id === "readiness");
  const extras = assetTotals(session.assets);
  const tab = session.longGoal ?? "events";
  const long = tab === "family" || tab === "retirement" ? longForecast() : null;
  const projection = long ? null : {...lifeForecast(), current:score};
  return `<div class="stack narrow-page">
    <div id="readiness-summary" aria-live="polite">${projectedReadiness(score, long ? long[0].scenarioScore : projection.projected)}</div>
    <section class="card stack long-plan" id="long-plan" aria-labelledby="long-plan-title">
      <div class="row spread wrap"><h2 id="long-plan-title" tabindex="-1">Life events and long-term goals</h2>
        <div class="source-choices" role="group" aria-label="Forecast type">${[["events","Life events"],["family","Family"],["retirement","Retirement"]].map(([key,label]) =>
          `<button type="button" data-action="long-goal" data-id="${key}" aria-pressed="${key === tab}">${label}</button>`).join("")}</div></div>
      ${lifeEventsView(activeEvents(), plans)}
      ${long ? longPlanView(...long) : `
        ${extras.cash ? `<label class="check-option"><input type="checkbox" id="short-assets" ${session.includeShortAssets?"checked":""}> Include ${euro(extras.cash)} added cash in forecasts</label>` : ""}
        ${simulatorView(projection)}`}
    </section>
    <section class="card next-step"><span class="eyebrow">Next step</span>
      <h2>${group.score === null ? "Fill in your readiness information" : "Rehearse your plan"}</h2>
      <p>${escapeHtml(plan?.nextAction ?? "Compare your forecast with and without a life event, then review your next action.")}</p>
      <div class="actions">${button("Save rehearsal", "save-scenario", "secondary")}
        ${group.score === null ? button("View readiness quests", "open-quests") : ""}</div>
    </section>
    ${groupInputs(group, false, "What shapes current readiness?")}
    ${detailedRehearsal()}
  </div>`;
}

function progressView() {
  const timeline = scoreHistory(data, session.activity);
  return `<div class="stack narrow-page">
    ${historyView(timeline, id => activityInfo(data, id).title, scoreTrend(data, session.activity, session.historyRange))}
    <section class="card row spread wrap"><div><h2>Latest scan</h2><p>${scoreText(currentScore())}</p></div>
      ${hasActivity("rescan-reviewed") ? chip("Rescan saved", "green") : button("Save rescan", "save-rescan", "secondary")}
    </section>
    ${annualPulseView(session.measurements.annual)}
    <details class="card details"><summary>Activity log</summary><div class="details-inner"><ol class="activity-list">
      ${session.activity.slice().reverse().map(item => {
        const info = activityInfo(data, item.id);
        return `<li><strong>${escapeHtml(info.title)}</strong><time datetime="${escapeHtml(item.at)}">${dateTime.format(new Date(item.at))}</time>
          ${info.detail ? `<p class="subtle">${escapeHtml(info.detail)}</p>` : ""}</li>`;
      }).join("")}
    </ol></div></details>
  </div>`;
}

function servicesView() {
  const sent = session?.activity.find(item => item.id === "advisor-shared");
  return `<div class="stack mobile-banking">
    ${backButton("bank-home", "Banking overview")}
    <section class="card"><h1>Services</h1><p class="subtle">PULS reports and your demo inbox.</p>
      ${data ? `<div class="actions">${button("Open score details", "report", "secondary")}${button("Copy phone link", "copy-handoff", "quiet")}</div>` : ""}</section>
    <section class="card"><h2>Inbox</h2>
      ${sent ? `<p><strong>PULS brief saved in the demo advisor inbox</strong></p>
        <p class="subtle">${dateTime.format(new Date(sent.at))}</p>
        ${session.advisorBrief ? `<div class="actions">${button("View shared brief", "sent-report", "quiet")}</div>` : ""}`
      : '<p class="subtle">The demo inbox is empty.</p>'}</section>
  </div>`;
}

function fitLearningHeader() {
  const heading = main.querySelector(".learning-heading");
  if (!heading) return;
  document.documentElement.style.setProperty("--learning-header-height", `${heading.getBoundingClientRect().height}px`);
}

function render() {
  healthOutline.disconnect();
  learningLayout.disconnect();
  refreshHeader();
  if (stopIntake) return;
  if (scanTimer !== null) { main.innerHTML = scanInProgress(mode); return; }
  if (onboardingSources) {
    main.innerHTML = `<section class="branch-flow" aria-labelledby="data-sources-title"><div class="branch-inner">
      ${branchSteps(4)}
      ${dataView(session.assets, assetMode, assetPreview, assetError, {duringScan:true, mobile:mode === "phone"})}
    </div></section>`;
    return;
  }
  if (eventDraft) {main.innerHTML = eventWizard(eventDraft);return;}
  if (mode === "phone" && (bankPage || !session || !data)) {
    switch (bankPage) {
      case "invest":
        main.innerHTML = `<div class="stack mobile-banking">${backButton("bank-home", "Banking overview")}<h1>Investments</h1>${portfolioPanel(data)}</div>`;
        return;
      case "services": main.innerHTML = servicesView(); return;
      default: main.innerHTML = bankingHome(data, session, data ? currentScore() : null); return;
    }
  }
  if (!session || !data) { main.innerHTML = branchHome(); return; }

  const score = currentScore();
  const getGroup = id => score.dimensions.find(group => group.id === id);
  let contents;
  switch (detail) {
    case "fitness": contents = fitnessView(data, getGroup("fitness"), mode, cashPosition(), cashAssumptions); break;
    case "behaviour": contents = behaviourView(data, getGroup("behaviour"), session.activity); break;
    case "report": contents = reportView(data, score, describedPlans(), hasActivity("advisor-shared"),
      researchPanels(currentHousehold(), session.measurements), priorityDraft); break;
    case "capability": contents = capabilityView(session.measurements.capability); break;
    case "lesson": contents = lessonView(LESSONS.find(item => item.id === lessonId), session.activity, lessonResult); break;
    case "data": contents = dataView(session.assets, assetMode, assetPreview, assetError, {mobile:mode === "phone"}); break;
    case "weekly": {
      const week = adviceWeek();
      contents = weeklyView(guidance(score), week ? new Intl.DateTimeFormat("en-GB",{dateStyle:"long",timeZone:"UTC"}).format(new Date(week)) : "", weeklyInsight());
      break;
    }
    default:
      switch (session.stage) {
        case 1: contents = planView(score); break;
        case 2: contents = learningView(data, score, session.activity, currentAdvisor()); break;
        case 3: contents = progressView(); break;
        default: contents = scanView(data, score, session, guidance(score));
      }
  }
  main.innerHTML = mode === "phone" ? contents + '<div id="coach-root"></div>' : contents;
  const health = main.querySelector(".main-health");
  if (health) healthOutline.observe(health);
  const heading = main.querySelector(".learning-heading");
  if (heading) {
    fitLearningHeader();
    learningLayout.observe(heading, {box:"border-box"});
  }
  renderCoach();
}

async function loadProfile(candidate, importedProfile, { open = false, promptSources = false } = {}) {
  const version = ++loadVersion;
  if (!importedProfile) main.innerHTML = '<section class="card" role="status">Opening demo banking data…</section>';
  try {
    const profile = importedProfile ?? await getBankingData(candidate.persona);
    if (version !== loadVersion) return;
    const allowed = new Set(["scan-connected", "priorities-updated", "rescan-reviewed", "habit-statement", "advisor-shared", ...PLAN_ACTIONS,
      ...missionsFor(profile).map(item => item.id), ...LESSONS.map(item => item.id)]);
    const seen = new Set();
    const activity = (candidate.activity || []).flatMap(item => {
      if (!allowed.has(item?.id) || (item.id !== "priorities-updated" && seen.has(item.id)) || !Number.isFinite(Date.parse(item.at))) return [];
      seen.add(item.id);
      const details = ["scan-connected","priorities-updated"].includes(item.id)
        ? {priorities:normalizePriorities(item.priorities ?? (item.id === "scan-connected" ? candidate.priorities : {}))} : {};
      return [{id:item.id, at:item.at, ...details}];
    });
    session = { ...candidate, plans: normalizePlans(candidate.plans ?? (candidate.plan ? [candidate.plan] : [])),
      priorities:normalizePriorities(candidate.priorities), assets:normalizeAssets(candidate.assets),
      measurements:normalizeMeasurements(candidate.measurements), activity };
    chat = {open:false, messages:[], pending:false, draft:""};
    weeklyReply = null;
    advisorDraft = null;
    cashAssumptions = {rate:2, years:5};
    longPlanDrafts = {};
    delete session.plan;
    if (Array.isArray(candidate.events)) session.events = normalizeLifeEvents(candidate.events);
    data = { ...profile, priorities:session.priorities };
    bankPage = mode === "phone" && !open ? "bank-home" : null;
    onboardingSources = promptSources;
    detail = promptSources ? "data" : null;
    assetMode = null;
    assetPreview = null;
    assetError = "";
    record("scan-connected", {priorities:session.priorities});
    closeDialog();
    persist();
    resetIdle();
    render();
    moveFocus();
  } catch {
    if (version !== loadVersion) return;
    render();
    announce("The demo bank could not load this profile. Please try again.");
  }
}

function beginIntake(persona) {
  closeDialog();
  stopIntake?.();
  stopIntake = startBranch({
    root: main, persona,
    onCancel: goHome,
    onComplete: ({ persona, plans, priorities }, profile) => {
      stopIntake = null;
      loadProfile({ persona, plans, priorities, stage: 0, activity: [], stress: false }, profile, { open: true, promptSources: true });
    }
  });
  refreshHeader();
  resetIdle();
}

function editGoals() {
  if (!session || !data) return;
  const returnToGoals = () => {
    stopIntake = null;
    render();
    const goals = document.querySelector("#life-goals");
    goals.open = true;
    goals.querySelector("summary").focus();
  };
  stopIntake = startBranch({
    root: main, existingProfile: data, plans: session.plans,
    onCancel: returnToGoals,
    onComplete: ({ plans }) => {
      updateGoals(plans);
      persist();
      returnToGoals();
      announce("Life goals updated.");
    }
  });
  refreshHeader();
}

function navigateTo(stage) {
  if (!session || !Number.isInteger(stage) || stage < 0 || stage >= steps.length) return;
  session.stage = stage;
  bankPage = null;
  detail = null;
  eventDraft = null;
  chat.open = false;
  closeDialog();
  persist();
  render();
  moveFocus();
  if (stage === 2) {
    const next = main.querySelector('.learning-road [aria-current="step"]');
    const first = main.querySelector(".learning-road > li:first-child .road-stop");
    const target = next && next !== first ? next : main.querySelector(".learning-road-map");
    target?.scrollIntoView({block:"end"});
  }
}

function finishOnboarding() {
  if (!onboardingSources || !session) return;
  onboardingSources = false;
  const duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 150 : 1750;
  scanTimer = setTimeout(() => {
    scanTimer = null;
    navigateTo(0);
  }, duration);
  render();
  moveFocus();
}

function openDetail(name) {
  if (!session) return;
  if (name === "report") priorityDraft = normalizePriorities(session.priorities);
  bankPage = null;
  detail = name;
  eventDraft = null;
  chat.open = false;
  closeDialog();
  render();
  moveFocus();
}

function showBankPage(page) {
  if (mode !== "phone") return;
  if (stopIntake) {
    stopIntake();
    stopIntake = null;
  }
  onboardingSources = false;
  clearTimeout(scanTimer);
  scanTimer = null;
  bankPage = page;
  detail = null;
  eventDraft = null;
  chat.open = false;
  closeDialog();
  render();
  moveFocus();
}

function enterMobileBanking() {
  if (mode === "phone") return;
  clearIdle();
  changeMode("phone");
  if (session) {
    showBankPage("bank-home");
    persist();
    return;
  }
  goHome();
  const saved = readSaved();
  if (saved) loadProfile(saved);
}

function openLesson(id) {
  if (!session || !LESSONS.some(lesson => lesson.id === id)) return;
  lessonId = id;
  lessonResult = null;
  session.stage = 2;
  persist();
  openDetail("lesson");
}

function gradeLesson(form) {
  const lesson = LESSONS.find(item => item.id === form.dataset.id);
  const response = new FormData(form).get("answer");
  if (!lesson || response === null) return;
  const answer = Number(response);
  if (answer !== lesson.correct) {
    const feedback = form.querySelector("#lesson-feedback");
    feedback.innerHTML = pipSpeech(lesson.feedback[answer] ?? "Try another answer.", "reassure");
    feedback.scrollIntoView({ block: "nearest" });
    return;
  }
  const first = !hasActivity(lesson.id);
  const literacy = () => currentScore().dimensions.find(group => group.id === "literacy").score;
  const before = literacy();
  record(lesson.id);
  lessonResult = { first, before, after: literacy(), feedback: lesson.feedback[answer] };
  render();
  moveFocus();
}

function reviewHabit() {
  const sample = habitStatementFor(data);
  if (!sample || hasActivity(sample.id)) return;
  showDialog(sample.title, `<p>${escapeHtml(sample.evidence)}</p>
    <p class="subtle">Sample statement dated ${escapeHtml(sample.asOf)}</p>
    <div class="actions">${button(sample.action, "habit-confirm")}</div>`);
}

function openMission(id) {
  const quest = missionsFor(data).find(item => !hasActivity(item.id));
  if (!quest || quest.id !== id) return;
  if (quest.question) {
    showDialog(quest.title, `<p><strong>${escapeHtml(quest.question)}</strong></p>
      <form id="quest-quiz" data-id="${id}">${quest.choices.map((choice, i) => `<label class="quiz-choice">
        <input type="radio" name="answer" value="${i}" required> ${escapeHtml(choice)}</label>`).join("")}
        <p class="message" id="quest-feedback" role="status"></p>
        <button class="button" type="submit">${escapeHtml(quest.action)}</button></form>`);
    return;
  }
  showDialog(quest.title, `<p>${escapeHtml(quest.description)}</p><p class="subtle">${escapeHtml(quest.evidence)}</p>
    <div class="actions">${button(escapeHtml(quest.action), "complete-mission", "", `data-id="${id}"`)}</div>`);
}

function completeMission(id) {
  const quest = missionsFor(data).find(item => !hasActivity(item.id));
  if (!quest || quest.id !== id) return;
  record(quest.id);
  closeDialog();
  render();
  focusQuest();
  announce(`Quest complete · +${quest.xp} XP`);
}

function focusQuest() {
  const target = main.querySelector('.road-quest [data-action="mission"]') ?? main.querySelector(".road-quest");
  target?.scrollIntoView({block:"center"});
  target?.focus({preventScroll:true});
}

function selectHistoryPoint(index) {
  const timeline = scoreHistory(data, session.activity);
  const point = timeline[index];
  if (!point) return;
  main.querySelectorAll("[data-action=history-point]").forEach(node => node.setAttribute("aria-pressed", String(Number(node.dataset.index) === index)));
  document.querySelector("#history-detail").innerHTML = historyPointDetail(point, activityInfo(data, point.id).title);
}

function editEvent(index) {
  const events = activeEvents();
  const existing = events[index];
  if (!existing && (index !== "new" || events.length >= MAX_LIFE_EVENTS)) return;
  const preset = LIFE_CHANGES.find(item => item.id === existing?.id) ?? LIFE_CHANGES[0];
  eventDraft = {index,step:0,id:preset.id,amount:existing?.amount??preset.defaultAmount,month:existing?.month??1};
  closeDialog();
  render();
  moveFocus();
}

function advanceEvent(form) {
  const answer = new FormData(form).get("answer");
  if (!eventDraft || answer === null) return;
  if (eventDraft.step === 0) {
    const preset = LIFE_CHANGES.find(item=>item.id===answer);
    if (!preset) return;
    if (eventDraft.id !== preset.id) eventDraft.amount = preset.defaultAmount;
    eventDraft.id = preset.id;
  } else if (eventDraft.step === 1) {
    eventDraft.amount = Number(answer);
  } else {
    const month = Number(answer);
    if (!Number.isInteger(month) || month < 1 || month > MAX_EVENT_MONTH) return;
    const events = activeEvents();
    const original = events[Number(eventDraft.index)];
    const next = {...original, id:eventDraft.id,amount:eventDraft.amount,month};
    if (eventDraft.index === "new") events.push(next);
    else events[Number(eventDraft.index)] = next;
    setEvents(events, true);
    return;
  }
  eventDraft.step += 1;
  render();
  moveFocus();
}

function setEvents(events, saved = false) {
  eventDraft = null;
  session.events = normalizeLifeEvents(events);
  if (saved) record("scenario-reviewed");
  persist();
  closeDialog();
  render();
  main.querySelector("#plan-title")?.focus();
}

function renderCoach() {
  const root = document.querySelector("#coach-root");
  if (!root || !session) return;
  if (!root.firstElementChild) root.innerHTML = chatView();
  const panel = root.querySelector("#coach-panel");
  panel.hidden = !chat.open;
  panel.innerHTML = chat.open ? chatPanel(chat) : "";
  const input = root.querySelector("#coach-input");
  if (input.value !== chat.draft) input.value = chat.draft;
  root.querySelector(".coach-send").disabled = chat.pending;
  const log = root.querySelector(".coach-messages");
  if (log) log.scrollTop = log.scrollHeight;
}

let coachAvailability;

function liveCoachAvailable() {
  coachAvailability ??= fetch(new URL("api/health", import.meta.url), {
    signal: AbortSignal.timeout(2000)
  }).then(async response => {
    if (!response.ok) return false;
    const health = await response.json();
    return health.status === "ok" && health.aiConfigured === true;
  }).catch(() => false);
  return coachAvailability;
}

function coachPayload() {
  return {persona:session.persona, completed:evidenceIds(), priorities:session.priorities,
    plans:session.plans, events:activeEvents(), imports:session.assets.length ? assetTotals(session.assets) : null};
}

async function requestCoach(payload, owner) {
  try {
    if (!await liveCoachAvailable() || session !== owner) return null;
    const response = await fetch(new URL("api/coach",import.meta.url),{
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload),
      signal:AbortSignal.timeout(19000)
    });
    if (!response.ok) return null;
    const live = await response.json();
    if (typeof live.answer !== "string" || !live.answer.trim()) return null;
    return {
      answer:live.answer.slice(0,2400), source:live.source === "ai" ? "ai" : "demo",
      ...(Object.hasOwn(live, "destination") ? {action:coachDestination(live.destination)} : {}),
      ...(coachReaction(live.reaction) ? {reaction:live.reaction} : {})
    };
  } catch { return null; }
}

function weeklyInsight() {
  const payload = {...coachPayload(), kind:"weekly"};
  const key = JSON.stringify(payload);
  if (weeklyReply?.key === key) return weeklyReply;
  const owner = session;
  const entry = {key, pending:true};
  weeklyReply = entry;
  void requestCoach(payload, owner).then(result => {
    if (session !== owner || weeklyReply !== entry) return;
    Object.assign(entry, {pending:false, source:result?.source, answer:result?.answer});
    if (detail === "weekly" && !bankPage) render();
  });
  return entry;
}

async function sendQuestion(question) {
  if (!session || !question.trim() || chat.pending) return;
  const owner = session;
  const payload = coachPayload();
  const score = currentScore();
  const context = coachContext(data, score, session.activity, payload.imports, {
    plans:session.plans, events:payload.events, advice:guidance(score)
  });
  let reply = localCoach(question,context);
  chat.open = true;
  chat.pending = true;
  chat.draft = "";
  chat.messages = [...chat.messages.slice(-6),{role:"user",text:question}];
  renderCoach();
  const live = await requestCoach({...payload,question}, owner);
  if (live) reply = {...reply,...live};
  if (session !== owner) return;
  chat.messages.push({role:"pip",text:reply.answer,source:reply.source,action:reply.action,reaction:reply.reaction});
  chat.pending = false;
  renderCoach();
}

function followCoach(type,id) {
  if (type === "lesson") openLesson(id);
  else if (type === "simulator") {
    session.longGoal = "events";
    navigateTo(1);
  }
  else if (type === "advisor") previewReport();
  else if (type === "long-plan") {
    session.longGoal = id === "retirement" || (id !== "family" && session.longGoal === "retirement") ? "retirement" : "family";
    navigateTo(1);
    document.querySelector("#long-plan-title")?.focus();
  } else if (type === "progress") navigateTo(3);
  else if (type === "learn") {
    navigateTo(2);
    if (id === "videos") main.querySelector(".road-video")?.focus();
  } else if (type === "invest") showBankPage("invest");
  else if (type === "priorities") {
    openDetail("report");
    showPriorityEditor();
  }
  else if (["behaviour","fitness","data","report"].includes(type)) {
    openDetail(type);
    if (type === "fitness" && id === "cash") document.querySelector("#cash-allocation-title")?.focus();
  }
}

function showPriorityEditor() {
  const editor = main.querySelector("#score-priorities");
  if (!editor) return;
  editor.open = true;
  editor.querySelector("summary").focus();
}

function saveAssets(items) {
  const next = items.map((item,i)=>({...item,id:item.id ?? globalThis.crypto?.randomUUID?.() ?? `asset-${Date.now()}-${i}`}));
  const before = session.assets.length;
  session.assets = normalizeAssets([...session.assets,...next]);
  const added = session.assets.length-before;
  assetPreview = null;
  assetError = "";
  assetMode = null;
  persist();
  render();
  announce(added ? `${added} ${added===1?"asset":"assets"} added.` : "These assets are already listed or the demo limit has been reached.");
}

async function loadAssetPreview() {
  const owner = session;
  try {
    const response = await fetch(new URL("api/banking/linked-accounts.json",import.meta.url));
    if (!response.ok) throw new Error("The sample bank is unavailable.");
    const bank = await response.json();
    if (session !== owner || detail !== "data" || assetMode !== "bank") return;
    assetPreview = normalizeAssets(bank.accounts);
    assetError = assetPreview.length ? "" : "The sample bank returned no balances.";
  } catch {
    if (session !== owner || detail !== "data" || assetMode !== "bank") return;
    assetError = "The sample bank is unavailable.";
  }
  render();
}

async function readAssetFile(file) {
  const owner = session;
  try {
    if (!file || file.size > 100000) throw new Error("Choose a CSV report under 100 KB.");
    const rows = parseAssetReport(await file.text());
    if (session !== owner || mode !== "phone" || detail !== "data" || assetMode !== "csv") return;
    assetPreview = rows;
    assetError = "";
  } catch (error) {
    if (session !== owner || mode !== "phone" || detail !== "data" || assetMode !== "csv") return;
    assetPreview = null;
    assetError = error.message;
  }
  render();
}

async function copyPhoneLink() {
  try {
    await navigator.clipboard.writeText(createHandoff(session));
    announce("Phone link copied. It’s valid for 10 minutes.");
  } catch {
    announce("The phone link couldn’t be copied. Use Mobile banking to continue here.");
  }
}

function reportCsv() {
  const score = currentScore();
  const plans = describedPlans();
  const rows = [
    ["PULS score details", "Demo data"],
    ["Profile", PERSONAS[data.id].name],
    ["Score", scoreText(score)],
    ["Weighted coverage", `${score.coverage}%`],
    ["Banking snapshot", data.asOf],
    ["Topics emphasized", focusLabels(session.priorities).join(" | ")],
    ["Topics de-emphasized", focusLabels(session.priorities, -1).join(" | ")],
    ...plans.flatMap(plan => [["Goal", plan.goal], ["Horizon", plan.horizon],
      ["Priorities", plan.priorities.join(" | ")], ["Preparedness", plan.preparedness]]),
    [],
    ["Dimension", "Metric", "Input", "Source", "Weight", "Weighted points", "Rule"]
  ];
  for (const group of score.dimensions) {
    for (const metric of group.metrics) {
      rows.push([group.label, metric.label, metric.missing ? "Missing" : metric.input,
        metric.source, `${decimal(metric.weight)}%`, metric.missing ? "" : metric.contribution.toFixed(2), metric.rule]);
    }
  }
  const quote = item => `"${String(item).replaceAll('"', '""')}"`;
  return rows.map(row => row.map(quote).join(",")).join("\r\n");
}

function downloadText(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportReport() {
  downloadText("\ufeff" + reportCsv(), `PULS-score-details-${data.id}.csv`, "text/csv;charset=utf-8");
  announce("Score details exported.");
}

function buildAdvisorBrief(support) {
  const score = currentScore();
  const plans = describedPlans();
  const focus = focusLabels(session.priorities);
  const cash = cashPosition();
  const events = activeEvents();
  const forecast = events.length ? lifeForecast() : null;
  const low = forecast?.scenarioCash.every(Number.isFinite) ? Math.min(...forecast.scenarioCash) : null;
  const missing = score.missing.map(item => item.label);
  return [
    `PULS meeting brief · ${PERSONAS[data.id].name}`,
    `Banking snapshot ${data.asOf} · PULS ${scoreText(score)} · ${score.coverage}% weighted coverage`,
    `Score weights · ${score.dimensions.map(area => `${area.label} ${area.weight}%`).join(" · ")}`,
    ...(focus.length ? [`Priority topics · ${focus.join(", ")}`] : []),
    "", "Goals",
    ...(plans.length ? plans.map(plan => `• ${plan.goal} · ${plan.horizon} · ${plan.priorities.join(", ")}`) : ["• No goals recorded"]),
    "", "Cash and portfolio",
    `• Accessible cash ${euro(cash.available)}${cash.demoSavings ? ` (includes ${euro(cash.demoSavings)} in demo savings)` : ""} · Reserve target ${euro(cash.reserve)} · Unallocated cash ${euro(cash.unallocated)}`,
    `• Recorded portfolio ${euro(data.depot?.total)}${Number.isFinite(data.depot?.largestHolding?.share) ? ` · Largest issuer ${data.depot.largestHolding.share}%` : ""}`,
    ...(forecast ? [`• ${forecast.horizon}-month what-if forecast · Lowest projected balance ${euro(low)}`,
      ...events.map(event => `  Month ${event.month} · ${LIFE_CHANGES.find(item => item.id === event.id).label} · ${euro(event.amount)}`)] : []),
    ...(missing.length ? [`• Inputs to verify · ${missing.join(", ")}`] : []),
    "", "Questions for the meeting", ...support.agenda.map(item => `• ${item}`)
  ].join("\n");
}

function previewReport() {
  const support = currentAdvisor();
  advisorDraft = buildAdvisorBrief(support);
  showDialog(support.wealth ? "Prepare a wealth conversation" : "Prepare a meeting brief",
    `<p>${escapeHtml(support.reason)}</p><p>${escapeHtml(support.help)}</p>
    <pre class="sent-report" aria-label="Brief preview">${escapeHtml(advisorDraft)}</pre>
    <div class="actions">
      ${button("Download brief","download-brief","quiet")}
      ${button("Share in demo inbox","send-report","secondary")}
      <a class="button" href="${support.booking}" target="_blank" rel="noopener">${support.wealth ? "Request a Wealth Management meeting" : "Schedule a meeting"}</a>
    </div>
    ${support.services ? `<p class="subtle"><a href="${support.services}" target="_blank" rel="noopener">Explore DB Wealth Management services</a></p>` : ""}`);
}

function sendReport() {
  if (!session || !advisorDraft) return;
  session.advisorBrief = advisorDraft;
  session.activity = session.activity.filter(item => item.id !== "advisor-shared");
  record("advisor-shared");
  closeDialog();
  render();
  announce("Brief saved in the demo advisor inbox.");
}

function endPrompt() {
  showDialog("End the branch session?", `<p>The terminal will clear the demo scan.</p><div class="actions">
    ${button("Keep working", "dismiss", "quiet")}${session ? button("Open mobile banking", "phone", "secondary") : ""}
    ${button("End session", "end-confirm")}</div>`);
}

document.addEventListener("click", async event => {
  const vote = event.target.closest("[data-priority]");
  if (vote?.closest("#priority-form") && detail === "report" && !stopIntake) {
    changePriority(vote.closest("#priority-form"), priorityDraft, vote);
    return;
  }
  const trigger = event.target.closest("[data-action]");
  if (!trigger || trigger.disabled) return;
  const { action, id, index } = trigger.dataset;
  switch (action) {
    case "branch": if (mode === "terminal" && !session) beginIntake(); break;
    case "mobile-start":
      showDialog("Choose a demo profile", `<div class="profile-options">${Object.values(PERSONAS).map(persona =>
        button(escapeHtml(persona.name + " · " + persona.event), "profile", "quiet", `data-id="${persona.id}"`)).join("")}</div>`);
      break;
    case "profile": if (Object.hasOwn(PERSONAS, id)) beginIntake(id); break;
    case "home":
      if (mode === "terminal" && (session || stopIntake)) endPrompt();
      else if (mode === "phone") showBankPage("bank-home");
      else goHome();
      break;
    case "bank-home": case "invest": case "services": showBankPage(action); break;
    case "end": endPrompt(); break;
    case "end-confirm": goHome(); announce("Branch session cleared."); break;
    case "keep-session": clearIdle(); resetIdle(); break;
    case "dismiss": closeDialog(); break;
    case "stage": navigateTo(Number(index)); break;
    case "back-puls": navigateTo(0);break;
    case "open-puls": navigateTo(session?.stage ?? 0); break;
    case "dimension":
      if (id === "literacy") navigateTo(2);
      else if (id === "readiness") navigateTo(1);
      else if (id === "fitness" || id === "behaviour") openDetail(id);
      break;
    case "report": openDetail("report"); break;
    case "capability": openDetail("capability"); break;
    case "retirement-forecast":
      if (session) {
        session.longGoal = "retirement";
        followCoach("long-plan");
      }
      break;
    case "save-annual":
      if (session && data) {
        const { measurements } = session;
        const entry = annualCheckpoint(currentScore(), measurements.wellBeing, currentHousehold().net);
        measurements.annual = [entry, ...measurements.annual.filter(item => item.year !== entry.year)]
          .sort((a,b) => b.year - a.year);
        persist();
        render();
        main.querySelector('[data-action="save-annual"]').focus({ preventScroll:true });
        announce("Annual snapshot saved.");
      }
      break;
    case "data": assetMode = null; assetPreview = null; assetError = ""; openDetail("data");break;
    case "finish-sources": finishOnboarding(); break;
    case "csv-phone": main.querySelector("#csv-phone-hint")?.classList.add("is-visible"); break;
    case "asset-mode":
      if (["bank","manual"].includes(id) || (id === "csv" && mode === "phone")) {
        assetMode = id;
        assetPreview = null;
        assetError = "";
        render();
      }
      break;
    case "asset-bank": await loadAssetPreview();break;
    case "asset-confirm":
      if (assetPreview?.length && (assetMode !== "csv" || mode === "phone")) saveAssets(assetPreview);
      break;
    case "asset-remove":
      session.assets = session.assets.filter((_,i)=>i!==Number(index));
      persist();render();
      break;
    case "weekly":
      if (weeklyReply && !weeklyReply.pending && weeklyReply.source !== "ai") weeklyReply = null;
      session.adviceReadWeek = adviceWeek();
      persist();
      openDetail("weekly");
      break;
    case "coach-next": followCoach(id,trigger.dataset.next);break;
    case "chat-toggle":
      chat.open = false;renderCoach();
      break;
    case "long-goal":
      if (["events","family","retirement"].includes(id)) {
        session.longGoal = id;
        persist();
        render();
        document.querySelector('#long-plan [aria-pressed="true"]').focus({ preventScroll: true });
      }
      break;
    case "forecast-step": {
      const field = document.querySelector(`#long-${id}`);
      const slider = field.form.querySelector(`[data-long-slider="${id}"]`);
      const value = slider.valueAsNumber + Number(trigger.dataset.change);
      field.value = String(Math.max(Number(field.min), Math.min(Number(field.max), Math.round(value * 10) / 10)));
      previewLongPlan(field);
      break;
    }
    case "export": if (data) exportReport(); break;
    case "advisor": if (data) previewReport(); break;
    case "download-brief":
      if (advisorDraft) downloadText(advisorDraft, `PULS-meeting-brief-${data.id}.txt`, "text/plain;charset=utf-8");
      break;
    case "send-report": if (data) sendReport(); break;
    case "sent-report":
      if (session?.advisorBrief) showDialog("Shared brief", `<pre class="sent-report">${escapeHtml(session.advisorBrief)}</pre>`);
      break;
    case "edit-event": editEvent(index); break;
    case "edit-goals": editGoals(); break;
    case "event-cancel": eventDraft = null;render();moveFocus();break;
    case "event-back":
      if (eventDraft?.step>0) {eventDraft.step-=1;render();moveFocus();}
      break;
    case "remove-event": setEvents(activeEvents().filter((_, i) => i !== Number(index))); break;
    case "save-scenario":
      record("scenario-reviewed");
      render();
      main.querySelector('[data-action="save-scenario"]').focus({preventScroll:true});
      announce("Rehearsal saved.");
      break;
    case "save-rescan": record("rescan-reviewed"); render(); announce("Rescan saved."); break;
    case "open-quests": navigateTo(2); focusQuest(); break;
    case "learn": navigateTo(2); break;
    case "lesson": openLesson(id); break;
    case "mission": openMission(id); break;
    case "complete-mission": completeMission(id); break;
    case "habit": reviewHabit(); break;
    case "habit-confirm":
      record("habit-statement");
      closeDialog();
      render();
      announce("Savings follow-up added to your score history.");
      break;
    case "history-point": selectHistoryPoint(Number(index)); break;
    case "history-range": {
      if (!HISTORY_RANGES.some(range => range.id === id)) break;
      session.historyRange = id;
      persist();
      const trend = document.querySelector("#history-trend");
      trend.innerHTML = historyTrendView(scoreTrend(data, session.activity, id));
      trend.querySelector('[aria-pressed="true"]').focus({ preventScroll: true });
      break;
    }
    case "show-history": navigateTo(3); break;
    case "copy-handoff": if (session) await copyPhoneLink(); break;
    case "phone": enterMobileBanking(); break;
    case "terminal":
      if (mode !== "terminal") { changeMode("terminal"); goHome(); }
      break;
  }
});

document.addEventListener("submit", async event => {
  const form = event.target;
  if (form.id === "lesson-quiz") {
    event.preventDefault();
    gradeLesson(form);
  } else if (form.id === "priority-form") {
    event.preventDefault();
    if (!session || detail !== "report") return;
    const priorities = normalizePriorities(priorityDraft);
    if (JSON.stringify(priorities) !== JSON.stringify(session.priorities)) {
      session.priorities = priorities;
      data = {...data, priorities};
      record("priorities-updated", {priorities});
    }
    render();
    showPriorityEditor();
    announce("Priorities saved.");
  } else if (form.id === "capability-form") {
    event.preventDefault();
    if (!session || !form.checkValidity()) return;
    const answers = Object.fromEntries([...new FormData(form)].map(([id,value]) => [id, Number(value)]));
    const { capability } = normalizeMeasurements({capability:{at:new Date().toISOString(), answers}});
    if (!capability) return;
    session.measurements.capability = capability;
    persist();
    render();
    main.querySelector("#capability-result").focus();
  } else if (form.id === "cfpb-form") {
    event.preventDefault();
    if (!session || !form.checkValidity()) return;
    const fields = new FormData(form);
    const total = Number(fields.get("total")), ageBand = fields.get("ageBand"), mode = fields.get("mode");
    if (cfpbScore(total,ageBand,mode) === null) return;
    session.measurements.wellBeing = {at:new Date().toISOString(), total, ageBand, mode};
    persist();
    render();
    main.querySelector("#cfpb-result").focus();
  } else if (form.id === "quest-quiz") {
    event.preventDefault();
    const quest = missionsFor(data).find(item => item.id === form.dataset.id);
    const answer = new FormData(form).get("answer");
    if (quest && answer !== null && Number(answer) === quest.correct) completeMission(quest.id);
    else form.querySelector("#quest-feedback").textContent = "Try again. Think about which money is available when you need it.";
  } else if (form.id === "event-wizard") {
    event.preventDefault();
    advanceEvent(form);
  } else if (form.id === "coach-form") {
    event.preventDefault();
    await sendQuestion(String(new FormData(form).get("question")??"").trim().slice(0,700));
  } else if (form.id === "asset-csv") {
    event.preventDefault();
    if (mode === "phone") await readAssetFile(new FormData(form).get("report"));
  } else if (form.id === "asset-manual") {
    event.preventDefault();
    const fields = new FormData(form);
    const name = String(fields.get("name")??"").trim();
    const type = fields.get("type");
    if (!name || !Object.hasOwn(ASSET_TYPES,type)) {
      assetError = "Enter an asset name and type.";
      render();
      return;
    }
    saveAssets([{name,type,value:Number(fields.get("value")),source:"Manual"}]);
  } else if (form.id === "long-plan-form") {
    event.preventDefault();
    const goal = longInputs().goal;
    session.longPlans = {...session.longPlans, [goal]: readLongPlan(form)};
    delete longPlanDrafts[goal];
    record(`${goal}-forecast-saved`);
    persist();
    render();
    main.querySelector('#long-plan-form button[type="submit"]').focus({preventScroll:true});
    announce("Forecast saved.");
  }
});

document.addEventListener("change", event => {
  if (event.target.id === "cash-years") {
    cashAssumptions.years = Number(event.target.value);
    document.querySelector("#cash-impact").innerHTML = cashImpactView(cashPosition(), cashAssumptions);
  }
  if (event.target.id === "forecast-horizon") {
    const months = Number(event.target.value);
    if (!FORECAST_WINDOWS.includes(months)) return;
    session.forecastMonths = months;
    persist();
    render();
    document.querySelector("#forecast-horizon")?.focus({preventScroll: true});
  }
  if (event.target.id === "short-assets") {
    session.includeShortAssets = event.target.checked;
    persist();render();
  }
});

document.addEventListener("input", event => {
  if (event.target.id === "cash-inflation" && event.target.validity.valid) {
    cashAssumptions.rate = event.target.valueAsNumber;
    document.querySelector("#cash-impact").innerHTML = cashImpactView(cashPosition(), cashAssumptions);
  }
  if (event.target.form?.id === "long-plan-form") {
    previewLongPlan(event.target);
    return;
  }
  if (event.target.id === "coach-input") chat.draft = event.target.value;
  if (!["scenario-value", "scenario-stress"].includes(event.target.id)) return;
  const slider = document.querySelector("#scenario-value");
  session.scenario = slider.valueAsNumber;
  session.stress = document.querySelector("#scenario-stress").checked;
  const scenario = scenarioFor(data, evidenceIds(), session.scenario, session.stress);
  document.querySelector("#scenario-value-out").textContent = euro(scenario.value);
  slider.setAttribute("aria-valuetext", euro(scenario.value));
  document.querySelector("#rehearsal-result").innerHTML = rehearsalResult(scenario);
  persist();
});

document.addEventListener("focusin", event => {
  if (event.target.id !== "coach-input" || chat.open) return;
  chat.open = true;
  renderCoach();
});

idleDialog.addEventListener("cancel", event => event.preventDefault());
for (const name of ["pointerdown", "keydown", "input", "touchstart"]) {
  document.addEventListener(name, resetIdle, { passive: true });
}

function start() {
  let resumed;
  let issue;
  if (url.hash.startsWith("#resume=")) {
    try {
      resumed = readHandoff();
    } catch (error) {
      issue = error.message;
    }
    url.hash = "";
    history.replaceState(null, "", url);
  }
  if (resumed) {
    changeMode("phone");
    loadProfile(resumed);
  } else {
    const saved = mode === "phone" && !issue ? readSaved() : null;
    if (saved) loadProfile(saved);
    else render();
    if (issue) announce(issue);
  }
}

start();

