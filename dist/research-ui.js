import {
  ATTITUDE_ITEMS, BEHAVIOUR_ITEMS, CFPB_US_MEAN, FINDEX_ACCOUNT_OWNERSHIP, FINDEX_EMERGENCY_FUNDS,
  KNOWLEDGE_ITEMS, SOURCES, cfpbScore, questionPoints
} from "./measurement.js";
import { button, day, euro, scoreText } from "./puls-ui.js";

const capabilitySections = [
  ["Knowledge", KNOWLEDGE_ITEMS],
  ["Behaviour", BEHAVIOUR_ITEMS],
  ["Planning attitudes", ATTITUDE_ITEMS]
];

const source = (label, url) => `<a href="${url}" target="_blank" rel="noopener">${label}</a>`;

export function capabilityView(result) {
  return `<div class="stack narrow-page">
    <section class="card stack">
      <h1>Financial capability check</h1>
      <p>Try questions on financial concepts, everyday habits and attitudes to planning. The examples are adapted from the ${source("OECD/INFE 2026 toolkit", SOURCES.toolkit)}.</p>
      ${result ? `<div id="capability-result" class="measurement-result" tabindex="-1">
        <h2>Check saved</h2><p>${capabilitySections.map(([label, items]) => `${label} ${questionPoints(items, result.answers)} / ${items.length}`).join(" · ")}</p>
      </div>` : ""}
      <form id="capability-form" class="stack measurement-form">
        ${capabilitySections.map(([label, items]) => `<fieldset class="stack">
          <legend>${label}</legend>
          ${items.map(item => `<label for="item-${item.id}">${item.prompt}
            <select id="item-${item.id}" name="${item.id}" required>
              <option value="">Choose an answer</option>
              ${[...item.options, "Not sure"].map((option,index) => `<option value="${index}" ${result?.answers[item.id] === index ? "selected" : ""}>${option}</option>`).join("")}
            </select></label>`).join("")}
        </fieldset>`).join("")}
        <button type="submit" class="button">Save check</button>
      </form>
    </section>
  </div>`;
}

function wellBeingPanel(result) {
  return `<details class="card details" id="cfpb-panel"${result ? " open" : ""}><summary>CFPB financial well-being</summary>
    <div class="details-inner stack">
      <p>Complete the ${source("CFPB’s 10-question worksheet", SOURCES.cfpbWorksheet)} and enter its total response value to calculate your score.</p>
      ${result ? `<div class="measurement-result" id="cfpb-result" tabindex="-1">
        <strong>${cfpbScore(result.total, result.ageBand, result.mode)} / 100</strong> · ${day(result.at)}
      </div>` : ""}
      <form id="cfpb-form" class="measurement-form stack">
        <label>Total response value <input type="number" name="total" min="0" max="40" step="1" inputmode="numeric" value="${result?.total ?? ""}" required></label>
        <label>Age group <select name="ageBand" required>
          <option value="">Choose an age group</option>
          <option value="18-61" ${result?.ageBand === "18-61" ? "selected" : ""}>18–61</option>
          <option value="62+" ${result?.ageBand === "62+" ? "selected" : ""}>62 or older</option>
        </select></label>
        <label>How you completed the worksheet <select name="mode" required>
          <option value="self">On my own</option>
          <option value="assisted" ${result?.mode === "assisted" ? "selected" : ""}>Someone read the questions to me</option>
        </select></label>
        <button type="submit" class="button secondary">Calculate and save</button>
      </form>
      <p class="subtle">The weighted U.S. adult mean was ${CFPB_US_MEAN} in 2016, using 6,389 survey responses with scores and weights. ${source("CFPB survey data and codebook", SOURCES.cfpbData)}</p>
    </div>
  </details>`;
}

export function researchPanels(position, measurements) {
  const balanceRows = [
    ["Accessible cash", position.accessible], ["Investments", position.investments],
    ["Added property and other assets", position.other], ["Outstanding debt", position.debt],
    ["Net recorded assets", position.net], ["Estimated monthly income in retirement", position.retirementIncome]
  ];
  return `<details class="card details"><summary>How PULS is measured</summary>
    <div class="details-inner stack measurement-sources">
      <p>PULS uses a weighted demo score with source and coverage for each input. The 2026 OECD/INFE toolkit informs the knowledge questions, behaviour indicators and long-term planning attitudes. Fitness measures cash resilience, borrowing and the portfolio. ${source("OECD/INFE Toolkit 2026", SOURCES.toolkit)}</p>
      ${button(measurements.capability ? "Review capability check" : "Take the capability check", "capability", "secondary")}
      <div>
        <h3>Germany’s financial capability</h3>
        <p>In the 2022 German survey, adults averaged 30 / 35 for knowledge, 33 / 45 for behaviour and 13 / 20 for attitudes. ${source("Published results", SOURCES.germany)} · ${source("Bundesbank survey", SOURCES.bundesbank)}</p>
      </div>
      <div>
        <h3>Access to accounts and emergency funds</h3>
        <p>In 2024, account ownership among adults aged 15 and older was ${FINDEX_ACCOUNT_OWNERSHIP.germany}% in Germany and ${FINDEX_ACCOUNT_OWNERSHIP.world}% worldwide. In low- and middle-income economies, ${FINDEX_EMERGENCY_FUNDS}% reported that raising emergency money within 30 days would be at most somewhat difficult. ${source("Global Findex 2025 data", SOURCES.findex)} · ${source("Report", SOURCES.findexReport)}</p>
      </div>
    </div>
  </details>
  ${wellBeingPanel(measurements.wellBeing)}
  <details class="card details"><summary>Household balance sheet</summary>
    <div class="details-inner stack">
      <p>Recorded balances follow the household asset, debt and retirement categories used by the ${source("Bundesbank PHF", SOURCES.phf)} and ${source("ECB HFCS", SOURCES.hfcs)}.</p>
      <dl class="measurement-balances">${balanceRows.map(([label, value]) => `<div><dt>${label}</dt><dd>${euro(value)}</dd></div>`).join("")}</dl>
      ${button("Explore life events and retirement", "retirement-forecast", "secondary")}
    </div>
  </details>`;
}

export function annualPulseView(rows) {
  const year = new Date().getUTCFullYear();
  return `<section class="card stack">
    <h2>Annual Pulse</h2>
    <p class="subtle">Save one snapshot per calendar year using the priorities you chose at the time. The annual check follows the repeat-measurement approach of the ${source("Financial Health Pulse", SOURCES.pulse)}.</p>
    ${rows.length ? `<div class="table-scroll"><table aria-label="Annual snapshots">
      <thead><tr><th scope="col">Year</th><th scope="col">PULS</th><th scope="col" class="num">CFPB</th><th scope="col" class="num">Net assets</th></tr></thead>
      <tbody>${rows.map(row => `<tr><th scope="row">${row.year}</th>
        <td>${scoreText({score:row.low === row.high ? row.low : null, low:row.low, high:row.high})}<small>${row.coverage}% coverage</small></td>
        <td class="num">${row.wellBeing ?? "—"}</td><td class="num">${euro(row.netAssets)}</td></tr>`).join("")}</tbody>
    </table></div>` : ""}
    ${button(rows.some(row => row.year === year) ? "Update this year’s snapshot" : "Save this year’s snapshot", "save-annual", "secondary")}
  </section>`;
}
