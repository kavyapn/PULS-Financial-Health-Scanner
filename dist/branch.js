import { getBankingData, PERSONAS } from "./model.js";
import { changePriority, normalizePriorities, priorityChoices } from "./priorities.js";

const HORIZONS = {
  soon: "In the next three months",
  year: "In three to twelve months",
  later: "In more than a year",
  unsure: "I’m still exploring"
};
const SUGGESTED_MONTH = { soon: 1, year: 6, later: 18, unsure: 1 };

export const GOALS = {
  buffer: {
    label: "Build a cash buffer",
    preset: "save-regularly",
    priority: ["Build a one-month cushion", "Grow to a three-month cushion", "Prepare for a surprise bill"],
    question: "What would you like your buffer to cover?",
    preparation: "How do you set aside money today?",
    choices: ["I haven’t started", "I save when I have money left over", "I already have a regular transfer"],
    nextAction: "Use your recent surplus to test a regular savings amount."
  },
  business: {
    label: "Start or grow a business",
    preset: "entrepreneurship",
    priority: ["Cover my living costs", "Separate personal and business cash", "Prepare for slow-paying clients"],
    question: "What would you like to prepare for?",
    preparation: "Have you planned for a lean month?",
    choices: ["I haven’t estimated my living costs", "I know my basic costs", "I have a cash plan and a fallback"],
    nextAction: "Rehearse a lean month using only your personal cash and income."
  },
  inheritance: {
    label: "Receive an inheritance",
    preset: "inheritance",
    priority: ["Understand what I’ve inherited", "Pay upcoming estate costs", "Keep a personal cash reserve"],
    question: "What would you like to work through?",
    preparation: "What do you know about the timing of inherited cash?",
    choices: ["I don’t know when cash is available", "I have an estimate", "I have a confirmed amount and date"],
    nextAction: "Compare upcoming costs with cash available today and check when inherited cash becomes accessible."
  },
  home: {
    label: "Move home",
    preset: "higher-expenses",
    priority: ["Cover a deposit and moving costs", "Keep monthly costs affordable", "Protect my emergency reserve"],
    question: "Which parts of the move are you planning for?",
    preparation: "How certain are the new housing costs?",
    choices: ["I’m exploring options", "I have a monthly estimate", "I know the monthly and upfront costs"],
    nextAction: "Test the change in essential expenses against your recent spending."
  },
  family: {
    label: "Prepare for a growing family",
    preset: "parenthood",
    priority: ["Budget for childcare", "Prepare for lower income during leave", "Review protection for dependants"],
    question: "Which changes would you like to plan for?",
    preparation: "Have you estimated the new household budget?",
    choices: ["I haven’t started", "I’ve estimated some costs", "I have a budget for income and expenses"],
    nextAction: "Try an increase in essential expenses, then compare it with a reduced-income scenario."
  },
  income: {
    label: "Change jobs or take a break",
    preset: "income-drop",
    priority: ["Cover essentials during a gap", "Get used to a different salary", "Keep saving during the change"],
    question: "What would make the change easier?",
    preparation: "How clearly can you estimate your next income?",
    choices: ["The amount and timing are unclear", "I have an estimate", "I know the amount and when it starts"],
    nextAction: "Rehearse the gap or reduced pay using your current expenses."
  },
  university: {
    label: "Go to university", preset: "university",
    priority: ["Budget for fees and living costs", "Cover a change in income", "Keep cash for surprises"],
    question: "What would you like to plan for at university?",
    preparation: "How much of the study budget have you estimated?",
    choices: ["I’m exploring", "I have a monthly estimate", "I have a budget and funding plan"],
    nextAction: "Schedule your study costs and check cash available in the month they are due."
  },
  salary: {
    label: "Receive a first salary", preset: "first-salary",
    priority: ["Cover my regular bills", "Start saving from payday", "Build an emergency fund"],
    question: "What should your first salary help you do?",
    preparation: "Do you know your take-home pay?",
    choices: ["It’s still unclear", "I have an estimate", "I know the amount and payday"],
    nextAction: "Enter the increase in take-home pay and check what you can set aside each month."
  },
  travel: {
    label: "Plan travel", preset: "travel",
    priority: ["Set a trip budget", "Keep an emergency reserve", "Cover a break from work"],
    question: "What would you like to prepare for before travelling?",
    preparation: "Have you estimated the trip costs?",
    choices: ["I’m exploring", "I have a rough budget", "I have a budget and savings plan"],
    nextAction: "Schedule the trip cost and see how much cash remains for essentials."
  },
  marriage: {
    label: "Get married", preset: "marriage",
    priority: ["Set a wedding budget", "Agree on shared costs", "Plan for shared goals"],
    question: "What would you like to discuss before getting married?",
    preparation: "Have you estimated the one-time costs?",
    choices: ["We’re exploring", "We have an estimate", "We have a budget and timeline"],
    nextAction: "Schedule the wedding cost and review what remains for your other goals."
  },
  succession: {
    label: "Plan family business succession", preset: "family-succession",
    priority: ["Agree on roles and decisions", "Plan for transition costs", "Protect family liquidity"],
    question: "What would you like to resolve before the handover?",
    preparation: "How far along is the transition plan?",
    choices: ["We’re opening the conversation", "We have discussed roles or timing", "We have a dated plan"],
    nextAction: "Check the transition costs and discuss liquidity and decision rights with the family."
  }
};

