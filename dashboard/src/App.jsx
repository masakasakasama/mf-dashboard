import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpDown,
  Bell,
  Briefcase,
  Check,
  ChevronRight,
  CreditCard,
  Eye,
  GripVertical,
  Home,
  Menu,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';

const APP_VERSION = '1.3.0';

const yen = (value) => `${new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(value)}円`;
const signedYen = (value) => `${value >= 0 ? '+' : '-'}${yen(Math.abs(value))}`;
const shortYen = (value) => `${Math.round(value / 10000)}万`;

const statusMeta = {
  active: { label: '契約中', tone: 'active' },
  review: { label: '見直し候補', tone: 'review' },
  cancelled: { label: '解約済み', tone: 'cancelled' },
};

const brandMeta = {
  Netflix: { mark: 'N', className: 'brand-netflix' },
  Spotify: { mark: '●', className: 'brand-spotify' },
  'YouTube Premium': { mark: '▶', className: 'brand-youtube' },
  'Amazon Prime': { mark: 'a', className: 'brand-amazon' },
  'ChatGPT Plus': { mark: '◎', className: 'brand-chatgpt' },
};

function buildTimeline(cashflow) {
  const seed = [{
    date: cashflow.start.date,
    label: cashflow.start.label,
    amount: 0,
    balance: cashflow.start.balance,
    type: 'base',
    note: cashflow.start.note,
  }];

  return cashflow.events.reduce((acc, event) => {
    const previous = acc[acc.length - 1].balance;
    acc.push({ ...event, balance: previous + event.amount });
    return acc;
  }, seed);
}

function subscriptionMonthlyJpy(sub) {
  if (Number.isFinite(sub.monthlyJpyOverride)) return sub.monthlyJpyOverride;
  const split = sub.split || 1;
  const tax = 1 + (sub.taxRate || 0);
  let amount = sub.price;
  if (sub.currency === 'USD') amount = sub.price * tax * (sub.fxRate || 1);
  if (sub.billing === 'annual') amount /= 12;
  return amount / split;
}

function originalPrice(sub) {
  const amount = sub.currency === 'USD' ? `$${sub.price}` : yen(sub.price);
  return `${amount}/${sub.billing === 'annual' ? '年' : '月'}`;
}

function BalanceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{item.date} {item.label}</div>
      {item.amount !== 0 && <div className={item.amount > 0 ? 'money-plus' : 'money-minus'}>{signedYen(item.amount)}</div>}
      <div className="chart-tooltip-balance">残高 {yen(item.balance)}</div>
    </div>
  );
}

function EventIcon({ type }) {
  if (type === 'income') return <Briefcase size={20} />;
  if (type === 'card') return <CreditCard size={20} />;
  return <Wallet size={20} />;
}

function SubscriptionBadge({ name }) {
  const brand = brandMeta[name] || { mark: name.slice(0, 1), className: 'brand-default' };
  return <span className={`brand-badge ${brand.className}`}>{brand.mark}</span>;
}

function SubscriptionCard({ sub, onDragStart, onStatusChange }) {
  return (
    <article className="subscription-card" draggable onDragStart={(event) => onDragStart(event, sub.name)}>
      <div className="drag-grip" title="ドラッグして状態変更"><GripVertical size={20} /></div>
      <SubscriptionBadge name={sub.name} />
      <div className="subscription-main">
        <div className="subscription-name">{sub.name}</div>
        <div className="subscription-plan">
          {sub.plan}{sub.split > 1 ? ` ・ ${sub.splitNote || `1/${sub.split}負担`}` : ''}
        </div>
      </div>
      <div className="subscription-price">
        <div>{originalPrice(sub)}</div>
        <strong>{yen(sub.monthlyJpy)}/月</strong>
      </div>
      <select
        className="status-select"
        value={sub.status}
        onChange={(e) => onStatusChange(sub.name, e.target.value)}
        aria-label={`${sub.name} の契約状態`}
      >
        <option value="active">契約中</option>
        <option value="review">見直し候補</option>
        <option value="cancelled">解約済み</option>
      </select>
    </article>
  );
}

