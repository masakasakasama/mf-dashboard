# CODEX_STATE

Status: in_progress
Goal: 金融入力の検証と東京日付境界での一貫したモデル計算

## Done
- 非ISO・存在しない日付と欠落・非有限の金額を拒否し、日付繰上がりとNaN伝播を防止。
- 東京の深夜境界、各入出金一回適用、過去実残高日付と未来リストをfixtureで検証。
- 再現可能な依存インストールのためlockfileを追加。金融実データJSONは変更していない。

- monthly-dayの存在しない指定日を翌月へ繰り上げずスキップ。1〜31以外・非数値を拒否。
- 月末・うるう年・期間境界のfixtureを追加し、READMEに固定日と月末の違いを明記。バージョン1.8.2。

## Current
- 金融実データは変更せず、モデルのみ改善。

## Next
- confirmedイベントとrecurring予測が同日・同ルールに重なる場合の既存入力方針を整理し、二重計上防止のfixtureを追加する。

## Blockers
- MoneyForward接続資格情報は未提供。実データ収集・本番疎通は未実施。

## Verification
- npm test: 6/6 passed; npm run build passed (existing large-chunk warning)
- canonical JSON validation passed; actual model arithmetic / Tokyo future boundary / future minimum verified without logging balances
- git diff --check passed

Updated at: 2026-10-02T15:17:02.466253+00:00