const DEFAULT_GOALS = { lena: "buffer", alex: "business", maya: "inheritance" };
const BRANCH_STAGES = ["Register", "About PULS", "Life plans", "Priorities"];
const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);
const validChoice = (value, options) => Number.isInteger(value) && value >= 0 && value < options.length;

export function normalizePlan(plan) {
  if (!plan || typeof plan.goal !== "string" || typeof plan.horizon !== "string" ||
      !Object.hasOwn(GOALS, plan.goal) || !Object.hasOwn(HORIZONS, plan.horizon)) return null;
  const goal = GOALS[plan.goal];
  const priorities = Array.isArray(plan.priorities) ? plan.priorities : [plan.priority];
  if (!priorities.length || priorities.length > goal.priority.length ||
      !priorities.every(value => validChoice(value, goal.priority)) || !validChoice(plan.preparedness, goal.choices)) return null;
  return { goal: plan.goal, horizon: plan.horizon, priorities: [...new Set(priorities)], preparedness: plan.preparedness };
}

export function normalizePlans(values) {
  if (!Array.isArray(values)) return [];
  const plans = new Map();
  for (const value of values) {
    const plan = normalizePlan(value);
    if (plan && !plans.has(plan.goal)) plans.set(plan.goal, plan);
  }
  return [...plans.values()];
}

export function describePlan(plan) {
  const valid = normalizePlan(plan);
  if (!valid) return null;
  const goal = GOALS[valid.goal];
  const alternatives = {
    family: ["parenthood", "income-drop", null],
    home: ["one-off-cost", "higher-expenses", null],
    buffer: ["save-regularly", "save-regularly", "one-off-cost"],
    business: ["income-drop", "entrepreneurship", "income-drop"],
    inheritance: ["inheritance", "one-off-cost", "inheritance"],
    travel: ["travel", "travel", "income-drop"]
  };
  const presets = [...new Set(valid.priorities.map(index => alternatives[valid.goal]?.[index]).filter(Boolean))];
  return {
    id: valid.goal,
    goal: goal.label,
    horizon: HORIZONS[valid.horizon],
    suggestedMonth: SUGGESTED_MONTH[valid.horizon],
    priorities: valid.priorities.map(index => goal.priority[index]),
    preparedness: goal.choices[valid.preparedness],
    nextAction: goal.nextAction,
    presets: presets.length ? presets : [goal.preset]
  };
}

function cardPicker() {
  return `<p class="branch-lead">Select a sample card to start your scan.</p>
    <div class="branch-card-grid">
      ${Object.values(PERSONAS).map(persona => `<button type="button" class="branch-card" data-branch="read" data-persona="${persona.id}">
        <span class="card-symbol" aria-hidden="true"><img src="./assets/deutsche-bank.svg" alt=""></span>
        <span><strong>${persona.name}’s card</strong><small>${persona.event}</small></span><span class="chevron" aria-hidden="true">›</span>
      </button>`).join("")}
    </div>`;
}

function introduction() {
  return `<p class="branch-lead">Financial wellbeing means feeling in control of your money today and being able to make choices about tomorrow.</p>
    <div class="intro-notes">
      <section><h2>Why it matters</h2><p>Meeting everyday costs and having room for a surprise can reduce money stress. A plan gives you more choices when life changes.</p></section>
      <section><h2>How PULS helps</h2><p>See how your banking activity, habits and knowledge shape your score. Then try one next step or test a goal before committing.</p></section>
    </div>
    <div class="actions"><button class="button" type="button" data-branch="goals">Choose life goals <span aria-hidden="true">→</span></button></div>`;
}

export function branchSteps(step) {
  return `<ol class="branch-steps" aria-label="Scan setup">${BRANCH_STAGES.map((stage, i) => `<li
    ${i === step ? 'aria-current="step"' : ""} class="${i < step ? "done" : ""}">
    <span aria-hidden="true">${i < step ? "✓" : i + 1}</span>${stage}</li>`).join("")}</ol>`;
}

