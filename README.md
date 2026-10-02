# MF Dashboard

Money Forward ME のデータを可視化するダッシュボード

## 構成

```
mf-dashboard/
├── scraper/          # Puppeteerスクレイパー
│   ├── index.js
│   └── package.json
├── dashboard/        # React (Vite) ダッシュボード
│   ├── src/
│   ├── public/
│   └── package.json
└── .github/
    └── workflows/    # GitHub Actions（定期実行）
```

## セットアップ

### 1. スクレイパー

```bash
cd scraper
npm install

# 環境変数を設定
export MF_EMAIL="your-email@example.com"
export MF_PASSWORD="your-password"

# 実行
npm run scrape
```

**注意**: 2段階認証を設定している場合、初回実行時に手動で認証が必要です。

### 2. ダッシュボード

```bash
cd dashboard
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build
```

## デプロイ

### GitHub Pages

1. リポジトリの Settings > Pages で GitHub Actions を選択
2. `.github/workflows/deploy.yml` を有効化
3. Secrets に `MF_EMAIL` と `MF_PASSWORD` を設定

### 手動デプロイ

```bash
# スクレイピング実行
cd scraper && npm run scrape

# ビルド
cd ../dashboard && npm run build

# distフォルダをデプロイ
```

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `MF_EMAIL` | Money Forward MEのメールアドレス |
| `MF_PASSWORD` | Money Forward MEのパスワード |

## セキュリティ

- 認証情報は環境変数で管理し、コードにハードコードしない
- GitHub Secrets を使用して安全に管理
- 2段階認証を有効にすることを推奨

## ライセンス

MIT

## 注意事項

- このツールはMoney Forward MEの非公式ツールです
- MFの仕様変更により動作しなくなる可能性があります
- 利用規約に抵触する可能性があるため、自己責任でご利用ください

## 定期予測の日付

`monthly-day` は1〜31の整数の指定日に発生します。その日が存在しない短い月はスキップし、翌月へ繰り上げません。毎月末に発生させる場合は `month-end` を使います。開始・終了日は両端を含みます。予測は仮定であり、確定入出金とは区別します。

確定取引が定期予測を置き換える場合は、その確定イベントに同じ `forecastRuleId` と `isoDate` を明示します。一致した日の同じルールだけが予測から除外され、確定金額を一度だけ適用します。ラベル・金額が同じだけでは別取引の可能性があるため自動統合しません。基準実残高の日付以前の予測は、その残高に含まれる期間として除外します。実データへの紐付けは確認した取引だけに行ってください。

予測ルールの `id` は一意な非空文字列で、前後の空白は禁止です。
確定取引の `forecastRuleId` を指定する場合は、予測有効時に存在するルールを
参照してください。欠落・nullは未紐付けとして別取引を保ち、名称や金額から推測しません。
予測無効時は廃止ルールを参照する過去の確定取引をそのまま適用します。
