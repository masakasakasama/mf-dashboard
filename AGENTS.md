# Codex instructions for mf-dashboard

## Normal update workflow

For routine finance updates, do not edit React code.

Only edit these JSON files:

- `dashboard/public/cashflow.json` for balances, salaries, card bills, fixed costs, bonuses, and one-off expenses
- `dashboard/public/subscriptions.json` for subscription plans, prices, splits, tax, FX, billing cycle, and default contract status

After editing JSON, commit directly to `main`. A push to `main` automatically builds and deploys the GitHub Pages app.

## Cashflow rules

- Preserve chronological order in `events`
- Positive `amount` means income, negative `amount` means expense
- Keep `type` as one of `income`, `card`, `fixed`, `special`
- JALカードSuicaゴールド is the View card payment. Do not add a separate generic View card line for the same bill
- Do not double-count a transaction when date, merchant/label, and amount identify the same charge
- Do not infer or add an expense that the user explicitly said to exclude
- Update `updatedAt`, `subtitle`, and `flags` when assumptions change

## Subscription rules

- Use `billing: monthly` or `annual`
- Use `currency: JPY` or `USD`
- `split` is the number of people sharing the cost. Example: Netflix split 50/50 uses `split: 2`
- For USD subscriptions, use `taxRate` and `fxRate`
- If the actual JPY charge is known, set `monthlyJpyOverride` and it takes priority over FX calculation
- `status` must be one of `active`, `review`, `cancelled`
  - `active`: currently subscribed and counted in monthly/annual cost
  - `review`: still subscribed, counted in cost, but shown as a review candidate
  - `cancelled`: excluded from current subscription cost
- Drag-and-drop changes in the app are stored only in that browser's localStorage. To make a status canonical across devices, update `status` in `subscriptions.json`
- Update `updatedAt` and `note` when plan or pricing assumptions change

## Validation

Before committing:

```bash
python -m json.tool dashboard/public/cashflow.json > /dev/null
python -m json.tool dashboard/public/subscriptions.json > /dev/null
cd dashboard && npm install && npm run build
```

Do not edit `dashboard/src/App.jsx` or `.github/workflows/deploy.yml` for ordinary numeric updates unless the user explicitly requests a UI/schema/deployment change.
