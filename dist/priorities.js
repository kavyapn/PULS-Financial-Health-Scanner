export const PRIORITIES = {
  literacy: {label:"Financial literacy", areas:{literacy:1}},
  habits: {label:"Financial behavior and habits", areas:{behaviour:1}},
  planning: {label:"Long-term planning", areas:{readiness:1}},
  entrepreneurship: {label:"Entrepreneurial mindset", areas:{fitness:.6, readiness:.4}},
  independence: {label:"Financial independence", areas:{fitness:1}},
  community: {label:"Community and networks", areas:{behaviour:.5, readiness:.5}},
  succession: {label:"Family governance and succession readiness", areas:{readiness:1}},
  impact: {label:"Purpose and impact", areas:{literacy:.4, readiness:.6}}
};

export const PRIORITY_IDS = Object.keys(PRIORITIES);
export const SCORE_AREAS = {fitness:"Fitness", behaviour:"Habits", literacy:"Knowledge", readiness:"Readiness"};
const BASE_WEIGHTS = {fitness:35, behaviour:20, literacy:20, readiness:25};

export function normalizePriorities(input) {
  return Object.fromEntries(PRIORITY_IDS.flatMap(id => {
    const vote = input?.[id];
    return vote === 1 || vote === -1 ? [[id, vote]] : [];
  }));
}

export function scoreWeights(input) {
  const emphasis = {...BASE_WEIGHTS};
  for (const [id, vote] of Object.entries(normalizePriorities(input))) {
    for (const [area, share] of Object.entries(PRIORITIES[id].areas)) emphasis[area] += vote * 5 * share;
  }
  const total = Object.values(emphasis).reduce((sum, weight) => sum + weight, 0);
  const shares = Object.entries(emphasis).map(([area, weight]) => {
    const exact = weight / total * 100;
    return {area, weight:Math.floor(exact), remainder:exact % 1};
  });
  const remaining = 100 - shares.reduce((sum, item) => sum + item.weight, 0);
  for (const item of [...shares].sort((a,b) => b.remainder - a.remainder).slice(0, remaining)) item.weight += 1;
  return Object.fromEntries(shares.map(({area, weight}) => [area, weight]));
}

export function focusLabels(input, vote = 1) {
  return Object.entries(normalizePriorities(input)).filter(([, value]) => value === vote)
    .map(([id]) => PRIORITIES[id].label);
}

function weightSummary(votes) {
  return Object.entries(scoreWeights(votes)).map(([area, weight]) => `${SCORE_AREAS[area]} ${weight}%`).join(" · ");
}

export function priorityChoices(votes) {
  return `<p class="subtle">Use + to give a topic more weight and − to give it less. Your choices also shape Pip’s guidance and lesson suggestions. Select the same control again to clear it.</p>
    <ul class="priority-list">${PRIORITY_IDS.map(id => `<li><span>${PRIORITIES[id].label}</span><div class="priority-votes">
      ${[[1,"+","More weight"],[-1,"−","Less weight"]].map(([vote, icon, label]) => `<button type="button" data-priority="${id}" data-vote="${vote}"
        aria-pressed="${votes[id] === vote}" aria-label="${label} for ${PRIORITIES[id].label}"><span aria-hidden="true">${icon}</span></button>`).join("")}
    </div></li>`).join("")}</ul>
    <p class="priority-weights" data-priority-weights aria-live="polite">${weightSummary(votes)}</p>`;
}

export function changePriority(root, votes, button) {
  const id = button.dataset.priority;
  const vote = Number(button.dataset.vote);
  if (!Object.hasOwn(PRIORITIES, id) || ![1,-1].includes(vote)) return;
  if (votes[id] === vote) delete votes[id];
  else votes[id] = vote;
  for (const choice of root.querySelectorAll("[data-priority]")) {
    choice.setAttribute("aria-pressed", String(votes[choice.dataset.priority] === Number(choice.dataset.vote)));
  }
  root.querySelector("[data-priority-weights]").textContent = weightSummary(votes);
}
