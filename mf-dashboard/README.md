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
