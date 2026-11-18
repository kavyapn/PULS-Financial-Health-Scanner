import { ASSET_TYPES, assetTotals } from "./assets-data.js";
import { button, escapeHtml, euro, pipSpeech, scoreText } from "./puls-ui.js";
import { cashGraph } from "./insights.js";
import { LIFE_CHANGES, MAX_EVENT_MONTH } from "./growth.js";
import { mascot } from "./coaching.js";

export function dataView(assets, source, preview, error, {duringScan = false, mobile = false} = {}) {
  const mode = source === "csv" && !mobile ? null : source;
  const waysToAdd = mobile ? "add another account, import a report or enter assets" : "add another account or enter assets";
  const totals = assetTotals(assets);
  const add = mode === "manual" ? `<form id="asset-manual" class="stack">
    <label class="field">Asset name<input name="name" maxlength="80" autocomplete="off" required placeholder="e.g. Savings account"></label>
    <label class="field">Asset type<select name="type">${Object.entries(ASSET_TYPES).map(([key,label])=>`<option value="${key}">${label}</option>`).join("")}</select></label>
    <label class="field">Value (€)<input name="value" type="number" inputmode="decimal" min="0" max="1000000000" step="0.01" required></label>
    <button class="button" type="submit">Add asset</button>
  </form>` : mode === "csv" ? `<form id="asset-csv" class="stack">
    <p class="subtle">Choose a CSV with columns Name, Type and Value. Use cash, investment or other for the type.</p>
    <label class="field">CSV report<input type="file" name="report" accept=".csv,text/csv" required></label>
    <button class="button" type="submit">Review import</button>
  </form>` : mode === "bank" ? `<p class="subtle">Connect a sample partner bank to preview its read-only balances.</p>${button("Preview bank balances","asset-bank")}` : "";
  return `<div class="stack narrow-page sources-page">
    <h1 id="data-sources-title">Add data sources</h1><p class="subtle">${duringScan
      ? `You can ${waysToAdd} before opening your score.`
      : "Add assets for a fuller view. You can include accessible cash in your forecasts."}</p>
    <div class="source-choices" role="group" aria-label="Ways to add data">
      ${[["bank","Connect a bank"],["csv","Import a CSV"],["manual","Add manually"]].map(([id,label]) => id === "csv" && !mobile
        ? '<button type="button" data-action="csv-phone" aria-disabled="true" aria-describedby="csv-phone-hint">Import a CSV</button>'
        : `<button type="button" data-action="asset-mode" data-id="${id}" aria-pressed="${mode===id}">${label}</button>`).join("")}
    </div>
    ${mobile ? "" : '<p class="csv-phone-hint subtle" id="csv-phone-hint" role="status">CSV import is available on your phone in Mobile banking.</p>'}
    ${mode ? `<section class="card stack" aria-label="Add assets">${preview?.length ? `<h2>Review these assets</h2>
      <dl class="metric-list">${preview.map(item=>`<div><dt>${escapeHtml(item.name)}</dt><dd>${euro(item.value)}</dd></div>`).join("")}</dl>
      ${button("Confirm import","asset-confirm")}` : add}
      ${error ? `<p class="message" role="alert">${escapeHtml(error)}</p>` : ""}</section>` : ""}
    <section class="card stack"><h2>Your added assets</h2>
      ${assets.length ? `<div class="forecast-results"><div><span>Accessible cash</span><strong>${euro(totals.cash)}</strong></div>
        <div><span>Investments and other</span><strong>${euro(totals.investment+totals.other)}</strong></div></div>
        <ul class="added-assets">${assets.map((item,i)=>`<li><span><strong>${escapeHtml(item.name)}</strong><small>${ASSET_TYPES[item.type]} · ${item.source}</small></span>
          <span><strong>${euro(item.value)}</strong><button class="back-button" type="button" data-action="asset-remove" data-index="${i}" aria-label="Remove ${escapeHtml(item.name)}">Remove</button></span></li>`).join("")}</ul>`
        : '<p class="subtle">No additional assets yet.</p>'}
    <p class="subtle">The measured score uses your verified banking snapshot. Added assets are stored in this demo on this device.</p>
    ${duringScan ? `<div class="actions">${button("View my PULS score", "finish-sources")}</div>` : ""}
    </section>
  </div>`;
}

