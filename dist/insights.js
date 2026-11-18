import { FORECAST_WINDOWS, HISTORY_RANGES, LIFE_CHANGES, MAX_LIFE_EVENTS, oneTimeEvent } from "./growth.js";

const compactDate = new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric" });
const dateTime = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });
const decimal = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 1 });
const euros = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const signed = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 1, signDisplay: "exceptZero" });
const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);
const total = score => score.score ?? `${score.low}–${score.high}`;
const dateLabel = (at, format) => at ? format.format(new Date(at)) : "Opening scan";

function contributionChanges(changes, empty) {
  if (!changes.length) return `<p class="subtle">${empty}</p>`;
  return `<ul class="driver-list">${changes.map(item => `<li>
    <span><strong>${escape(item.label)}</strong><small>${escape(item.dimension)}</small></span>
    <span class="driver-points">${item.delta === null
      ? item.to === null ? "Input unavailable" : `${decimal.format(item.to)} pts now measured`
      : `${signed.format(item.delta)} pts`}</span>
  </li>`).join("")}</ul>`;
}

export function historyPointDetail(point, label) {
  return `<div class="history-note"><div><strong>${escape(label)}</strong><small>${dateLabel(point.at, dateTime)}</small></div>
    ${contributionChanges(point.changes, "Score recorded at this checkpoint.")}</div>`;
}

export function historyTrendView(trend) {
  return `<div class="trend-range" role="group" aria-label="Score history range">
    ${HISTORY_RANGES.map(range => `<button type="button" data-action="history-range" data-id="${range.id}"
      aria-pressed="${range.id === trend.range.id}">${range.label}</button>`).join("")}
  </div>
  ${weeklyChart(trend.points, trend.range)}
  ${trend.points.some(point => point.illustrative) ? '<p class="trend-note">Earlier points are illustrative.</p>' : ""}`;
}

export function historyView(history, labelFor, trend) {
  const last = history.at(-1);
  const first = history[0].score;
  const delta = last.score.score === null || first.score === null ? null : last.score.score - first.score;
  const status = delta === null ? "Some inputs are missing" : delta ? `${signed.format(delta)} since opening scan` : "Opening score";
  return `<section class="trend-page stack" aria-labelledby="history-title">
    <div><h1 id="history-title">Your progress</h1><p class="subtle">See what changed your score.</p></div>
    <div class="trend-summary"><strong>${total(last.score)}<small> / 100</small></strong><span class="${delta > 0 ? "status-good" : delta < 0 ? "status-low" : ""}">${status}</span></div>
    <div class="trend-light" id="history-trend">${historyTrendView(trend)}</div>
    <h2>What changed</h2>
    <ol class="checkpoints">${[...history].reverse().map((point,i) => `<li>
      <button type="button" data-action="history-point" data-index="${history.length-i-1}" aria-pressed="${i===0}">
        <span><strong>${escape(labelFor(point.id))}</strong><small>${dateLabel(point.at,compactDate)}</small></span>
        <span>${total(point.score)} <span class="chevron" aria-hidden="true">›</span></span>
      </button></li>`).join("")}</ol>
    <div id="history-detail" aria-live="polite">${historyPointDetail(last,labelFor(last.id))}</div>
  </section>`;
}

function linePath(values, x, y) {
  let previous = null;
  return values.map((value, index) => {
    if (!Number.isFinite(value)) { previous = null; return ""; }
    const nextX = x(index), nextY = y(value);
    const midpoint = previous ? (previous.x+nextX)/2 : 0;
    const segment = previous ? `C${midpoint} ${previous.y} ${midpoint} ${nextY} ${nextX} ${nextY}` : `M${nextX} ${nextY}`;
    previous = {x:nextX,y:nextY};
    return segment;
  }).join(" ");
}

export function weeklySparkline(weeks) {
  const start = weeks.findIndex(item => Number.isFinite(item.low));
  if (start < 0) return "";
  const plot = weeks.slice(start).filter(item => Number.isFinite(item.low));
  const values = plot.map(item => item.low);
  const low = Math.min(...values), high = Math.max(...values);
  const center = (low + high) / 2;
  const x = index => index*500/Math.max(1,plot.length-1);
  const y = value => 68 - (value - center) * 76 / Math.max(25, high - low + 12);
  const path = plot.length === 1 ? `M0 ${y(values[0])}H500` : linePath(values,x,y);
  return `<svg class="widget-spark" viewBox="0 0 500 110" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="widget-wash" x1="0" x2="0" y1="0" y2="1">
      <stop stop-color="#83eff5" stop-opacity=".33"></stop><stop offset="1" stop-color="#83eff5" stop-opacity="0"></stop>
    </linearGradient></defs>
    <path fill="url(#widget-wash)" d="${path} L500 110H0Z"></path><path class="weekly-line" d="${path}"></path>
  </svg>`;
}

