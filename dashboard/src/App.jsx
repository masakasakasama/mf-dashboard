import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Gift,
  Home,
  PiggyBank,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const formatCurrency = (value) => new Intl.NumberFormat('ja-JP').format(value) + '円';
const formatShort = (value) => `${(value / 10000).toFixed(1)}万`;

const START_BALANCE = 1572156;

const events = [
  { date: '5/25', label: '5月給与', amount: 650000, type: 'income', icon: 'salary', note: '手取り、出張費込み' },
  { date: '5/26', label: '三井住友カード 5月分', amount: -797266, type: 'card', icon: 'card', note: 'ポイント還元後' },
  { date: '5/26', label: 'Amazon旧クラシック', amount: -112256, type: 'card', icon: 'amazon', note: 'Galaxy 2回目完済' },
  { date: '5月末', label: '固定費', amount: -150000, type: 'fixed', icon: 'home', note: '家賃、光熱費、通信など' },
  { date: '6/25', label: '6月給与', amount: 600000, type: 'income', icon: 'salary', note: '手取り想定' },
  { date: '6/26', label: '三井住友カード 6月分', amount: -580147, type: 'card', icon: 'card', note: '最新Vpass反映' },
  { date: '6月末', label: '固定費', amount: -150000, type: 'fixed', icon: 'home', note: '6月分' },
  { date: '7/7', label: 'JALカードSuicaゴールド', amount: -45984, type: 'card', icon: 'view', note: 'Viewカード枠、二重計上なし' },
  { date: '7/15', label: '賞与', amount: 570000, type: 'income', icon: 'gift', note: '手取り想定' },
  { date: '7/25', label: '7月給与', amount: 549300, type: 'income', icon: 'salary', note: '手取り想定' },
  { date: '7/27', label: '7月固定費', amount: -150000, type: 'fixed', icon: 'home', note: '7月分' },
  { date: '7/27', label: '三井住友カード 7月分', amount: -300000, type: 'card', icon: 'card', note: '仮置き' },
  { date: '7月中', label: '婚約指輪', amount: -250000, type: 'special', icon: 'ring', note: '別建て支出' },
  { date: '8/25', label: '8月給与', amount: 658354, type: 'income', icon: 'salary', note: '支給明細の差引支給額' },
];

const timeline = events.reduce(
  (acc, event) => {
    const previous = acc[acc.length - 1].balance;
    acc.push({ ...event, balance: previous + event.amount });
    return acc;
  },
  [{ date: '5/14', label: '起点残高', amount: 0, balance: START_BALANCE, type: 'base', icon: 'wallet', note: '今日時点の残高' }]
);

const minPoint = timeline.reduce((min, item) => (item.balance < min.balance ? item : min), timeline[0]);
const finalPoint = timeline[timeline.length - 1];
const incomeTotal = events.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
const expenseTotal = Math.abs(events.filter((e) => e.amount < 0).reduce((sum, e) => sum + e.amount, 0));
const netChange = finalPoint.balance - START_BALANCE;

const monthlySummary = [
  {
    month: '5月',
    income: 650000,
    expense: 797266 + 112256 + 150000,
  },
  {
    month: '6月',
    income: 600000,
    expense: 580147 + 150000,
  },
  {
    month: '7月',
    income: 570000 + 549300,
    expense: 45984 + 150000 + 300000 + 250000,
  },
  {
    month: '8月',
    income: 658354,
    expense: 0,
  },
].map((m) => ({ ...m, net: m.income - m.expense }));

const typeStyles = {
  income: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  card: 'bg-red-50 text-red-700 border-red-200',
  fixed: 'bg-orange-50 text-orange-700 border-orange-200',
  special: 'bg-purple-50 text-purple-700 border-purple-200',
  base: 'bg-blue-50 text-blue-700 border-blue-200',
};

const iconMap = {
  salary: Banknote,
  card: CreditCard,
  home: Home,
  gift: Gift,
  wallet: Wallet,
  view: CreditCard,
  amazon: CreditCard,
  ring: Gift,
};

function StatCard({ title, value, note, tone, icon: Icon }) {
  const toneClass = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    yellow: 'from-amber-400 to-orange-500',
    red: 'from-rose-500 to-red-600',
  }[tone];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${toneClass} text-white shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
        <span className="text-xs font-semibold text-slate-400">最新前提</span>
      </div>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{note}</p>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
      <p className="text-sm font-bold text-slate-800">{label}、{item.label}</p>
      <p className="mt-1 text-sm text-slate-500">残高 {formatCurrency(item.balance)}</p>
      {item.amount !== 0 && (
        <p className={item.amount > 0 ? 'text-emerald-600' : 'text-red-600'}>
          増減 {item.amount > 0 ? '+' : ''}{formatCurrency(item.amount)}
        </p>
      )}
    </div>
  );
}

