import { literacySkills } from "./model.js";

export const LESSONS = [
  {
    id: "lesson-cash",
    title: "Build an accessible cash buffer",
    focus: "independence",
    skill: "cash",
    minutes: 1,
    xp: 15,
    teach: "A cash buffer covers essential costs when income stops or an unexpected bill arrives. Count money you can access in time and without a forced sale.",
    example: "With €900 in accessible savings and €600 in monthly essentials, your buffer covers 1.5 months.",
    question: "You have €1,800 in accessible savings and €4,000 in shares. Monthly essentials are €1,200. How many months does your cash buffer cover?",
    choices: ["About five months", "One and a half months", "Two and a half months"],
    correct: 1,
    feedback: [
      "That includes the shares. Calculate the buffer using the €1,800 you can already spend.",
      "Correct. €1,800 in accessible savings divided by €1,200 of monthly essentials equals 1.5 months.",
      "Divide accessible savings by monthly essentials to find the number of months covered."
    ],
    success: "You can calculate how long accessible savings will cover essential spending.",
    reason: "Practice measuring how long your cash could cover essential bills."
  },
  {
    id: "lesson-borrowing",
    title: "Compare the full cost of borrowing",
    focus: "literacy",
    skill: "borrowing",
    minutes: 1,
    xp: 15,
    teach: "A lower monthly repayment can make a loan easier to budget for. Compare all scheduled payments and any fees to see the full cost.",
    example: "A €1,000 loan with ten €110 payments and a €20 fee costs €1,120 in total. The borrowing cost is €120.",
    question: "Two €1,000 loans have no fees. Offer A has 12 payments of €95. Offer B has 18 payments of €65. Which costs less overall?",
    choices: ["Offer B", "Both cost the same", "Offer A"],
    correct: 2,
    feedback: [
      "Offer B has a smaller monthly payment. Multiply it by all 18 months and compare the two totals.",
      "The two loans start at the same amount. Calculate the total of each set of repayments.",
      "Correct. Offer A costs €1,140 and Offer B costs €1,170. Offer A costs €30 less overall."
    ],
    success: "You compared the total repayment alongside the monthly cost.",
    reason: "Learn to check the full cost of a loan before making room for it in your budget."
  },
  {
    id: "lesson-diversification",
    title: "Look through funds to spot concentration",
    focus: "literacy",
    skill: "diversification",
    minutes: 1,
    xp: 15,
    teach: "A portfolio can hold several investments and still depend heavily on one company. Add your direct exposure to the shares you own indirectly through funds.",
    example: "If 20% of a portfolio is held in a fund and 10% of that fund is Company A, the portfolio has 2% indirect exposure to Company A.",
    question: "You hold 30% of your portfolio directly in one company and 50% in a fund. That company makes up 20% of the fund. How much of your portfolio depends on the company?",
    choices: ["30%", "40%", "50%"],
    correct: 1,
    feedback: [
      "30% is the direct holding. Add the exposure you hold through the fund.",
      "Correct. The direct exposure is 30%, and 20% of the fund's 50% adds another 10%.",
      "The fund's 20% exposure applies to its share of your portfolio. Multiply those shares before adding the direct holding."
    ],
    success: "You found the total exposure to a company across different holdings.",
    reason: "See how much one company can affect your whole portfolio."
  },
  {
    id: "lesson-fraud",
    title: "Recognise a suspicious bank message",
    focus: "literacy",
    skill: null,
    minutes: 1,
    xp: 10,
    teach: "Scammers create urgency to make you act before checking. Contact the bank through the app or through a number you already know is genuine.",
    example: "A text can appear in a familiar message thread. Open the banking app directly to check for an alert.",
    question: "You receive a text claiming your account will be blocked unless you confirm a code. What is the safest first step?",
    choices: ["Open your banking app directly and check for an alert", "Reply with the code to stop the block", "Tap the link in the text to see if it looks familiar"],
    correct: 0,
    feedback: [
      "Correct. Going directly to the bank gives you a trusted way to check the claim.",
      "Codes can authorise access. Verify the message through a trusted bank channel first.",
      "A fake page can look familiar. Open your banking app independently of the message."
    ],
    success: "You picked an independent, trusted route to check the claim.",
    reason: "Build the habit of checking urgent financial requests through a trusted channel."
  }
];