export function eventWizard(draft) {
  const preset = LIFE_CHANGES.find(item=>item.id===draft.id);
  const titles = ["What’s changing?", preset.amountLabel, "When will it start?"];
  const current = draft.step;
  return `<section class="branch-flow" aria-labelledby="event-title"><div class="branch-inner">
    <ol class="branch-steps" aria-label="Life event setup">${["Event","Amount","Timing"].map((label,i)=>
      `<li class="${i<current?"done":""}" ${i===current?'aria-current="step"':""}><span aria-hidden="true">${i<current?"✓":i+1}</span>${label}</li>`).join("")}</ol>
    <div class="branch-heading"><h1 id="event-title">${titles[current]}</h1>${button("Cancel","event-cancel","quiet branch-exit")}</div>
    <div class="branch-content"><form id="event-wizard">
      ${current===0 ? `<fieldset class="branch-options"><legend class="sr-only">Life event</legend>
        ${LIFE_CHANGES.map(item=>`<label class="branch-option"><input type="radio" name="answer" value="${item.id}" ${item.id===draft.id?"checked":""} required>${item.label}</label>`).join("")}</fieldset>`
      : current===1 ? `<p class="branch-lead">${escapeHtml(preset.description)}</p><label class="field event-amount-field">${preset.amountLabel} (€)
        <input type="number" name="answer" inputmode="numeric" min="${preset.min}" max="${preset.max}" step="1" value="${draft.amount}" required></label>`
      : `<label class="field event-amount-field">Months from now
        <input type="number" name="answer" inputmode="numeric" min="1" max="${MAX_EVENT_MONTH}" step="1"
          value="${draft.month}" aria-describedby="event-month-hint" required></label>
        <p class="subtle" id="event-month-hint">Month 1 is next month. You can plan up to ${MAX_EVENT_MONTH/12} years ahead.</p>`}
      <div class="actions">${current>0 ? button("Back","event-back","quiet") : draft.index!=="new" ? button("Remove event","remove-event","quiet",`data-index="${draft.index}"`) : ""}
        <button type="submit" class="button">${current===2?"Save event":"Continue"} <span aria-hidden="true">→</span></button></div>
    </form></div>
  </div></section>`;
}

function forecastControl(name, label, value, min, max, step = 1, adjustment = step) {
  const labelText = label.toLowerCase();
  const progress = (value - min) / (max - min) * 100;
  return `<div class="long-control"><div class="row spread">
    <label for="long-${name}">${label}</label>
    <div class="forecast-stepper">
      <button type="button" data-action="forecast-step" data-id="${name}" data-change="${-adjustment}" aria-label="Decrease ${labelText}">−</button>
      <input id="long-${name}" name="${name}" type="number" inputmode="${step === 1 ? "numeric" : "decimal"}"
        min="${min}" max="${max}" step="${step}" value="${value}" required>
      <button type="button" data-action="forecast-step" data-id="${name}" data-change="${adjustment}" aria-label="Increase ${labelText}">+</button>
    </div></div>
    <input type="range" aria-label="Adjust ${labelText}" data-long-slider="${name}"
      min="${min}" max="${max}" step="${step}" value="${value}" style="--slider-progress:${progress}%">
  </div>`;
}

export function longPlanView(result, availableAssets, included) {
  const retirement = result.goal === "retirement";
  return `<div class="stack life-card">
    <div class="stack" id="long-plan-preview">${longPlanPreview(result)}</div>
    <form id="long-plan-form" class="long-plan-controls">
      ${forecastControl("years", retirement ? "Years until retirement" : "Years until the family change", result.years, 1, 50)}
      ${retirement ? "" : forecastControl("cost", "Additional one-time cost (€)", result.cost, 0, 1000000, 1, 500)}
      ${forecastControl("monthly", retirement ? "Estimated monthly income in retirement (€)" : "Additional monthly family costs (€)", result.monthly, 0, 20000, 1, 50)}
      ${availableAssets ? `<label class="check-option"><input type="checkbox" name="includeAssets" ${included?"checked":""}> Include added ${retirement?"cash and investments":"cash"}</label>` : ""}
      <details class="inline-details"><summary>Return assumption</summary>
        ${forecastControl("annualReturn", "Annual return after inflation (%)", result.annualReturn, -5, 8, .1)}</details>
      <button class="button" type="submit">Save forecast</button>
    </form>
  </div>`;
}

