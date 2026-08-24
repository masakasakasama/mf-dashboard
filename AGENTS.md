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

- `dashboard/public/cashflow.json` for current balance, confirmed future events, and forecast assumptions
- `dashboard/public/subscriptions.json` for subscription data

Do NOT edit React/CSS/workflows for an ordinary balance or amount update.

The Web UI fetches canonical JSON directly from GitHub `main` with cache-busting, and `dashboard/**` pushes also trigger a GitHub Pages rebuild as a second safety net.

## Single-source-of-truth cashflow rules

`cashflow.json` is the only editable source of truth for finance inputs.

- `start.balance` = current actual bank balance at `start.date`
- `events` = confirmed transactions not yet reflected in `start.balance`
- `forecast.recurring` = assumptions used only for future prediction after confirmed events
- Never re-add transactions already included in the current actual balance
- Preserve chronological order in confirmed `events`
- Positive `amount` = income, negative `amount` = expense
- Keep `type` as one of `income`, `card`, `fixed`, `special`
- JALカードSuicaゴールド is the View card payment. Never double-count it as a second generic View payment
- If a card bill already includes a purchase such as the engagement ring, never add the purchase again as a separate event

Do NOT store copied/derived balance numbers in `flags`, `subtitle`, JSX, or CSS. Derived values go stale and caused prior update omissions.

All derived values must come from `dashboard/src/financeModel.js`:

- current balance
- confirmed-event balances
- forecast events generated from `forecast.recurring`
- projected balance and projected date/label
- minimum balance
- salary amount/date/label
- chart points
- summary cards
- history boundary text

When `start.balance`, any `events[].amount`, or any forecast rule changes, every dependent display must update from the same model automatically.

## Forecast rules

Use `forecast.recurring` instead of manually writing months of copied projections.

Supported schedules:

- `month-end`
- `monthly-day` with `day`

Each forecast rule must have:

- `id`
- `label`
- `type`
- `amount`
- `schedule`
- `start` and `end` as `YYYY-MM-DD`
- `note`

Forecast amounts are assumptions, not confirmed transactions. If future card bills are unknown, do not invent them. State the exclusion in `forecast.note`.

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
- Version has one source of truth: `dashboard/package.json`
- React reads that version rather than duplicating a literal version string
- Do not inject version text from CSS

## Deployment rules

- Every `dashboard/**` push triggers validation, build, and GitHub Pages deployment
- Finance JSON is also read directly from GitHub `main`, so data updates do not wait on deployment to become available to the running app

## Validation

For every finance change:

```bash
python -m json.tool dashboard/public/cashflow.json > /dev/null
python -m json.tool dashboard/public/subscriptions.json > /dev/null
```

For UI/model/schema changes:

```bash
cd dashboard && npm install && npm run build
```

Before finishing, verify mathematically that the model starts from `start.balance`, applies confirmed `events` exactly once, then applies generated forecast events exactly once. Never hand-copy a projected balance into another file.
