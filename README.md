# PULS: Financial Health Scanner for Next Gen Clients

> Hackathon concept for Deutsche Bank's **Next Gen** challenge (FUTURY Build Days #4, Frankfurt, November 2026). Built by a team, **awarded 2nd place** in the challenge. It uses **synthetic data only** and is **not an official Deutsche Bank product**.

PULS gives younger bank clients a simple, honest answer to "How healthy are my finances, and what should I do next?" It turns a client's banking data into one **health score**, explains what drives it, and coaches the next step with an AI assistant called **Pip**. It works in two places: on a **branch terminal** (card-in kiosk) and inside **mobile banking**, with a secure hand-off between them.

## The business problem

- Younger clients are an under-served segment: they have little wealth today but high lifetime value if the bank earns their trust early.
- Existing banking apps show balances and transactions, but rarely answer whether the client is on track.
- Branch visits and app usage are disconnected, so advice given in one place is lost in the other.

## The solution

| Need | How PULS addresses it |
|---|---|
| A clear picture of financial health | A single score (red below 50, blue 50-74, green 75+) with six weekly checkpoints |
| Understanding, not just a number | Score report listing every input, weight, source and contribution, with CSV export |
| Guidance people act on | Pip suggests one weekly next step and learning lessons based on the client's profile and priorities |
| Planning for life events | Simulator for life events, family and retirement forecasts (up to 120 months) |
| Continuity across channels | Branch kiosk and mobile app share the scan; a phone link (valid 10 minutes) continues the session |
| A path to a human advisor | Meeting brief and a hand-off to an advisor appointment when a portfolio or life event warrants it |
| Privacy | Kiosk session closes after inactivity (30 s warning after 2:30 idle); data stays in the browser for the session |

## Business value (hypotheses to validate)

- **Engagement:** a recurring reason to open the app (weekly checkpoints, learning road, progress).
- **Cross-sell with context:** advisor and wealth-management conversations start from a shared, explained score instead of a cold pitch.
- **Trust:** transparent weights and sources instead of a black-box rating.
- **Branch efficiency:** clients arrive with a prepared brief of goals, figures and questions.

These are product hypotheses from the hackathon, not measured results.

## How it works

1. **Sign in:** insert a sample bank card at the kiosk (simulated PIN entry), or open the mobile view.
2. **Onboard:** choose life plans and vote on priorities. Votes change the four score weights.
3. **Add data:** use the sample linked bank, enter assets manually, or import a CSV (`Name,Type,Value`, type is `cash`, `investment` or `other`).
4. **Read the score:** Health, Financial fitness, Financial behaviour, Knowledge and Future readiness views.
5. **Act:** follow Pip's next step, run the simulator, save an annual snapshot, export the report or share a brief with an advisor.

### Main modules

| Area | Files |
|---|---|
| Scoring model and weights | `dist/model.js`, `dist/priorities.js`, `dist/measurement.js` |
| Coaching and learning content | `dist/coaching.js`, `dist/learning.js`, `dist/insights.js` |
| Planning and forecasts | `dist/long-plan.js`, `dist/growth.js`, `dist/cash-allocation.js` |
| Interfaces | `dist/branch.js` (kiosk), `dist/app.js` and `dist/puls-ui.js` (mobile), `dist/advisor.js`, `dist/handoff.js` |
| AI coach server | `coach-server.mjs` |
| Web server and build | `server.mjs`, `worker/index.js`, `scripts/build-site.mjs` |

## Tech stack

Vanilla JavaScript front end, Node.js 24 server (no runtime dependencies), Docker and Docker Compose, esbuild for the site build, and an LLM gateway for Pip's live replies.

## Run it

Requires Docker (or Node.js 24).

```sh
docker compose up -d --build
```

- Branch demo: http://127.0.0.1:8080/ then choose **Insert a bank card**
- Mobile demo: http://127.0.0.1:8080/?mode=phone
- Health check: `/api/health`
- Without Docker: `HOST=127.0.0.1 node server.mjs`
- Stop: `docker compose down`

Settings: `PULS_BIND` (default `127.0.0.1`) and `PULS_PORT` (default `8080`).

### Optional: live AI replies

Pip works out of the box with built-in demo guidance. To use a live model, set `JAIF_API_KEY` in your environment and run:

```sh
docker compose -f compose.yaml -f compose.live.yaml up -d --build
```

The key is mounted as a server-side secret and never reaches the browser. `JAIF_BASE_URL` and `JAIF_MODEL` are configurable. Pip answers in 2-4 plain sentences, uses only the figures shown in the demo, and gives no investment, tax or legal advice. If the key is missing or the call fails, it falls back to local guidance.

### Build the site bundle

```sh
npm ci
npm run build
```

## Integration boundary and limitations

- The mobile screen shows where PULS would sit in a signed-in banking app. A production release would need the bank's app code and approved, authenticated interfaces for accounts, portfolios, branch hand-off and secure advisor messages.
- The demo uses local browser state, read-only sample banking endpoints and an expiring phone link.
- All profiles and balances are synthetic. Scores are illustrative and are not financial advice.

## Disclaimer

Concept prototype created for a hackathon. Deutsche Bank names and artwork belong to their owners and are used here only to illustrate the concept. This project is not affiliated with or endorsed by Deutsche Bank.