export function longPlanPreview(result) {
  const retirement = result.goal === "retirement";
  const format = value => value < 0 ? `${euro(-value)} shortfall` : euro(value);
  return `<h3>${retirement ? `Retirement at age ${result.ageAtGoal}` : `Family plan in ${result.years} ${result.years===1?"year":"years"}`}</h3>
      <div class="forecast-results"><div><span>At the goal</span><strong>${format(result.atGoal)}</strong></div>
        <div><span>${result.afterwards} years later</span><strong>${format(result.final)}</strong></div></div>
      ${cashGraph(result.baselinePath,result.scenarioPath,result.ticks.map(year=>year?`Y${year}`:"Today"),[result.includedEvents ? "With goal and events" : "With goal","Current pattern"],"Projected balance")}
      <div class="forecast-results" aria-label="Estimated PULS after the goal">
        <div><span>PULS · Current pattern</span><strong>${scoreText(result.baselineScore)}</strong></div>
        <div><span>PULS · With goal</span><strong>${scoreText(result.scenarioScore)}</strong></div>
      </div>
      <details class="inline-details"><summary>What this uses</summary>
        <dl class="metric-list"><div><dt>Recent average income</dt><dd>${euro(result.income)} / month</dd></div>
        <div><dt>Recent average spending</dt><dd>${euro(result.spending)} / month</dd></div>
        <div><dt>Starting balance</dt><dd>${euro(result.starting)}</dd></div>
        <div><dt>After the goal</dt><dd>${euro(result.futureNet)} net / month</dd></div></dl>
        <p class="subtle">In today’s euros. The current pattern uses recent average income and spending. The goal forecast also applies scheduled events when they are due. ${retirement?"The retirement balance includes cash and investments.":"Additional family costs count as essentials."} Projected funding readiness uses the lowest cash balance across the forecast.</p>
      </details>`;
}

export function weeklyView(advice, week, live) {
  return `<section class="weekly-page stack narrow-page">
    <div><h1>${advice.title}</h1><p class="subtle">Week of ${escapeHtml(week)}</p></div>
    <div aria-live="polite" aria-busy="${Boolean(live?.pending)}">
      ${pipSpeech(live?.answer ?? advice.summary, "hello")}
      ${advice.points ? `<p class="subtle pip-impact">Passing this lesson would add <strong>${advice.points} PULS ${advice.points === 1 ? "point" : "points"}</strong> at your current weights.</p>` : ""}
    </div>
    ${advice.actions.map((item, index)=>`<button type="button" class="weekly-action" data-action="coach-next" data-id="${item.type}" data-next="${item.id??""}">
      <span><strong>${escapeHtml(item.label)}</strong>${index ? `<small>${escapeHtml(item.text)}</small>` : ""}</span><span class="chevron" aria-hidden="true">›</span></button>`).join("")}
    ${advice.advisor.wealth ? `<p class="subtle">${escapeHtml(advice.advisor.help)}</p>` : ""}
  </section>`;
}

export function chatPanel(chat) {
  const reaction = chat.pending ? "think" : chat.messages.findLast(item => item.role === "pip")?.reaction ?? "hello";
  return `<section class="coach-panel" aria-labelledby="coach-title">
      <div class="row spread"><div class="row coach-heading"><h2 id="coach-title">Pip Chat</h2><span class="pip-character">${mascot(reaction)}</span></div>
        <button class="close" type="button" aria-label="Close chat" data-action="chat-toggle">×</button></div>
      <div class="coach-messages" role="log" aria-live="polite">
        ${chat.messages.length ? chat.messages.map(item=>`<article class="chat-${item.role}">
          <p>${escapeHtml(item.text)}</p>
          ${item.source==="demo" ? '<small>Demo guidance</small>' : ""}
          ${item.action ? button(escapeHtml(item.action.label),"coach-next","secondary",`data-id="${item.action.type}" data-next="${item.action.id??""}"`) : ""}
        </article>`).join("") : '<p class="subtle">Ask about your score, spending or next step.</p>'}
        ${chat.pending ? '<p class="subtle" role="status">Pip is looking at your scan…</p>' : ""}
      </div>
    </section>`;
}

export function chatView() {
  return `<div class="coach-dock">
    <div id="coach-panel" hidden></div>
    <form id="coach-form" class="coach-composer">
      <label class="sr-only" for="coach-input">Ask Pip</label><input id="coach-input" name="question" maxlength="700" placeholder="Ask Pip about your finances" autocomplete="off" required>
      <button type="submit" class="coach-send" aria-label="Send question">↑</button>
    </form>
  </div>`;
}
