import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
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

const formatCurrency = (value) => new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(value) + '円';
const formatSigned = (value) => `${value >= 0 ? '+' : ''}${formatCurrency(value)}`;
const formatShort = (value) => `${(value / 10000).toFixed(1)}万`;

const typeMeta = {
  income: { label: '収入', color: 'text-emerald-700', bg: 'bg-emerald-50', Icon: Banknote },
  card: { label: 'カード', color: 'text-rose-700', bg: 'bg-rose-50', Icon: CreditCard },
  fixed: { label: '固定費', color: 'text-orange-700', bg: 'bg-orange-50', Icon: Home },
  special: { label: '特別支出', color: 'text-purple-700', bg: 'bg-purple-50', Icon: Gift },
  base: { label: '起点', color: 'text-blue-700', bg: 'bg-blue-50', Icon: Wallet },
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

function getMonthLabel(date) {
  const slash = String(date).match(/^(\d{1,2})\//);
  if (slash) return `${Number(slash[1])}月`;
  const jp = String(date).match(/^(\d{1,2})月/);
  if (jp) return `${Number(jp[1])}月`;
  return 'その他';
}

function buildMonthRows(events) {
  const map = new Map();

  events.forEach((event) => {
    const month = getMonthLabel(event.date);
    if (!map.has(month)) map.set(month, { month, income: 0, expense: 0 });
    const row = map.get(month);
    if (event.amount >= 0) row.income += event.amount;
    else row.expense += Math.abs(event.amount);
  });

  return [...map.values()]
    .map((row) => ({ ...row, net: row.income - row.expense }))
    .sort((a, b) => parseInt(a.month, 10) - parseInt(b.month, 10));
}

function subscriptionMonthlyJpy(sub) {
  if (Number.isFinite(sub.monthlyJpyOverride)) return sub.monthlyJpyOverride;

  const split = sub.split || 1;
  const taxMultiplier = 1 + (sub.taxRate || 0);
  let amountJpy = sub.price;

  if (sub.currency === 'USD') amountJpy = sub.price * taxMultiplier * (sub.fxRate || 1);
  if (sub.billing === 'annual') amountJpy /= 12;

  return amountJpy / split;
}

function originalSubscriptionPrice(sub) {
  const amount = sub.currency === 'USD' ? `$${sub.price}` : formatCurrency(sub.price);
  const cycle = sub.billing === 'annual' ? '年' : '月';
  return `${amount}/${cycle}`;
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
  const [cashflow, setCashflow] = useState(null);
  const [subscriptions, setSubscriptions] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}cashflow.json`, { cache: 'no-store' }).then((res) => {
        if (!res.ok) throw new Error('cashflow.json not found');
        return res.json();
      }),
      fetch(`${import.meta.env.BASE_URL}subscriptions.json`, { cache: 'no-store' }).then((res) => {
        if (!res.ok) throw new Error('subscriptions.json not found');
        return res.json();
      }),
    ])
      .then(([cashflowJson, subscriptionsJson]) => {
        setCashflow(cashflowJson);
        setSubscriptions(subscriptionsJson);
      })
      .catch((err) => setError(err.message));
  }, []);

  const timeline = useMemo(() => (cashflow ? buildTimeline(cashflow) : []), [cashflow]);
  const monthRows = useMemo(() => (cashflow ? buildMonthRows(cashflow.events) : []), [cashflow]);
  const subscriptionRows = useMemo(() => {
    if (!subscriptions) return [];
    return subscriptions.subscriptions.map((sub) => {
      const monthlyJpy = subscriptionMonthlyJpy(sub);
      return { ...sub, monthlyJpy, annualJpy: monthlyJpy * 12 };
    });
  }, [subscriptions]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-lg rounded-3xl border border-rose-800 bg-rose-950/40 p-6">
          <div className="text-xl font-black">データ読み込みエラー</div>
          <div className="mt-2 text-sm text-rose-100">{error}</div>
          <div className="mt-4 text-xs text-rose-200">cashflow.json と subscriptions.json を確認</div>
        </div>
      </div>
    );
  }

  if (!cashflow || !subscriptions) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-300" />
      </div>
    );
  }

  const startBalance = cashflow.start.balance;
  const minPoint = timeline.reduce((min, item) => (item.balance < min.balance ? item : min), timeline[0]);
  const finalPoint = timeline[timeline.length - 1];
  const incomeTotal = cashflow.events.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
  const expenseTotal = Math.abs(cashflow.events.filter((e) => e.amount < 0).reduce((sum, e) => sum + e.amount, 0));
  const netChange = finalPoint.balance - startBalance;
  const subscriptionMonthlyTotal = subscriptionRows.reduce((sum, sub) => sum + sub.monthlyJpy, 0);
  const subscriptionAnnualTotal = subscriptionRows.reduce((sum, sub) => sum + sub.annualJpy, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-900">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-5 sm:py-8">
        <header className="overflow-hidden rounded-[28px] border border-blue-900/70 bg-gradient-to-br from-blue-950 via-slate-950 to-blue-900 p-5 text-white shadow-2xl sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-blue-100 ring-1 ring-white/20">
                <RefreshCw className="h-3.5 w-3.5" />
                JSONのみで更新
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{cashflow.title}</h1>
              <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-blue-100 sm:text-base">{cashflow.subtitle}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-right ring-1 ring-white/20">
              <div className="text-sm font-bold text-blue-100">{finalPoint.date} {finalPoint.label}反映後</div>
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

          <section className="rounded-[26px] border border-violet-200 bg-white p-4 shadow-xl sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-black text-slate-900">
                  <CreditCard className="h-6 w-6 text-violet-700" />
                  {subscriptions.title}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">{subscriptions.note}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-violet-50 px-4 py-3 text-right ring-1 ring-violet-200">
                  <div className="text-xs font-bold text-violet-700">月額換算</div>
                  <div className="text-2xl font-black text-violet-950">{formatCurrency(subscriptionMonthlyTotal)}</div>
                </div>
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-right ring-1 ring-slate-200">
                  <div className="text-xs font-bold text-slate-600">年間換算</div>
                  <div className="text-2xl font-black text-slate-950">{formatCurrency(subscriptionAnnualTotal)}</div>
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] border-separate border-spacing-0 overflow-hidden rounded-2xl text-sm">
                <thead>
                  <tr className="bg-violet-800 text-white">
                    <th className="px-4 py-3 text-left">サービス</th>
                    <th className="px-4 py-3 text-left">プラン</th>
                    <th className="px-4 py-3 text-right">契約額</th>
                    <th className="px-4 py-3 text-center">負担</th>
                    <th className="px-4 py-3 text-right">月額換算</th>
                    <th className="px-4 py-3 text-right">年間換算</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptionRows.map((sub) => (
                    <tr key={sub.name} className="odd:bg-white even:bg-violet-50/40">
                      <td className="border-b border-slate-200 px-4 py-3 font-black text-slate-900">{sub.name}</td>
                      <td className="border-b border-slate-200 px-4 py-3 text-slate-600">{sub.plan}</td>
                      <td className="border-b border-slate-200 px-4 py-3 text-right font-bold text-slate-700">
                        {originalSubscriptionPrice(sub)}
                        {sub.taxRate ? <div className="text-xs font-medium text-slate-400">税 {Math.round(sub.taxRate * 100)}%</div> : null}
                      </td>
                      <td className="border-b border-slate-200 px-4 py-3 text-center font-bold text-slate-700">{sub.split > 1 ? `1/${sub.split}` : '本人'}</td>
                      <td className="border-b border-slate-200 px-4 py-3 text-right font-black text-violet-800">{formatCurrency(sub.monthlyJpy)}</td>
                      <td className="border-b border-slate-200 px-4 py-3 text-right font-black text-slate-900">{formatCurrency(sub.annualJpy)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs font-medium text-slate-500">サブスク費はここでは別集計。cashflow.json の固定費に含める場合は二重計上しないこと</div>
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
              <div className={`rounded-full px-4 py-2 text-sm font-black ring-1 ${minPoint.balance >= 800000 ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200'}`}>
                {minPoint.balance >= 800000 ? '安全ライン80万円を維持' : '安全ライン80万円を下回る'}
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
