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

- 繰り返しrule idの欠落/非文字列/空白/重複を拒否。明示forecastRuleIdの不正/未知参照を拒否し、欠落/nullは未紐付けとして保持。
- 予測無効時の廃止ruleへの過去リンクを保持。version1.8.4、金融JSON変更なし。

## Current
- 11回帰テストとcanonicalモデル算術/東京未来filterで検証済み。

## Next
- MoneyForward接続資格情報が利用可能になれば収集と本番疎通を確認する。実データの推測変更をしない。

## Blockers
- MoneyForward接続資格情報未提供。実データ収集・本番疎通は未実施。

## Verification
- npm test 11/11 passed; production build passed (existing chunk-size warning)
- cashflow/subscriptions JSON validation passed; canonical arithmetic and Tokyo future filter passed without financial values in output
- git diff --check passed

Updated at: 2026-10-02T21:01:35.343085+00:00
