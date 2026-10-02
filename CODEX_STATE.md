# CODEX_STATE

Status: in_progress
Goal: 金融入力の検証と東京日付境界での一貫したモデル計算

## Done
- 非ISO・存在しない日付と欠落・非有限の金額を拒否し、日付繰上がりとNaN伝播を防止。
- 東京の深夜境界、各入出金一回適用、過去実残高日付と未来リストをfixtureで検証。
- 再現可能な依存インストールのためlockfileを追加。金融実データJSONは変更していない。

## Current
- モデル修正を検証しGitHubへcheckpoint。

## Next
- monthly-dayの月末境界の既存仕様を整理し、短い月とmonth-endの回帰fixtureを追加する。

## Blockers
- MoneyForward接続資格情報は未提供。実データ収集・本番疎通は未実施。

## Verification
- npm test: 3/3 passed; npm run build passed (existing large-chunk warning)
- cashflow.json / subscriptions.json: python -m json.tool passed
- 実データの基準残高から各event/forecast一回加算、future > Tokyo today、future minimumの算術一致を確認（金融金額はログ出力しない）
- git diff --check passed

Updated at: 2026-10-02T14:55:45.570583+00:00