const focusLessons = [
  {
    id:"lesson-payday", focus:"habits", title:"Build a payday routine",
    teach:"A savings amount is easier to repeat when it leaves room for essentials and changes in spending.",
    example:"If you have €250 left in a typical month and only €120 in a tight month, a €100 transfer leaves some room in both.",
    question:"Which transfer would fit both months in that example?",
    choices:["€100", "€200", "€250"], correct:0,
    success:"You picked an amount the budget could support in both months.",
    reason:"Use a tight month to test a savings target you can repeat."
  },
  {
    id:"lesson-plan-gap", focus:"planning", title:"Test a plan against a lean month",
    teach:"A plan needs enough available cash in each month. A positive balance at the end can hide a shortfall along the way.",
    example:"A deposit is due in May and a bonus arrives in June. A June surplus cannot cover a May payment on its due date.",
    question:"Which figure shows whether cash runs short before the goal is reached?",
    choices:["The highest balance", "The lowest projected balance", "The last month’s income"], correct:1,
    success:"You checked the lowest balance across the plan.",
    reason:"Check the month when your projected balance is lowest before committing to a goal."
  },
  {
    id:"lesson-personal-runway", focus:"entrepreneurship", title:"Protect your personal runway",
    teach:"Separate household cash from cash committed to the business. Include only personal cash and draws you can reasonably count on.",
    example:"You hold €4,000 personally and €12,000 for business expenses. Your starting household runway uses the €4,000.",
    question:"What belongs in the starting household cash buffer?",
    choices:["All €16,000", "The €12,000 held for business costs", "The €4,000 held personally"], correct:2,
    success:"You separated personal reserves from money committed to the business.",
    reason:"Find the cash available for personal expenses before funding a business change."
  },
  {
    id:"lesson-support-network", focus:"community", title:"Build a trusted support network",
    teach:"List people who can help with specific decisions and verify how to reach them. A potential source of help becomes a funding assumption once the person has confirmed it.",
    example:"Before counting on family help for a move, agree on the amount and timing.",
    question:"When should you include help from your network in a cash forecast?",
    choices:["After confirming the amount and timing", "When you assume it will be available", "As soon as you list a contact"], correct:0,
    success:"You linked financial support to an explicit agreement.",
    reason:"Identify which support is confirmed and who can help with open decisions."
  },
  {
    id:"lesson-family-handover", focus:"succession", title:"Prepare a family handover",
    teach:"Start a handover plan by listing who makes decisions, which responsibilities will move and when the family will review them.",
    example:"Write down who handles operations, who owns the assets and which decisions need agreement.",
    question:"What should a first handover meeting clarify?",
    choices:["A date alone", "Roles, decision rights and a review date", "Which paperwork to sign before discussing roles"], correct:1,
    success:"You identified the decisions a family can agree on before a handover.",
    reason:"Set an agenda for decisions about ownership, roles and cash needs."
  },
  {
    id:"lesson-impact-goal", focus:"impact", title:"Turn an impact goal into a budget",
    teach:"Choose the outcome you care about, what you can afford to commit and how you will tell whether it made a difference.",
    example:"Set a yearly giving budget, identify the outcome you want to support and agree on one way to check progress.",
    question:"Which approach makes an impact goal easier to review?",
    choices:["Choose an appealing label", "Commit every spare euro", "Set a budget, define an outcome and check progress"], correct:2,
    success:"You made the impact goal measurable and linked it to a budget.",
    reason:"Connect a purpose or giving goal to an affordable commitment and a way to check progress."
  }
];

for (const lesson of focusLessons) {
  LESSONS.push({ ...lesson, skill:null, minutes:1, xp:10, focusOnly:true,
    feedback:lesson.choices.map((_, index) => index === lesson.correct ? lesson.success : lesson.teach) });
}

const relevantMetrics = {
  cash: ["buffer"],
  borrowing: ["cash-flow", "on-time"],
  diversification: ["concentration"]
};

export function lessonsFor(data, score, activity = []) {
  const completed = activity.map(item => typeof item === "string" ? item : item.id);
  const passed = new Set(completed);
  const evidence = literacySkills(data, completed);
  const mastered = new Set(evidence);
  const metrics = new Map((score?.dimensions ?? []).flatMap(dimension =>
    dimension.metrics.map(metric => [metric.id, metric.score])));
  const next = LESSONS.map(lesson => {
    const scores = (relevantMetrics[lesson.skill] ?? []).map(id => metrics.get(id)).filter(Number.isFinite);
    const gap = scores.length ? 100 - Math.min(...scores) : 0;
    const canImproveScore = evidence !== null && lesson.skill !== null && !mastered.has(lesson.skill);
    return {
      ...lesson,
      passed: passed.has(lesson.id),
      mastered: mastered.has(lesson.skill),
      canImproveScore,
      priority: gap,
      vote: data.priorities?.[lesson.focus] ?? 0
    };
  });
  next.sort((a, b) => Number(a.passed) - Number(b.passed) ||
    b.vote - a.vote || Number(b.canImproveScore) - Number(a.canImproveScore) || b.priority - a.priority);
  return next.map(({ priority, vote, ...lesson }, index) => ({ ...lesson, recommended: index === 0 && !lesson.passed }));
}

function dayNumber(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
}

export function learningPractice(activity = [], now = new Date()) {
  const lessonMap = new Map(LESSONS.map(lesson => [lesson.id, lesson]));
  const unique = new Set();
  const days = new Set();
  const today = dayNumber(now);
  let xp = 0;
  for (const { id, at } of activity) {
    const lesson = lessonMap.get(id);
    if (!lesson || unique.has(id)) continue;
    unique.add(id);
    xp += lesson.xp;
    const day = dayNumber(new Date(at));
    if (Number.isFinite(day) && day <= today) days.add(day);
  }
  const practicedToday = days.has(today);
  let streak = 0;
  for (let day = practicedToday ? today : today - 1; days.has(day); day -= 1) streak += 1;
  return { completed: unique.size, total: LESSONS.length, xp, streak, practicedToday };
}
