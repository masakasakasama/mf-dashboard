import React, { useEffect, useMemo, useState } from 'react';
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
  RefreshCw,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const FALLBACK_DATA = {
  updatedAt: '2026-08-22T00:15:00+09:00',
  title: '収支ダッシュボード 最新版',
  subtitle: '8/25給与反映、財布2万円は除外、JALカードSuicaゴールドはView枠として二重計上なし',
  start: { date: '5/14', label: '起点残高', balance: 1572156, note: '今日時点の残高' },
  events: [
    { date: '5/25', label: '5月給与', amount: 650000, type: 'income', note: '手取り、出張費込み' },
    { date: '5/26', label: '三井住友カード 5月分', amount: -797266, type: 'card', note: 'ポイント還元後' },
    { date: '5/26', label: 'Amazon旧クラシック', amount: -112256, type: 'card', note: 'Galaxy 2回目完済' },
    { date: '5月末', label: '固定費', amount: -150000, type: 'fixed', note: '家賃、光熱費、通信など' },
    { date: '6/25', label: '6月給与', amount: 600000, type: 'income', note: '手取り想定' },
    { date: '6/26', label: '三井住友カード 6月分', amount: -580147, type: 'card', note: '最新Vpass反映' },
    { date: '6月末', label: '固定費', amount: -150000, type: 'fixed', note: '6月分' },
    { date: '7/7', label: 'JALカードSuicaゴールド', amount: -45984, type: 'card', note: 'Viewカード枠、二重計上なし' },
    { date: '7/15', label: '賞与', amount: 570000, type: 'income', note: '手取り想定' },
    { date: '7/25', label: '7月給与', amount: 549300, type: 'income', note: '手取り想定' },
    { date: '7/27', label: '7月固定費', amount: -150000, type: 'fixed', note: '7月分' },
    { date: '7/27', label: '三井住友カード 7月分', amount: -300000, type: 'card', note: '仮置き' },
    { date: '7月中', label: '婚約指輪', amount: -250000, type: 'special', note: '別建て支出' },
    { date: '8/25', label: '8月給与', amount: 658354, type: 'income', note: '支給明細の差引支給額' },
  ],
  flags: [
    '財布2万円は今回の計算から除外',
    'JALカードSuicaゴールドはViewカード枠として扱い、Viewカード1万円は削除',
    '6/26三井住友カードは580,147円で反映',
    '8/25給与は658,354円で反映',
  ],
};

const formatCurrency = (value) => new Intl.NumberFormat('ja-JP').format(value) + '円';
const formatSigned = (value) => `${value >= 0 ? '+' : ''}${formatCurrency(value)}`;
const formatShort = (value) => `${(value / 10000).toFixed(1)}万`;