export function weeklyChart(weeks, range = HISTORY_RANGES[0]) {
  const dateOptions = range.id === "week" ? { day: "numeric", month: "short" }
    : range.id === "five" ? { year: "numeric" } : { month: "short", year: "2-digit" };
  const axis = new Intl.DateTimeFormat("en-GB", { ...dateOptions, timeZone: "UTC" });
  const label = point => axis.format(new Date(point.week ?? point.date));
  const lower = weeks.map(point => point.low);
  const upper = weeks.map(point => point.high);
  const x = i => 8 + i * (484 / Math.max(1, weeks.length - 1));
  const y = score => 112 - score * 1.04;
  const period = weeks.filter(point => Number.isFinite(point.low)).map(point =>
    `${label(point)}: ${point.low === point.high ? point.low : `${point.low} to ${point.high}`}${point.illustrative ? " (illustrative)" : ""}`);
  const hasRanges = weeks.some(point => Number.isFinite(point.low) && point.low !== point.high);
  return `<div class="weekly-chart">
    <div class="weekly-heading">${range.title}</div>
    <svg viewBox="0 0 500 120" preserveAspectRatio="none" role="img"
      aria-label="${range.title} with illustrative history. ${escape(period.join(". "))}. Red below 50, normal 50 to 74, green 75 and above.${hasRanges ? " The dashed line shows the upper estimate." : ""}">
      <defs>
        <clipPath id="weekly-bands"><rect x="0" y="8" width="500" height="104" rx="14"></rect></clipPath>
        <linearGradient id="weekly-fade" x1="0" x2="0" y1="0" y2="1">
          <stop stop-color="white" stop-opacity=".45"></stop>
          <stop offset=".42" stop-color="white" stop-opacity=".95"></stop>
          <stop offset=".75" stop-color="white" stop-opacity=".62"></stop>
          <stop offset="1" stop-color="white" stop-opacity=".05"></stop>
        </linearGradient>
        <mask id="weekly-band-mask"><rect width="500" height="120" fill="url(#weekly-fade)"></rect></mask>
      </defs>
      <g clip-path="url(#weekly-bands)" mask="url(#weekly-band-mask)">
        <rect class="zone-green" x="0" y="8" width="500" height="26"></rect>
        <rect class="zone-normal" x="0" y="34" width="500" height="26"></rect>
        <rect class="zone-red" x="0" y="60" width="500" height="52"></rect>
        <path class="weekly-grid" d="M0 34H500 M0 60H500"></path>
      </g>
      ${hasRanges ? `<path class="weekly-upper" d="${linePath(upper, x, y)}"></path>` : ""}
      <path class="weekly-line" d="${linePath(lower, x, y)}"></path>
    </svg>
    <div class="weekly-dates" aria-hidden="true">${weeks.map(point => `<span>${label(point)}</span>`).join("")}</div>
  </div>`;
}

export function cashGraph(baseline, scenario, labels, captions = ["With life events", "Baseline"], title = "Projected cash", goal) {
  const known = [...baseline, ...scenario].filter(Number.isFinite);
  if (!known.length) return '<p class="subtle">The cash path needs more banking data.</p>';
  const showGoal = Number.isFinite(goal?.amount);
  if (showGoal) known.push(goal.amount);
  const min = Math.min(...known, 0);
  const max = Math.max(...known, 0);
  const range = max - min || 1;
  const x = i => 8 + i * (484 / Math.max(1, labels.length - 1));
  const y = value => 100 - (value - min) * 88 / range;
  const count = Math.min(labels.length, 5);
  const ticks = Array.from({ length: count }, (_, index) =>
    Math.round(index * (labels.length - 1) / Math.max(1, count - 1)));
  const accessible = ticks.map(i => `${labels[i]}: ${captions[1]} ${Number.isFinite(baseline[i]) ? euros.format(baseline[i]) : "unavailable"}, ${captions[0]} ${Number.isFinite(scenario[i]) ? euros.format(scenario[i]) : "unavailable"}`).join(". ");
  return `<div class="cash-chart">
    <svg viewBox="0 0 500 110" preserveAspectRatio="none" role="img" aria-label="${escape(title)}. ${escape(accessible)}${showGoal ? `. ${escape(goal.label)} ${euros.format(goal.amount)}` : ""}">
      ${showGoal && goal.amount === 0 ? "" : `<path class="cash-zero" d="M0 ${y(0)}H500"></path>`}
      ${showGoal ? `<path class="cash-goal" d="M0 ${y(goal.amount)}H500"></path>` : ""}
      <path class="cash-baseline" d="${linePath(baseline, x, y)}"></path>
      <path class="cash-scenario" d="${linePath(scenario, x, y)}"></path>
      ${ticks.map(i => Number.isFinite(scenario[i]) ? `<circle class="cash-dot" cx="${x(i)}" cy="${y(scenario[i])}" r="3.1"></circle>` : "").join("")}
    </svg>
    <div class="cash-ticks" aria-hidden="true">${ticks.map(i => `<span style="left:${x(i)/5}%">${labels[i]}</span>`).join("")}</div>
    <div class="cash-legend"><span><i class="cash-scenario-key"></i>${captions[0]}</span><span><i class="cash-baseline-key"></i>${captions[1]}</span>
      ${showGoal ? `<span><i class="cash-goal-key"></i>${escape(goal.label)}</span>` : ""}</div>
  </div>`;
}

