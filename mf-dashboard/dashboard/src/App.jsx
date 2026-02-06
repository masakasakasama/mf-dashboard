import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, BarChart3, Shield, Gift, RefreshCw, Calendar, CreditCard } from 'lucide-react';

const CATEGORY_CONFIG = {
  '預金・現金・暗号資産': { color: '#3B82F6', icon: Wallet },
  '投資信託': { color: '#F97316', icon: PiggyBank },
  '株式(現物)': { color: '#EF4444', icon: BarChart3 },
  '年金': { color: '#10B981', icon: Shield },
  'ポイント・マイル': { color: '#8B5CF6', icon: Gift },
  '預金': { color: '#3B82F6', icon: Wallet },
  '株式': { color: '#EF4444', icon: BarChart3 },
  'default': { color: '#6B7280', icon: Wallet }
};

const formatCurrency = (value) => {
  if (value === undefined || value === null) return '0円';
  return new Intl.NumberFormat('ja-JP').format(value) + '円';
};

const formatChange = (value) => {
  if (!value) return '+0円';
  const prefix = value >= 0 ? '+' : '';
  return prefix + new Intl.NumberFormat('ja-JP').format(value) + '円';
};

const getConfig = (category) => {
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG['default'];
};

// デモデータ
const DEMO_DATA = {
  updatedAt: new Date().toISOString(),
  summary: {
    totalAssets: 5383100,
    income: 304461,
    expense: 222125,
    balance: 82336
  },
  assetComposition: [
    { category: '預金・現金・暗号資産', total: 2314926, change: -18319, items: [
      { name: '三菱UFJ銀行', value: 1500000 },
      { name: '楽天銀行', value: 814926 }
    ]},
    { category: '投資信託', total: 1999859, change: -3638, items: [
      { name: 'eMAXIS Slim 米国株式(S&P500)', value: 850000 },
      { name: 'eMAXIS Slim 全世界株式', value: 650000 },
      { name: '楽天・全米株式', value: 499859 }
    ]},
    { category: '株式(現物)', total: 703040, change: 3226, items: [
      { name: 'トヨタ自動車', value: 350000 },
      { name: 'ソニーグループ', value: 200000 },
      { name: '任天堂', value: 153040 }
    ]},
    { category: '年金', total: 350038, change: 3691, items: [
      { name: 'iDeCo', value: 350038 }
    ]},
    { category: 'ポイント・マイル', total: 15237, change: 218, items: [
      { name: '楽天ポイント', value: 10000 },
      { name: 'Vポイント', value: 5237 }
    ]}
  ],
  assetHistory: [
    { date: '2025/08', value: 4643327 },
    { date: '2025/09', value: 4750000 },
    { date: '2025/10', value: 4900000 },
    { date: '2025/11', value: 5100000 },
    { date: '2025/12', value: 5200000 },
    { date: '2026/01', value: 5300000 },
    { date: '2026/02', value: 5383100 }
  ],
  recentTransactions: [
    { date: '2/28', content: '住民税', category: '税金', amount: -15000 },
    { date: '2/27', content: '家賃', category: '住宅', amount: -75000 },
    { date: '2/27', content: 'JR東日本', category: '交通費', amount: -433 },
    { date: '2/25', content: '給与', category: '給与', amount: 280000 },
    { date: '2/24', content: 'スーパー', category: '食費', amount: -3500 }
  ]
};

export default function MFDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('前日');
  const [historyPeriod, setHistoryPeriod] = useState('6ヶ月');
  const [useDemo, setUseDemo] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/data.json');
      if (!res.ok) throw new Error('データファイルが見つかりません');
      const json = await res.json();
      setData(json);
      setUseDemo(false);
    } catch (err) {
      console.log('実データなし、デモデータを使用:', err.message);
      setData(DEMO_DATA);
      setUseDemo(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  const { summary, assetComposition, assetHistory, recentTransactions } = data;
  const totalAssets = summary?.totalAssets || assetComposition?.reduce((sum, c) => sum + c.total, 0) || 0;
  const totalChange = assetComposition?.reduce((sum, c) => sum + (c.change || 0), 0) || 0;

  const pieData = assetComposition?.map(cat => ({
    name: cat.category,
    value: cat.total,
    change: cat.change || 0,
    percentage: Math.round((cat.total / totalAssets) * 100),
    ...getConfig(cat.category)
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap');
        * { font-family: 'Noto Sans JP', sans-serif; }
      `}</style>
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">MF Dashboard</h1>
            {useDemo && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">デモ</span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(data.updatedAt).toLocaleString('ja-JP')}
            </span>
            <button onClick={loadData} className="p-2 hover:bg-slate-100 rounded-lg transition">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* 資産構成カード */}
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-teal-500" />
                資産構成
              </h2>
              <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                {['前日', '週間', '月間'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      period === p
                        ? 'bg-teal-500 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-slate-500">総資産</span>
                  <span className="text-lg font-bold text-slate-800">{formatCurrency(totalAssets)}</span>
                </div>
              </div>

              {/* Asset List */}
              <div className="space-y-2">
                {pieData.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <Icon className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700">{item.name}</span>
                        <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{item.percentage}%</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-800">{formatCurrency(item.value)}</div>
                        <div className={`text-xs flex items-center justify-end gap-0.5 ${item.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {item.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {formatChange(item.change)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <div className="pt-3 mt-3 border-t-2 border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">総資産</span>
                  <div className="text-right">
                    <div className="text-xl font-bold text-slate-900">{formatCurrency(totalAssets)}</div>
                    <div className={`text-sm font-semibold flex items-center justify-end gap-1 ${totalChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {totalChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {formatChange(totalChange)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 今月の収支 */}
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-5">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-teal-500" />
              今月の収支
            </h2>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">収入</span>
                <span className="text-lg font-semibold text-emerald-600">{formatCurrency(summary?.income)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">支出</span>
                <span className="text-lg font-semibold text-red-500">{formatCurrency(summary?.expense)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-800">収支</span>
                <span className={`text-xl font-bold ${summary?.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatChange(summary?.balance)}
                </span>
              </div>
            </div>

            <h3 className="text-sm font-medium text-slate-500 mb-2">最近の取引</h3>
            <div className="space-y-2">
              {recentTransactions?.slice(0, 5).map((tx, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs w-10">{tx.date}</span>
                    <span className="text-slate-700">{tx.content}</span>
                  </div>
                  <span className={tx.amount >= 0 ? 'text-emerald-600' : 'text-slate-800'}>
                    {formatCurrency(Math.abs(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 資産推移 */}
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-500" />
                資産推移
              </h2>
              <div className="flex gap-1 text-xs">
                {['1ヶ月', '3ヶ月', '6ヶ月', '1年'].map(p => (
                  <button
                    key={p}
                    onClick={() => setHistoryPeriod(p)}
                    className={`px-2 py-1 rounded ${historyPeriod === p ? 'bg-teal-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={assetHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#94A3B8' }} 
                    tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
                  />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#14B8A6" 
                    strokeWidth={2}
                    dot={{ fill: '#14B8A6', strokeWidth: 0, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-400">
        {useDemo ? '※ デモデータを表示中' : `最終更新: ${new Date(data.updatedAt).toLocaleString('ja-JP')}`}
      </footer>
    </div>
  );
}