export default function App() {
  const [cashflow, setCashflow] = useState(null);
  const [subscriptions, setSubscriptions] = useState(null);
  const [statusMap, setStatusMap] = useState({});
  const [screen, setScreen] = useState('home');
  const [showAll, setShowAll] = useState(false);
  const [updateHelp, setUpdateHelp] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}cashflow.json`, { cache: 'no-store' }).then((res) => {
        if (!res.ok) throw new Error('cashflow.json の読み込みに失敗');
        return res.json();
      }),
      fetch(`${import.meta.env.BASE_URL}subscriptions.json`, { cache: 'no-store' }).then((res) => {
        if (!res.ok) throw new Error('subscriptions.json の読み込みに失敗');
        return res.json();
      }),
    ])
      .then(([cashflowData, subscriptionData]) => {
        setCashflow(cashflowData);
        setSubscriptions(subscriptionData);
        const canonical = Object.fromEntries(subscriptionData.subscriptions.map((sub) => [sub.name, sub.status || 'active']));
        try {
          const stored = JSON.parse(localStorage.getItem('mf-dashboard-subscription-status') || '{}');
          setStatusMap({ ...canonical, ...stored });
        } catch {
          setStatusMap(canonical);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  const timeline = useMemo(() => (cashflow ? buildTimeline(cashflow) : []), [cashflow]);
  const subscriptionRows = useMemo(() => {
    if (!subscriptions) return [];
    return subscriptions.subscriptions.map((sub) => ({
      ...sub,
      status: statusMap[sub.name] || sub.status || 'active',
      monthlyJpy: subscriptionMonthlyJpy(sub),
    }));
  }, [subscriptions, statusMap]);

  if (error) {
    return (
      <div className="app-shell error-shell">
        <div className="error-card"><X size={28} /><h1>データを読み込めない</h1><p>{error}</p></div>
      </div>
    );
  }

  if (!cashflow || !subscriptions || !timeline.length) {
    return <div className="app-shell loading-shell"><RefreshCw className="spin" size={34} /></div>;
  }

  const minPoint = timeline.reduce((min, item) => (item.balance < min.balance ? item : min), timeline[0]);
  const finalPoint = timeline[timeline.length - 1];
  const fixedCost = Math.abs([...cashflow.events].reverse().find((e) => e.type === 'fixed')?.amount || 0);
  const latestSalary = [...cashflow.events].reverse().find((e) => e.type === 'income' && e.label.includes('給与'));
  const focusEvents = cashflow.events.slice(-3).reverse();
  const activeSubs = subscriptionRows.filter((sub) => sub.status !== 'cancelled');
  const monthlySubscriptions = activeSubs.reduce((sum, sub) => sum + sub.monthlyJpy, 0);
  const annualSubscriptions = monthlySubscriptions * 12;
  const reviewMonthly = subscriptionRows.filter((sub) => sub.status === 'review').reduce((sum, sub) => sum + sub.monthlyJpy, 0);
  const cancelledMonthly = subscriptionRows.filter((sub) => sub.status === 'cancelled').reduce((sum, sub) => sum + sub.monthlyJpy, 0);

  const setSubStatus = (name, status) => {
    const next = { ...statusMap, [name]: status };
    setStatusMap(next);
    localStorage.setItem('mf-dashboard-subscription-status', JSON.stringify(next));
  };

  const resetStatuses = () => {
    const canonical = Object.fromEntries(subscriptions.subscriptions.map((sub) => [sub.name, sub.status || 'active']));
    setStatusMap(canonical);
    localStorage.removeItem('mf-dashboard-subscription-status');
  };

  const startDrag = (event, name) => {
    event.dataTransfer.setData('text/plain', name);
    event.dataTransfer.effectAllowed = 'move';
  };

  const dropStatus = (event, status) => {
    event.preventDefault();
    const name = event.dataTransfer.getData('text/plain');
    if (name) setSubStatus(name, status);
  };

  return (
    <div className="app-shell">
      <div className="phone-layout">
        <header className="topbar">
          <div className="brand-lockup">
            <div className="app-icon"><Wallet size={24} /></div>
            <div className="brand-text"><span>金管理</span><small>v{APP_VERSION}</small></div>
          </div>
          <div className="top-actions"><button className="icon-button" aria-label="通知"><Bell size={22} /></button><button className="icon-button" aria-label="メニュー"><Menu size={24} /></button></div>
        </header>

        {screen === 'home' ? (
          <main className="content-stack home-screen">
            <section className="balance-hero">
              <div className="hero-copy">
                <div className="eyebrow">{finalPoint.date} 支払後見込残高 <Eye size={17} /></div>
                <div className="hero-amount">{yen(finalPoint.balance)}</div>
                <div className="hero-meta">基準 {cashflow.start.date} {yen(cashflow.start.balance)} ・ 婚約指輪は8/26カード請求に含む</div>
              </div>
              <div className="shield-art"><ShieldCheck size={66} strokeWidth={1.7} /></div>
            </section>

            <section>
              <div className="section-heading"><h2>最新イベント</h2><button className="text-link" onClick={() => setShowAll((v) => !v)}>{showAll ? '閉じる' : 'すべて見る'} <ChevronRight size={17} /></button></div>
              <div className="event-grid">
                {focusEvents.map((event) => (
                  <div className={`event-card ${event.amount > 0 ? 'positive' : ''}`} key={`${event.date}-${event.label}`}>
                    <div className="event-top"><span className="event-icon"><EventIcon type={event.type} /></span><span className="event-date">{event.date}</span></div>
                    <div className="event-label">{event.label}</div>
                    <div className={event.amount > 0 ? 'money-plus event-amount' : 'money-minus event-amount'}>{signedYen(event.amount)}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="chart-card">
              <div className="chart-title-row">
                <div><h2><TrendingUp size={21} /> 残高推移</h2><p>最低残高は {minPoint.date} の {yen(minPoint.balance)}</p></div>
                <div className="min-pill">最低 {shortYen(minPoint.balance)}</div>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ top: 18, right: 8, bottom: 2, left: -10 }}>
                    <defs><linearGradient id="balanceGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#76f7c5" stopOpacity="0.34" /><stop offset="100%" stopColor="#76f7c5" stopOpacity="0" /></linearGradient></defs>
                    <CartesianGrid vertical={false} stroke="rgba(145,170,182,.13)" />
                    <XAxis dataKey="date" tick={{ fill: '#9bb0ba', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={18} />
                    <YAxis tickFormatter={shortYen} tick={{ fill: '#728993', fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip content={<BalanceTooltip />} />
                    <ReferenceLine y={800000} stroke="#e6a92f" strokeDasharray="5 5" label={{ value: '注意 80万', fill: '#e6a92f', fontSize: 10, position: 'insideTopRight' }} />
                    <Area type="monotone" dataKey="balance" stroke="#8df6d1" strokeWidth={3} fill="url(#balanceGlow)" dot={{ fill: '#e9fff8', stroke: '#45d8a3', r: 3 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-footnote"><ShieldCheck size={16} /> 80万円の注意ラインを {yen(minPoint.balance - 800000)} 上回る見込み</div>
            </section>

            <section className="summary-grid">
              <button className="summary-card" onClick={() => setShowAll(true)}>
                <div className="summary-title"><Home size={19} /> 固定費 <ChevronRight size={18} /></div><div className="summary-kicker">月額想定</div><div className="summary-value">{yen(fixedCost)}</div><div className="summary-sub">cashflow.json反映</div>
              </button>
              <button className="summary-card salary-card" onClick={() => setShowAll(true)}>
                <div className="summary-title"><Briefcase size={19} /> 最新給与 <ChevronRight size={18} /></div><div className="summary-kicker">{latestSalary?.date || '給与'}</div><div className="summary-value">{latestSalary ? yen(latestSalary.amount) : '未設定'}</div><div className="summary-sub">差引支給額</div>
              </button>
              <button className="summary-card subscription-summary" onClick={() => setScreen('subscriptions')}>
                <div className="summary-title"><RefreshCw size={19} /> サブスク <ChevronRight size={18} /></div><div className="summary-kicker">月額合計</div><div className="summary-value">{yen(monthlySubscriptions)}</div><div className="summary-sub">{activeSubs.length}件を計上</div><div className="brand-strip">{activeSubs.slice(0, 5).map((sub) => <SubscriptionBadge key={sub.name} name={sub.name} />)}</div>
              </button>
            </section>

            {showAll && (
              <section className="timeline-panel">
                <div className="section-heading"><h2>入出金詳細（新しい順）</h2><button className="icon-button small" onClick={() => setShowAll(false)}><X size={18} /></button></div>
                <div className="timeline-list">
                  {[...timeline].reverse().map((item) => (
                    <div className="timeline-row" key={`${item.date}-${item.label}`}>
                      <div className="timeline-date">{item.date}</div>
                      <div className="timeline-body"><strong>{item.label}</strong><span>{item.note}</span></div>
                      <div className="timeline-money"><span className={item.amount > 0 ? 'money-plus' : item.amount < 0 ? 'money-minus' : ''}>{item.amount === 0 ? '基準' : signedYen(item.amount)}</span><small>{yen(item.balance)}</small></div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </main>
        ) : (
          <main className="content-stack subscription-screen">
            <section className="subscription-hero">
              <div><span>月額合計</span><strong>{yen(monthlySubscriptions)}</strong></div>
              <div><span>年間合計</span><strong>{yen(annualSubscriptions)}</strong></div>
              <div><span>見直し候補</span><strong>{yen(reviewMonthly)}</strong></div>
            </section>

            <div className="subscription-toolbar"><div><RefreshCw size={17} /> カードをドラッグして状態変更</div><button onClick={resetStatuses}><RotateCcw size={16} /> JSON初期状態</button></div>

            {Object.entries(statusMeta).map(([status, meta]) => {
              const rows = subscriptionRows.filter((sub) => sub.status === status);
              const total = rows.reduce((sum, sub) => sum + sub.monthlyJpy, 0);
              return (
                <section className={`status-column ${meta.tone}`} key={status} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropStatus(event, status)}>
                  <div className="status-header"><div><span className="status-dot" /> {meta.label}</div><span>{rows.length}件 ・ {yen(total)}/月</span></div>
                  <div className="subscription-list">{rows.length ? rows.map((sub) => <SubscriptionCard key={sub.name} sub={sub} onDragStart={startDrag} onStatusChange={setSubStatus} />) : <div className="empty-drop">ここにドロップ</div>}</div>
                </section>
              );
            })}

            <section className="savings-card"><div><span>解約済みによる削減</span><strong>{yen(cancelledMonthly)}/月</strong></div><div className="savings-year">年間 {yen(cancelledMonthly * 12)}</div></section>
          </main>
        )}

        <div className="app-version">金管理 Web v{APP_VERSION} ・ updated {cashflow.updatedAt?.slice(0, 10) || ''}</div>

        <nav className="bottom-nav compact-nav">
          <button className={screen === 'home' && !showAll ? 'active' : ''} onClick={() => { setScreen('home'); setShowAll(false); }}><Home size={21} /><span>ホーム</span></button>
          <button className={screen === 'home' && showAll ? 'active' : ''} onClick={() => { setScreen('home'); setShowAll(true); }}><ArrowUpDown size={21} /><span>入出金</span></button>
          <button className="nav-plus" onClick={() => setUpdateHelp(true)}><Plus size={26} /></button>
          <button className={screen === 'subscriptions' ? 'active' : ''} onClick={() => setScreen('subscriptions')}><RefreshCw size={21} /><span>サブスク</span></button>
        </nav>
      </div>

      {updateHelp && (
        <div className="modal-backdrop" onClick={() => setUpdateHelp(false)}>
          <div className="update-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setUpdateHelp(false)}><X size={20} /></button><div className="modal-icon"><Check size={24} /></div><h2>データ更新</h2><p>ChatGPTで「9月給与を61万円にして」「Netflixを解約済みにして」のように送れば、JSON更新後にサイトへ自動反映する構成</p>
          </div>
        </div>
      )}
    </div>
  );
}