export default function MFDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
        * { font-family: 'Noto Sans JP', sans-serif; }
      `}</style>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 shadow-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">収支ダッシュボード</h1>
              <p className="text-xs text-slate-300">8/25給与 658,354円 反映版</p>
            </div>
          </div>
          <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
            更新日 2026/08/21
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="rounded-[2rem] border border-white/10 bg-white p-5 shadow-2xl shadow-slate-950/30">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard title="起点残高" value={formatCurrency(START_BALANCE)} note="5/14時点" tone="blue" icon={Wallet} />
            <StatCard title="最低残高" value={formatCurrency(minPoint.balance)} note={`${minPoint.date}、${minPoint.label}後`} tone="yellow" icon={AlertTriangle} />
            <StatCard title="8/25給与後" value={formatCurrency(finalPoint.balance)} note="差引支給額 658,354円を反映" tone="green" icon={TrendingUp} />
            <StatCard title="期間純増減" value={(netChange >= 0 ? '+' : '') + formatCurrency(netChange)} note={`収入 ${formatCurrency(incomeTotal)}、支出 ${formatCurrency(expenseTotal)}`} tone="green" icon={PiggyBank} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.45fr_0.55fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white p-5 shadow-2xl shadow-slate-950/30">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-900">残高推移</h2>
                <p className="mt-1 text-sm text-slate-500">
                  ViewカードはJALカードSuicaゴールドとして一本化。財布2万円は除外済み。
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                最低は {minPoint.date} の {formatCurrency(minPoint.balance)}
              </div>
            </div>

            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} interval={0} angle={-20} height={45} />
                  <YAxis tickFormatter={formatShort} tick={{ fontSize: 12, fill: '#64748b' }} width={62} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={1000000} stroke="#94a3b8" strokeDasharray="6 6" label={{ value: '100万円', fill: '#64748b', fontSize: 12 }} />
                  <ReferenceLine y={minPoint.balance} stroke="#f59e0b" strokeDasharray="6 6" />
                  <Area type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={4} fill="url(#balanceGradient)" dot={{ r: 4, strokeWidth: 2, fill: '#ffffff', stroke: '#2563eb' }} activeDot={{ r: 7 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[2rem] border border-white/10 bg-white p-5 shadow-2xl shadow-slate-950/30">
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                要点
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li className="rounded-2xl bg-slate-50 p-3">6/26 三井住友カードは <b className="text-red-600">580,147円</b></li>
                <li className="rounded-2xl bg-slate-50 p-3">JALカードSuicaゴールドはView枠として <b className="text-red-600">45,984円</b></li>
                <li className="rounded-2xl bg-slate-50 p-3">8/25給与は支給明細どおり <b className="text-emerald-600">658,354円</b></li>
                <li className="rounded-2xl bg-slate-50 p-3">7月末の指輪 25万円も残したまま計算</li>
              </ul>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white p-5 shadow-2xl shadow-slate-950/30">
              <h2 className="text-xl font-black text-slate-900">月別純増減</h2>
              <div className="mt-4 space-y-3">
                {monthlySummary.map((m) => (
                  <div key={m.month} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">{m.month}</span>
                      <span className={m.net >= 0 ? 'font-black text-emerald-600' : 'font-black text-red-600'}>
                        {m.net >= 0 ? '+' : ''}{formatCurrency(m.net)}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <span>収入 {formatCurrency(m.income)}</span>
                      <span>支出 {formatCurrency(m.expense)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white p-5 shadow-2xl shadow-slate-950/30">
          <h2 className="mb-4 text-2xl font-black text-slate-900">詳細、時系列の全計算</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                  <th className="px-3 py-3 font-bold">日付</th>
                  <th className="px-3 py-3 font-bold">項目</th>
                  <th className="px-3 py-3 text-right font-bold">増減</th>
                  <th className="px-3 py-3 text-right font-bold">残高</th>
                  <th className="px-3 py-3 font-bold">メモ</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((row) => {
                  const Icon = iconMap[row.icon] || Wallet;
                  return (
                    <tr key={`${row.date}-${row.label}`} className="border-b border-slate-100 last:border-0">
                      <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-700">{row.date}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border ${typeStyles[row.type] || typeStyles.base}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="font-semibold text-slate-800">{row.label}</span>
                        </div>
                      </td>
                      <td className={row.amount >= 0 ? 'px-3 py-3 text-right font-black text-emerald-600' : 'px-3 py-3 text-right font-black text-red-600'}>
                        {row.amount === 0 ? '－' : `${row.amount > 0 ? '+' : ''}${formatCurrency(row.amount)}`}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-black text-slate-900">{formatCurrency(row.balance)}</td>
                      <td className="px-3 py-3 text-slate-500">{row.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
