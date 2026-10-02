# CODEX_STATE

Status: in_progress
Goal: 金融入力の検証と東京日付境界での一貫したモデル計算

## Done
- 非ISO・存在しない日付と欠落・非有限の金額を拒否し、日付繰上がりとNaN伝播を防止。
- 東京の深夜境界、各入出金一回適用、過去実残高日付と未来リストをfixtureで検証。
- 再現可能な依存インストールのためlockfileを追加。金融実データJSONは変更していない。

- monthly-dayの存在しない指定日を翌月へ繰り上げずスキップ。1〜31以外・非数値を拒否。
- 月末・うるう年・期間境界のfixtureを追加し、READMEに固定日と月末の違いを明記。バージョン1.8.2。

- forecastRuleId+isoDateで明示紐付けされた確定取引が、その日の予測だけを置き換える。ラベル・金額から同一取引を推測しない。
- 基準実残高の日付以前の予測を再加算しない。別ルール・別日を保持するfixtureを追加。version1.8.3、実データJSON変更なし。

## Current
- 8テストと実データモデル算術で検証済み。

## Next
- 繰り返しルールのid欠落・重複入力の扱いを検証し、曖昧なforecastRuleId紐付けを防ぐ。

## Blockers
- MoneyForward接続資格情報は未提供。実データ収集・本番疎通は未実施。

## Verification
- npm test 8/8 passed; production build passed (existing chunk-size warning)
- cashflow/subscriptions JSON validation and canonical model arithmetic/Tokyo boundary/future minimum passed without financial values in output
- git diff --check passed

Updated at: 2026-10-02T16:42:11.977416+00:00
