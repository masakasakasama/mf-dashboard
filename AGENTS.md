# Codex instructions for mf-dashboard

## Repository scope guard

This task belongs ONLY to the repository `masakasakasama/mf-dashboard`.

- Do not inspect, modify, commit, push, build, release, or deploy any other repository for this task
- In particular, do NOT touch `Money_management`, Android APKs, Android release workflows, Android branches, or Android Studio projects
- The target product is the Web dashboard in `masakasakasama/mf-dashboard`
- The deployment target is GitHub Pages for `mf-dashboard`
- This project is WEB-ONLY
- Before making any change, verify the current repository is `masakasakasama/mf-dashboard`

## Normal finance update workflow

Routine finance updates must be data-only.

Only edit:

- `dashboard/public/cashflow.json` for current balance and future income/expense events
- `dashboard/public/subscriptions.json` for subscription data

Do NOT edit React/CSS/workflows for an ordinary balance or amount update.

The deployed Web UI fetches these JSON files directly from GitHub `main` with cache-busting. Therefore a routine JSON update must become visible without rebuilding the Web app. GitHub Pages deployment is only required when the UI shell/code changes.

## Single-source-of-truth cashflow rules

`cashflow.json` is the only source of truth for all balance figures.

- `start.balance` = current actual bank balance at the stated `start.date`
- `events` = only transactions not yet reflected in `start.balance`
- Never re-add transactions already included in the current actual balance
- Preserve chronological order in `events`
- Positive `amount` = income, negative `amount` = expense
- Keep `type` as one of `income`, `card`, `fixed`, `special`
- JALカードSuicaゴールド is the View card payment. Never double-count it as a second generic View payment
- If a card bill already includes a purchase such as the engagement ring, never add the purchase again as a separate event

All UI-derived values must come from `dashboard/src/financeModel.js` and never be hardcoded in JSX:

- current balance
- projected balance
- projected date/label
- minimum balance
- salary amount/date/label
- chart points
- summary cards
- history boundary text

When `start.balance` or any `events[].amount` changes, every one of those displays must change automatically from the same model. Do not add hardcoded dates such as `8/23`, `8/26`, labels such as `8月給与`, or manually copied projected balances in `App.jsx`.

## Data freshness architecture

- `dashboard/src/dataSource.js` fetches canonical JSON from `raw.githubusercontent.com/.../main/dashboard/public`
- Add a cache-busting query parameter for every request
- The deployed copy under GitHub Pages is fallback only
- Do not restore service-worker caching for finance JSON
- Do not add duplicate local data constants in React

## Subscription rules

- Use `billing: monthly` or `annual`
- Use `currency: JPY` or `USD`
- `split` is the number of people sharing the cost
- For USD subscriptions, use `taxRate` and `fxRate`
- If the actual JPY charge is known, `monthlyJpyOverride` takes priority
- `status` must be `active`, `review`, or `cancelled`
- Browser drag-and-drop status is localStorage only; canonical status is in `subscriptions.json`

## UI rules

- Do not add buttons that have no meaningful action
- Keep only useful navigation/actions
- Version must have one source of truth: `dashboard/package.json`; React reads that version rather than duplicating a literal version string
- Do not reintroduce duplicate CSS overrides solely to inject version text

## Deployment rules

- JSON-only changes must not require a Web rebuild to become visible
- UI/code changes trigger GitHub Pages deployment through `.github/workflows/deploy.yml`
- Do not add `cashflow.json` or `subscriptions.json` back to the push path filter for deployment unless the architecture changes

## Validation

For JSON-only updates:

```bash
python -m json.tool dashboard/public/cashflow.json > /dev/null
python -m json.tool dashboard/public/subscriptions.json > /dev/null
```

For UI/code changes:

```bash
cd dashboard && npm install && npm run build
```

Before finishing any finance change, verify mathematically that:

```text
projected balance = start.balance + sum(events[].amount)
```

and confirm the UI reads the projected balance only from `financeModel.js`.