function duration(months) {
  if (months < 12) return `${months} months`;
  return months === 12 ? "1 year" : `${months/12} years`;
}

export function lifeEventsView(timeline, plans) {
  return `<section class="stack plan-events" aria-labelledby="plan-title">
    <div class="row spread wrap"><h3 id="plan-title" tabindex="-1">Scheduled life events</h3>
      ${timeline.length < MAX_LIFE_EVENTS ? '<button class="button secondary" type="button" data-action="edit-event" data-index="new">+ Add an event</button>' : ""}</div>
    <details class="inline-details" id="life-goals"><summary>Your goals and priorities</summary>
      <div class="goal-list">${plans.length ? plans.map(plan => `<div><h3>${escape(plan.goal)}</h3>
        <p class="subtle">${escape(plan.horizon)} · ${escape(plan.preparedness)}</p>
        <ul>${plan.priorities.map(priority => `<li>${escape(priority)}</li>`).join("")}</ul>
      </div>`).join("") : '<p class="subtle">Add a goal to get suggested life events.</p>'}
      <div><button type="button" class="button quiet" data-action="edit-goals">${plans.length ? "Edit goals" : "Add goals"}</button></div></div>
    </details>
    ${timeline.length ? `<ol class="event-list">${timeline.map((item, index) => ({ item, index }))
      .sort((a, b) => a.item.month - b.item.month)
      .map(({ item, index }) => {
        const preset = LIFE_CHANGES.find(option => option.id === item.id);
        const once = oneTimeEvent(preset);
        return `<li><button type="button" class="event-row" data-action="edit-event" data-index="${index}">
          <span class="event-month" aria-hidden="true">M${item.month}</span><span class="sr-only">Month ${item.month}</span>
          <span><strong>${preset.label}</strong><small>${euros.format(item.amount)} ${once ? "once" : "a month"}</small></span>
          <span aria-hidden="true" class="chevron">›</span>
        </button></li>`;
      }).join("")}</ol>` : '<p class="subtle">Add a life event to test a change in income, expenses or savings.</p>'}
  </section>`;
}

export function simulatorView(result) {
  const { current, reference, projected, horizon, minimumHorizon, baselineCash, scenarioCash, eventChanges, assumptions } = result;
  const months = ["Today", ...Array.from({ length: horizon }, (_, i) =>
    (i + 1) % 12 === 0 ? duration(i + 1) : `Month ${i + 1}`)];
  const finalCash = result.inputs.at(-1);
  const delta = eventChanges.reduce((sum, item) => sum + (item.delta ?? 0), 0);
  const pointsChange = delta === 0 ? "No change to weighted points" : `${signed.format(delta)} weighted points${projected.score === null ? " from available inputs" : ""}`;
  return `<section class="stack life-card" aria-labelledby="forecast-title">
    <div class="row spread wrap">
      <div><h2 id="forecast-title">Cash and score forecast</h2><p class="subtle">Today’s PULS score is ${total(current)} / 100.</p></div>
      <label class="field forecast-horizon">Forecast range<select id="forecast-horizon"${minimumHorizon===FORECAST_WINDOWS.at(-1) ? " disabled" : ""}>
        ${FORECAST_WINDOWS.filter(window => window >= minimumHorizon).map(window =>
          `<option value="${window}" ${window===horizon ? "selected" : ""}>${duration(window)}</option>`).join("")}
      </select></label>
    </div>
    <div class="forecast-results">
      <div><span>Baseline</span><strong>${total(reference)} <small>/100</small></strong><span>Cash · ${escape(finalCash.before)}</span></div>
      <div><span>With life events</span><strong>${total(projected)} <small>/100</small></strong><span>Cash · ${escape(finalCash.after)}</span></div>
    </div>
    ${cashGraph(baselineCash, scenarioCash, months)}
    <details class="inline-details">
      <summary>What changed the score?</summary>
      <div><h3>${pointsChange}</h3>
      ${projected.score === null ? `<p class="subtle">${projected.coverage}% weighted coverage. The range includes missing inputs.</p>` : ""}
      ${contributionChanges(eventChanges, "These events do not cross a scoring threshold in the forecast.")}
      <div class="table-scroll"><table><thead><tr><th scope="col">After ${duration(horizon)}</th><th class="num" scope="col">Baseline</th><th class="num" scope="col">With events</th></tr></thead>
        <tbody>${result.inputs.map(input => `<tr><th scope="row">${escape(input.label)}</th><td class="num">${escape(input.before)}</td><td class="num">${escape(input.after)}</td></tr>`).join("")}</tbody>
      </table></div></div>
    </details>
    <details class="inline-details"><summary>Forecast assumptions</summary><ul>${assumptions.map(item => `<li>${escape(item)}</li>`).join("")}</ul></details>
  </section>`;
}

