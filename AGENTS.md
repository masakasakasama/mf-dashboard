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

- `dashboard/public/cashflow.json` for actual balance, confirmed events, and forecast assumptions
- `dashboard/public/subscriptions.json` for canonical subscription data

Do NOT edit React/CSS/workflows for an ordinary balance or amount update.

The Web UI fetches canonical JSON directly from GitHub `main` with cache-busting, and UI/model pushes trigger a GitHub Pages rebuild.

## Single-source-of-truth cashflow rules

`cashflow.json` is the only editable source of truth for finance inputs.

- `start.balance` = actual bank balance confirmed at `start.isoDate`
- `start.date` = display label for that actual-balance date
- `events` = confirmed transactions not reflected in `start.balance`
- every confirmed event must include `isoDate: YYYY-MM-DD`
- `forecast.recurring` = assumptions used only for future prediction
- Never relabel an old actual balance as today's actual balance
- Never re-add transactions already included in the actual balance
- Preserve chronological order in confirmed `events`
- Positive `amount` = income, negative `amount` = expense
- Keep `type` as one of `income`, `card`, `fixed`, `special`
- JALカードSuicaゴールド is the View card payment. Never double-count it as a second generic View payment
- If a card bill already includes a purchase such as the engagement ring, never add the purchase again as a separate event

Do NOT store copied/derived balance numbers in `flags`, JSX, or CSS. Derived values go stale and caused prior update omissions.

All derived values must come from `dashboard/src/financeModel.js`:

- base actual balance and its date
- today's date in Asia/Tokyo
- today's projected balance
- confirmed-event balances
- generated forecast events
- final projected balance and date/label
- future minimum balance
- next salary and fixed-cost event
- chart points
- summary cards
- history boundary text

When `start.balance`, an event, a forecast rule, or the calendar date changes, every dependent display must update from the model automatically.

## Today and future-display rules

The UI must be explicit about three different concepts:

1. `基準実残高`: the last balance actually confirmed by the user, with its real date
2. `今日時点見込み`: modelled balance as of the current date in `Asia/Tokyo`
3. `残高見込み`: future projected balance through the configured forecast horizon

Rules:

- The header must display today's real date dynamically; do not hardcode dates in JSX
- Home `今後の入出金` must show only events where `isoDate > today`
- Events on or before today may appear only in the history/detail view, never under a heading that says future/upcoming
- If the confirmed actual-balance date is old, keep showing that old date as the base actual date instead of pretending it is current
- The future minimum balance must be calculated from today forward, not from historical points

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
- Do not add duplicate local finance constants in React

## Subscription rules

- Use `billing: monthly` or `annual`
- Use `currency: JPY` or `USD`
- `split` is the number of people sharing the cost
- For USD subscriptions, use `taxRate` and `fxRate`
- If the actual JPY charge is known, `monthlyJpyOverride` takes priority
- `status` must be `active`, `review`, or `cancelled`
- Canonical subscription data is in `subscriptions.json`
- Browser drag-and-drop status changes are localStorage only
- User-added subscriptions created from the Web UI are localStorage only unless explicitly promoted into `subscriptions.json`
- The UI must clearly state when added data is browser-local

## UI rules

- Do not add buttons that have no meaningful action
- Keep only useful navigation/actions
- Home prioritizes `残高見込み`, then supporting actual/today/minimum balances
- Future cashflow must use a readable transaction-list pattern with date, type, label, confirmed/forecast state, amount, and post-transaction balance
- Version has one source of truth: `dashboard/package.json`
- React reads that version rather than duplicating a literal version string
- Do not inject version text from CSS

## Deployment rules

- Every UI/model `dashboard/**` push triggers validation, build, and GitHub Pages deployment
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

Before finishing, verify mathematically that the model starts from `start.balance`, applies each confirmed event exactly once, applies generated forecast events exactly once, and filters the home future list against today's Asia/Tokyo date. Never hand-copy a projected balance into another file.