const typeMeta = {
  income: { label: '収入', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', Icon: Banknote },
  card: { label: 'カード', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', Icon: CreditCard },
  fixed: { label: '固定費', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', Icon: Home },
  special: { label: '特別支出', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', Icon: Gift },
  base: { label: '起点', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', Icon: Wallet },
};

function buildTimeline(data) {
  const first = {
    date: data.start.date,
    label: data.start.label,
    amount: 0,
    balance: data.start.balance,
    type: 'base',
    note: data.start.note,
  };
  return data.events.reduce((items, event) => {
    const previous = items[items.length - 1].balance;
    items.push({ ...event, balance: previous + event.amount });
    return items;
  }, [first]);
}

function SummaryCard({ title, value, sub, tone = 'blue', Icon }) {
  const tones = {
    blue: 'from-blue-50 to-sky-50 border-blue-200 text-blue-900',
    amber: 'from-amber-50 to-orange-50 border-amber-200 text-amber-900',
    green: 'from-emerald-50 to-green-50 border-emerald-200 text-emerald-900',
    purple: 'from-violet-50 to-purple-50 border-violet-200 text-violet-900',
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${tones[tone]} p-4 shadow-sm`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold opacity-80">{title}</div>
        <Icon className="h-6 w-6 opacity-80" />
      </div>
      <div className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{value}</div>
      <div className="mt-1 text-xs font-medium opacity-75">{sub}</div>
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <div className="text-sm font-bold text-slate-900">{item.date} {item.label}</div>
      <div className={item.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatSigned(item.amount)}</div>
      <div className="text-sm text-slate-600">残高 {formatCurrency(item.balance)}</div>
      {item.note && <div className="mt-1 text-xs text-slate-400">{item.note}</div>}
    </div>
  );
}

export default function MFDashboard() {
  const [cashflow, setCashflow] = useState(FALLBACK_DATA);
  const [loadedFromJson, setLoadedFromJson] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}cashflow.json`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('cashflow.json not found');
        return res.json();
      })
      .then((json) => {
        setCashflow(json);
        setLoadedFromJson(true);
      })
      .catch(() => {
        setCashflow(FALLBACK_DATA);
        setLoadedFromJson(false);
      });
  }, []);

  const timeline = useMemo(() => buildTimeline(cashflow), [cashflow]);
  const startBalance = cashflow.start.balance;
  const minPoint = useMemo(() => timeline.reduce((min, item) => (item.balance < min.balance ? item : min), timeline[0]), [timeline]);
  const finalPoint = timeline[timeline.length - 1];
  const incomeTotal = cashflow.events.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
  const expenseTotal = Math.abs(cashflow.events.filter((e) => e.amount < 0).reduce((sum, e) => sum + e.amount, 0));
  const netChange = finalPoint.balance - startBalance;

  const monthRows = [
    { month: '5月', income: 650000, expense: 797266 + 112256 + 150000 },
    { month: '6月', income: 600000, expense: 580147 + 150000 },
    { month: '7月', income: 570000 + 549300, expense: 45984 + 150000 + 300000 + 250000 },
    { month: '8月', income: 658354, expense: 0 },
  ].map((m) => ({ ...m, net: m.income - m.expense }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-900">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-5 sm:py-8">
        <header className="overflow-hidden rounded-[28px] border border-blue-900/70 bg-gradient-to-br from-blue-950 via-slate-950 to-blue-900 p-5 text-white shadow-2xl sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-blue-100 ring-1 ring-white/20">
                <RefreshCw className="h-3.5 w-3.5" />
                {loadedFromJson ? 'cashflow.json反映中' : 'fallback値で表示中'}
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{cashflow.title}</h1>
              <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-blue-100 sm:text-base">{cashflow.subtitle}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-right ring-1 ring-white/20">
              <div className="text-sm font-bold text-blue-100">8/25給与反映後</div>
              <div className="mt-1 text-3xl font-black text-white">{formatCurrency(finalPoint.balance)}</div>
              <div className="mt-1 text-xs text-blue-100">純増減 {formatSigned(netChange)}</div>
            </div>
          </div>
        </header>

        <main className="mt-4 space-y-4 sm:mt-6 sm:space-y-6">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="起点残高" value={formatCurrency(startBalance)} sub={`${cashflow.start.date} ${cashflow.start.note}`} tone="blue" Icon={Wallet} />
            <SummaryCard title="最低残高" value={formatCurrency(minPoint.balance)} sub={`${minPoint.date} ${minPoint.label}後`} tone="amber" Icon={AlertTriangle} />
            <SummaryCard title="最低日" value={minPoint.date} sub="資金繰り上の底" tone="purple" Icon={CalendarDays} />
            <SummaryCard title="最終残高" value={formatCurrency(finalPoint.balance)} sub={`${finalPoint.date} ${finalPoint.label}反映後`} tone="green" Icon={TrendingUp} />
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-xl sm:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-black text-slate-900">
                  <TrendingUp className="h-6 w-6 text-blue-700" />
                  残高推移
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">最低は {minPoint.date} の {formatCurrency(minPoint.balance)}</p>
              </div>
              <div className="rounded-full bg-amber-50 px-4 py-2 text-sm font-black text-amber-800 ring-1 ring-amber-200">
                安全ライン 80万円は維持
              </div>
            </div>

            <div className="h-[320px] w-full sm:h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 18, right: 22, left: 8, bottom: 10 }}>
                  <defs>
                    <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#d8e0ee" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fontWeight: 700 }} interval={0} minTickGap={4} />
                  <YAxis tickFormatter={formatShort} tick={{ fontSize: 12, fontWeight: 700 }} width={62} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={800000} stroke="#f59e0b" strokeDasharray="7 6" label={{ value: '安全ライン80万', fill: '#b45309', fontSize: 12, fontWeight: 800 }} />
                  <Area type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={4} fill="url(#balanceFill)" dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="balance" stroke="#1d4ed8" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
            <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-xl sm:p-6">
              <h2 className="mb-4 text-2xl font-black text-slate-900">詳細</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-separate border-spacing-0 overflow-hidden rounded-2xl text-sm">
                  <thead>
                    <tr className="bg-blue-800 text-white">
                      <th className="px-4 py-3 text-left">日付</th>
                      <th className="px-4 py-3 text-left">項目</th>
                      <th className="px-4 py-3 text-right">増減</th>
                      <th className="px-4 py-3 text-right">残高</th>
                      <th className="px-4 py-3 text-left">メモ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.map((item, index) => {
                      const meta = typeMeta[item.type] || typeMeta.base;
                      const Icon = meta.Icon;
                      return (
                        <tr key={`${item.date}-${item.label}-${index}`} className={index === timeline.length - 1 ? 'bg-emerald-50' : 'odd:bg-white even:bg-slate-50'}>
                          <td className="border-b border-slate-200 px-4 py-3 font-bold text-slate-700">{item.date}</td>
                          <td className="border-b border-slate-200 px-4 py-3">
                            <div className="flex items-center gap-2 font-bold text-slate-900">
                              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${meta.bg} ${meta.color}`}><Icon className="h-4 w-4" /></span>
                              {item.label}
                            </div>
                          </td>
                          <td className={`border-b border-slate-200 px-4 py-3 text-right font-black ${item.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {item.amount === 0 ? '－' : formatSigned(item.amount)}
                          </td>
                          <td className="border-b border-slate-200 px-4 py-3 text-right font-black text-slate-900">{formatCurrency(item.balance)}</td>
                          <td className="border-b border-slate-200 px-4 py-3 text-slate-500">{item.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-xl">
                <h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><PiggyBank className="h-5 w-5 text-emerald-700" />概略</h2>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">収入合計</span><span className="font-black text-emerald-700">{formatCurrency(incomeTotal)}</span></div>
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">支出合計</span><span className="font-black text-rose-700">{formatCurrency(expenseTotal)}</span></div>
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">純増減</span><span className="font-black text-blue-700">{formatSigned(netChange)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">最終残高</span><span className="font-black text-slate-900">{formatCurrency(finalPoint.balance)}</span></div>
                </div>
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-xl">
                <h2 className="mb-4 text-xl font-black text-slate-900">月ごとの純増減</h2>
                <div className="space-y-3">
                  {monthRows.map((row) => (
                    <div key={row.month}>
                      <div className="mb-1 flex justify-between text-sm font-bold"><span>{row.month}</span><span className={row.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatSigned(row.net)}</span></div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div className={row.net >= 0 ? 'h-full bg-emerald-500' : 'h-full bg-rose-500'} style={{ width: `${Math.min(Math.abs(row.net) / 700000 * 100, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[26px] border border-emerald-200 bg-emerald-50 p-5 shadow-xl">
                <h2 className="flex items-center gap-2 text-lg font-black text-emerald-900"><CheckCircle2 className="h-5 w-5" />反映ルール</h2>
                <ul className="mt-3 space-y-2 text-sm font-bold leading-6 text-emerald-900">
                  {cashflow.flags?.map((flag) => <li key={flag}>・{flag}</li>)}
                </ul>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}