function goalPicker(persona, selected, editing) {
  const suggested = DEFAULT_GOALS[persona];
  const ids = [suggested, ...Object.keys(GOALS).filter(id => id !== suggested)];
  return `<p class="branch-lead">Select all the goals you want to explore.</p>
    <form id="branch-goals">
      <fieldset class="branch-goal-grid"><legend class="sr-only">Life goals</legend>
        ${ids.map(id => `<label class="branch-goal">
          <input type="checkbox" name="goal" value="${id}" ${selected.includes(id) ? "checked" : ""}>
          <strong>${GOALS[id].label}</strong>
        </label>`).join("")}
      </fieldset>
      <p class="message" id="branch-error" role="alert"></p>
      <div class="actions">${editing ? "" : '<button type="button" class="button quiet" data-branch="intro">Back</button>'}
        <div class="row goal-actions">
          ${editing ? "" : '<button type="button" class="button quiet" data-branch="skip-goals">Skip</button>'}
          <button type="submit" class="button">Continue <span aria-hidden="true">→</span></button>
        </div>
      </div>
    </form>`;
}

export function startBranch({ root, persona, existingProfile, plans = [], priorities, onComplete, onCancel }) {
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const editing = Boolean(existingProfile);
  const existingPlans = normalizePlans(plans);
  let profile = existingProfile;
  let selected = existingPlans.map(plan => plan.goal);
  let goalIndex = 0;
  let index = 0;
  const votes = normalizePriorities(priorities);
  let pinPersona;
  let pinTimer;
  const responses = new Map(existingPlans.map(plan => [plan.goal, {
    horizon: plan.horizon, priorities: plan.priorities.map(String), preparedness: String(plan.preparedness)
  }]));

  function cancel() {
    clearTimeout(pinTimer);
    controller.abort();
  }

  function screen(step, title, content) {
    root.innerHTML = `<section class="branch-flow" aria-labelledby="branch-title">
      <div class="branch-inner">
        ${editing ? "" : branchSteps(step)}
        <div class="branch-heading"><h1 id="branch-title" tabindex="-1">${title}</h1>
          <button type="button" class="button quiet branch-exit" data-branch="close">${editing ? "Cancel" : "Exit scan"}</button></div>
        <div class="branch-content">${content}</div>
      </div>
    </section>`;
    window.scrollTo(0, 0);
    root.querySelector("#branch-title").focus({ preventScroll: true });
  }

  function cards(message = "") {
    screen(0, persona ? "Connect your profile" : "Insert a bank card",
      `${message ? `<p class="message" role="alert">${escape(message)}</p>` : ""}${cardPicker()}`);
  }

  function intro() {
    screen(1, "Get to know PULS", introduction());
  }

  function pin(id) {
    if (!Object.hasOwn(PERSONAS, id)) return;
    pinPersona = id;
    screen(0, "Enter demo PIN", `<p class="branch-lead">${PERSONAS[id].name}’s sample card is ready.</p>
      <div class="pin-display" id="pin-display" aria-hidden="true">
        ${Array.from({length:4}, (_, i) => `<span style="--delay:${130+i*200}ms"></span>`).join("")}
      </div>
      <p id="pin-status" class="sr-only" role="status"></p>
      <div class="actions"><button type="button" class="button quiet" data-branch="cards">Choose another card</button>
        <button type="button" class="button" data-branch="pin">Enter</button></div>`);
  }

  function simulatePin(button) {
    if (pinTimer || !pinPersona) return;
    button.disabled = true;
    root.querySelector("#pin-display").classList.add("pin-entering");
    root.querySelector("#pin-status").textContent = "Entering the demo PIN.";
    pinTimer = setTimeout(() => {
      pinTimer = null;
      read(pinPersona);
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 120 : 1200);
  }

  function goals() {
    screen(2, editing ? "Edit life goals" : "What’s coming up for you?", goalPicker(profile.id, selected, editing));
  }

  async function read(id) {
    if (!Object.hasOwn(PERSONAS, id)) return;
    screen(0, "Connecting your demo profile", '<p role="status">Reading the demo banking snapshot…</p>');
    try {
      const result = await getBankingData(id, options);
      if (controller.signal.aborted) return;
      profile = result;
      intro();
    } catch {
      if (!controller.signal.aborted) cards("The demo bank didn’t respond. Choose a sample card to try again.");
    }
  }

  function question() {
    const goalId = selected[goalIndex];
    const goal = GOALS[goalId];
    const answers = responses.get(goalId) ?? {};
    const indexed = list => list.map((text, i) => [i, text]);
    const item = [
      { field: "horizon", title: "When do you expect this change?", choices: Object.entries(HORIZONS) },
      { field: "priorities", title: goal.question, choices: indexed(goal.priority), multiple: true },
      { field: "preparedness", title: goal.preparation, choices: indexed(goal.choices) }
    ][index];
    const last = index === 2 && goalIndex === selected.length - 1;
    screen(2, item.title, `<p class="branch-lead">${goal.label}${selected.length > 1 ? ` · Goal ${goalIndex + 1} of ${selected.length}` : ""} · Question ${index + 1} of 3</p>
      ${item.multiple ? '<p class="question-hint">Select all that apply.</p>' : ""}
      <form id="branch-answer" data-field="${item.field}">
        <fieldset class="branch-options"><legend class="sr-only">${item.title}</legend>
          ${item.choices.map(([value, label]) => `<label class="branch-option">
            <input type="${item.multiple ? "checkbox" : "radio"}" name="answer" value="${value}" ${item.multiple ? "" : "required"}
              ${(item.multiple ? answers.priorities?.includes(String(value)) : answers[item.field] === String(value)) ? "checked" : ""}>
            <span>${label}</span></label>`).join("")}
        </fieldset>
        ${item.multiple ? '<p class="message" id="branch-error" role="alert"></p>' : ""}
        <div class="actions"><button type="button" class="button quiet" data-branch="back">Back</button>
          <button type="submit" class="button">${last && editing ? "Save goals" : "Continue"} <span aria-hidden="true">→</span></button>
        </div>
      </form>`);
  }

  function finish() {
    const plans = normalizePlans(selected.map(goal => {
      const answers = responses.get(goal);
      return { goal, horizon: answers.horizon, priorities: answers.priorities.map(Number), preparedness: Number(answers.preparedness) };
    }));
    if (plans.length !== selected.length) return;
    cancel();
    onComplete({ persona: profile.id, plans, priorities:votes }, profile);
  }

  function priorityStep() {
    screen(3, "What matters most to you?", `<form id="branch-priorities" class="stack">
      ${priorityChoices(votes)}
      <div class="actions"><button type="button" class="button quiet" data-branch="back">Back</button>
        <button type="submit" class="button">Continue to data sources <span aria-hidden="true">→</span></button></div>
    </form>`);
  }

  root.addEventListener("click", event => {
    const vote = event.target.closest("[data-priority]");
    if (vote) { changePriority(root, votes, vote); return; }
    const button = event.target.closest("[data-branch]");
    if (!button) return;
    switch (button.dataset.branch) {
      case "close": cancel(); onCancel(); break;
      case "read": pin(button.dataset.persona); break;
      case "pin": simulatePin(button); break;
      case "cards": clearTimeout(pinTimer); pinTimer = null; cards(); break;
      case "intro": if (profile) intro(); break;
      case "goals": if (profile) goals(); break;
      case "skip-goals":
        selected = [];
        responses.clear();
        goalIndex = 0;
        index = 0;
        priorityStep();
        break;
      case "back":
        if (index > 0) { index -= 1; question(); }
        else if (goalIndex > 0) { goalIndex -= 1; index = 2; question(); }
        else goals();
        break;
    }
  }, options);
  root.addEventListener("submit", event => {
    const form = event.target;
    if (!["branch-answer","branch-goals","branch-priorities"].includes(form.id)) return;
    event.preventDefault();
    if (!profile) return;
    if (form.id === "branch-priorities") { finish(); return; }
    const fields = new FormData(form);
    if (form.id === "branch-goals") {
      const choices = fields.getAll("goal").filter(id => Object.hasOwn(GOALS, id));
      if (!choices.length && !editing) {
        form.querySelector("#branch-error").textContent = "Choose a life goal or select Skip.";
        return;
      }
      selected = choices;
      if (!selected.length) {
        finish();
        return;
      }
      goalIndex = 0;
      index = 0;
      question();
      return;
    }
    const field = form.dataset.field;
    const answer = field === "priorities" ? fields.getAll("answer") : fields.get("answer");
    if (Array.isArray(answer) && !answer.length) {
      form.querySelector("#branch-error").textContent = "Choose at least one priority.";
      return;
    }
    if (answer === null) return;
    const goalId = selected[goalIndex];
    responses.set(goalId, { ...responses.get(goalId), [field]: answer });
    if (index < 2) {
      index += 1;
      question();
      return;
    }
    if (goalIndex < selected.length - 1) {
      goalIndex += 1;
      index = 0;
      question();
      return;
    }
    if (editing) finish();
    else priorityStep();
  }, options);
  if (editing) goals();
  else if (persona) read(persona);
  else cards();
  return cancel;
}

