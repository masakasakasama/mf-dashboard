import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 環境変数から認証情報を取得
const EMAIL = process.env.MF_EMAIL;
const PASSWORD = process.env.MF_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('環境変数 MF_EMAIL と MF_PASSWORD を設定してください');
  process.exit(1);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeMoneyForward() {
  console.log('🚀 Money Forward ME スクレイピング開始...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  try {
    // ログインページへ
    console.log('📝 ログインページへアクセス...');
    await page.goto('https://moneyforward.com/sign_in', { waitUntil: 'networkidle2' });
    await sleep(2000);
    
    // メールアドレス入力
    await page.waitForSelector('input[type="email"], input[name="mfid_user[email]"]');
    await page.type('input[type="email"], input[name="mfid_user[email]"]', EMAIL);
    
    // ログインボタンクリック
    const emailSubmitBtn = await page.$('button[type="submit"], input[type="submit"]');
    if (emailSubmitBtn) {
      await emailSubmitBtn.click();
      await sleep(3000);
    }
    
    // パスワード入力
    await page.waitForSelector('input[type="password"]');
    await page.type('input[type="password"]', PASSWORD);
    
    // パスワード送信
    const passwordSubmitBtn = await page.$('button[type="submit"], input[type="submit"]');
    if (passwordSubmitBtn) {
      await passwordSubmitBtn.click();
    }
    
    console.log('🔐 ログイン処理中...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);
    
    // 2段階認証チェック（手動対応が必要な場合）
    const currentUrl = page.url();
    if (currentUrl.includes('two_factor') || currentUrl.includes('mfa')) {
      console.log('⚠️  2段階認証が必要です。手動で認証してください。');
      console.log('30秒待機します...');
      await sleep(30000);
    }
    
    // 資産ページへ
    console.log('💰 資産ページを取得中...');
    await page.goto('https://moneyforward.com/bs/portfolio', { waitUntil: 'networkidle2' });
    await sleep(3000);
    
    // 資産データ取得
    const assetData = await page.evaluate(() => {
      const assets = [];
      
      // 資産グループを取得
      const groups = document.querySelectorAll('.bs-group, .portfolio-group, [class*="asset-group"]');
      
      groups.forEach(group => {
        const categoryEl = group.querySelector('.heading-category, h3, .group-name');
        const category = categoryEl ? categoryEl.textContent.trim() : '不明';
        
        const items = group.querySelectorAll('.account, .portfolio-item, [class*="account-item"]');
        items.forEach(item => {
          const nameEl = item.querySelector('.account-name, .name, a');
          const valueEl = item.querySelector('.amount, .value, [class*="amount"]');
          
          if (nameEl && valueEl) {
            const name = nameEl.textContent.trim();
            const valueText = valueEl.textContent.trim();
            const value = parseInt(valueText.replace(/[^0-9-]/g, '')) || 0;
            
            assets.push({ category, name, value });
          }
        });
      });
      
      // 代替: テーブルからデータ取得
      if (assets.length === 0) {
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
              const name = cells[0].textContent.trim();
              const valueText = cells[cells.length - 1].textContent.trim();
              const value = parseInt(valueText.replace(/[^0-9-]/g, '')) || 0;
              if (name && value !== 0) {
                assets.push({ category: '資産', name, value });
              }
            }
          });
        });
      }
      
      return assets;
    });
    
    // 資産推移ページへ
    console.log('📈 資産推移を取得中...');
    await page.goto('https://moneyforward.com/bs/history', { waitUntil: 'networkidle2' });
    await sleep(3000);
    
    const historyData = await page.evaluate(() => {
      const history = [];
      const rows = document.querySelectorAll('table tr, .history-item');
      
      rows.forEach(row => {
        const dateEl = row.querySelector('td:first-child, .date');
        const valueEl = row.querySelector('td:last-child, .amount');
        
        if (dateEl && valueEl) {
          const date = dateEl.textContent.trim();
          const valueText = valueEl.textContent.trim();
          const value = parseInt(valueText.replace(/[^0-9-]/g, '')) || 0;
          
          if (date && value !== 0) {
            history.push({ date, value });
          }
        }
      });
      
      return history.slice(0, 30); // 直近30件
    });
    
    // 収支ページへ
    console.log('📊 収支データを取得中...');
    await page.goto('https://moneyforward.com/cf', { waitUntil: 'networkidle2' });
    await sleep(3000);
    
    const cashflowData = await page.evaluate(() => {
      const result = {
        income: 0,
        expense: 0,
        transactions: []
      };
      
      // 収入・支出サマリー
      const incomeEl = document.querySelector('.plus, .income, [class*="income"]');
      const expenseEl = document.querySelector('.minus, .expense, [class*="expense"]');
      
      if (incomeEl) {
        result.income = parseInt(incomeEl.textContent.replace(/[^0-9]/g, '')) || 0;
      }
      if (expenseEl) {
        result.expense = parseInt(expenseEl.textContent.replace(/[^0-9]/g, '')) || 0;
      }
      
      // 明細取得
      const rows = document.querySelectorAll('table tr, .transaction-item');
      rows.forEach(row => {
        const dateEl = row.querySelector('.date, td:first-child');
        const contentEl = row.querySelector('.content, .memo, td:nth-child(2)');
        const categoryEl = row.querySelector('.category, td:nth-child(3)');
        const amountEl = row.querySelector('.amount, td:last-child');
        
        if (dateEl && contentEl && amountEl) {
          const date = dateEl.textContent.trim();
          const content = contentEl.textContent.trim();
          const category = categoryEl ? categoryEl.textContent.trim() : '';
          const amountText = amountEl.textContent.trim();
          const amount = parseInt(amountText.replace(/[^0-9-]/g, '')) || 0;
          
          if (date && content) {
            result.transactions.push({ date, content, category, amount });
          }
        }
      });
      
      return result;
    });
    
    // データ集計
    console.log('📦 データ整形中...');
    
    const assetsByCategory = {};
    assetData.forEach(asset => {
      if (!assetsByCategory[asset.category]) {
        assetsByCategory[asset.category] = [];
      }
      assetsByCategory[asset.category].push({
        name: asset.name,
        value: asset.value
      });
    });
    
    const totalAssets = assetData.reduce((sum, a) => sum + a.value, 0);
    
    const output = {
      updatedAt: new Date().toISOString(),
      summary: {
        totalAssets,
        income: cashflowData.income,
        expense: cashflowData.expense,
        balance: cashflowData.income - cashflowData.expense
      },
      assetComposition: Object.entries(assetsByCategory).map(([category, items]) => ({
        category,
        total: items.reduce((sum, i) => sum + i.value, 0),
        items
      })),
      assetHistory: historyData,
      recentTransactions: cashflowData.transactions.slice(0, 20)
    };
    
    // JSON出力
    const outputPath = path.join(__dirname, '../dashboard/public/data.json');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    
    console.log('✅ スクレイピング完了!');
    console.log(`📁 出力: ${outputPath}`);
    console.log(`💰 総資産: ${totalAssets.toLocaleString()}円`);
    
    return output;
    
  } catch (error) {
    console.error('❌ エラー発生:', error.message);
    
    // エラー時のスクリーンショット
    await page.screenshot({ path: path.join(__dirname, 'error-screenshot.png') });
    console.log('📸 エラー時のスクリーンショットを保存しました');
    
    throw error;
  } finally {
    await browser.close();
  }
}

// 実行
scrapeMoneyForward().catch(console.error);
