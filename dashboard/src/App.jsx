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
  Briefcase,
  CreditCard,
  Eye,
  GripVertical,
  Home,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import packageMeta from '../package.json';
import { loadDashboardData } from './dataSource.js';
import { buildCashflowModel } from './financeModel.js';

const APP_VERSION = packageMeta.version;
const STATUS_STORAGE_KEY = 'mf-dashboard-subscription-status';
const CUSTOM_SUB_STORAGE_KEY = 'mf-dashboard-custom-subscriptions';

const yen = (value) => `${new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(value)}円`;
const signedYen = (value) => `${value >= 0 ? '+' : '-'}${yen(Math.abs(value))}`;
const shortYen = (value) => `${Math.round(value / 10000)}万`;
const fullDate = (isoDate) => isoDate ? isoDate.replaceAll('-', '/') : '';

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

const emptySubscriptionForm = {
  name: '',
  plan: '',
  billing: 'monthly',
  price: '',
  currency: 'JPY',
  split: '1',
  status: 'active',
  fxRate: '160',
};

function subscriptionMonthlyJpy(sub) {
  if (Number.isFinite(sub.monthlyJpyOverride)) return sub.monthlyJpyOverride;
  const split = Number(sub.split) || 1;
  const tax = 1 + (Number(sub.taxRate) || 0);
  let amount = Number(sub.price) || 0;
  if (sub.currency === 'USD') amount = amount * tax * (Number(sub.fxRate) || 1);
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
  if (type === 'income') return <Briefcase size={19} />;
  if (type === 'card') return <CreditCard size={19} />;
  return <Wallet size={19} />;
}

function SubscriptionBadge({ name }) {
  const brand = brandMeta[name] || { mark: name.slice(0, 1).toUpperCase(), className: 'brand-default' };
  return <span className={`brand-badge ${brand.className}`}>{brand.mark}</span>;
}

function FlowRow({ item, showState = true }) {
  const stateLabel = item.forecast ? '予測' : '確定';
  return (
    <div className={`flow-row ${item.forecast ? 'forecast-row' : 'confirmed-row'}`}>
      <div className="flow-date"><strong>{item.date}</strong><span>{item.isoDate?.slice(0, 4)}</span></div>
      <div className={`flow-icon ${item.amount > 0 ? 'income-icon' : 'expense-icon'}`}><EventIcon type={item.type} /></div>
      <div className="flow-main">
        <div className="flow-title-line">
          <strong>{item.label}</strong>
          {showState && <span className={`flow-badge ${item.forecast ? 'forecast' : 'confirmed'}`}>{stateLabel}</span>}
        </div>
        <span>{item.note}</span>
      </div>
      <div className="flow-money">
        <strong className={item.amount > 0 ? 'money-plus' : 'money-minus'}>{signedYen(item.amount)}</strong>
        <span>反映後 {yen(item.balance)}</span>
      </div>
    </div>
  );
}

function SubscriptionCard({ sub, onDragStart, onStatusChange, onDelete }) {
  return (
    <article className="subscription-card" draggable onDragStart={(event) => onDragStart(event, sub.name)}>
      <div className="drag-grip" title="ドラッグして状態変更"><GripVertical size={20} /></div>
      <SubscriptionBadge name={sub.name} />
      <div className="subscription-main">
        <div className="subscription-name">{sub.name}</div>
        <div className="subscription-plan">{sub.plan || 'プラン未設定'}{sub.split > 1 ? ` ・ ${sub.splitNote || `1/${sub.split}負担`}` : ''}</div>
      </div>
      <div className="subscription-price">
        <div>{originalPrice(sub)}</div>
        <strong>{yen(sub.monthlyJpy)}/月</strong>
      </div>
      <select className="status-select" value={sub.status} onChange={(event) => onStatusChange(sub.name, event.target.value)} aria-label={`${sub.name} の契約状態`}>
        <option value="active">契約中</option>
        <option value="review">見直し候補</option>
        <option value="cancelled">解約済み</option>
      </select>
      {sub.custom && <button className="delete-sub-button" onClick={() => onDelete(sub.name)} aria-label={`${sub.name} を削除`}><X size={15} /></button>}
    </article>
  );
}

export default function App() {
  const [cashflow, setCashflow] = useState(null);
  const [subscriptions, setSubscriptions] = useState(null);
  const [customSubscriptions, setCustomSubscriptions] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [screen, setScreen] = useState('home');
  const [showAll, setShowAll] = useState(false);
  const [showAddSubscription, setShowAddSubscription] = useState(false);
  const [subscriptionForm, setSubscriptionForm] = useState(emptySubscriptionForm);
  const [formError, setFormError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let storedCustom = [];
    try {
      storedCustom = JSON.parse(localStorage.getItem(CUSTOM_SUB_STORAGE_KEY) || '[]');
      if (!Array.isArray(storedCustom)) storedCustom = [];
    } catch {
      storedCustom = [];
    }

    loadDashboardData()
      .then(([cashflowData, subscriptionData]) => {
        setCashflow(cashflowData);
        setSubscriptions(subscriptionData);
        setCustomSubscriptions(storedCustom);
        const allSubscriptions = [...subscriptionData.subscriptions, ...storedCustom];
        const canonical = Object.fromEntries(allSubscriptions.map((sub) => [sub.name, sub.status || 'active']));
        try {
          const stored = JSON.parse(localStorage.getItem(STATUS_STORAGE_KEY) || '{}');
          setStatusMap({ ...canonical, ...stored });
        } catch {
          setStatusMap(canonical);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  const cashflowModelResult = useMemo(() => {
    if (!cashflow) return { model: null, modelError: '' };
    try {
      return { model: buildCashflowModel(cashflow), modelError: '' };
    } catch (err) {
      return { model: null, modelError: err.message };
    }
  }, [cashflow]);

  const subscriptionRows = useMemo(() => {
    if (!subscriptions) return [];
    return [...subscriptions.subscriptions, ...customSubscriptions].map((sub) => ({
      ...sub,
      status: statusMap[sub.name] || sub.status || 'active',
      monthlyJpy: subscriptionMonthlyJpy(sub),
    }));
  }, [subscriptions, customSubscriptions, statusMap]);

  const visibleError = error || cashflowModelResult.modelError;
  if (visibleError) {
    return <div className="app-shell error-shell"><div className="error-card"><X size={28} /><h1>データを読み込めない</h1><p>{visibleError}</p></div></div>;
  }

  if (!cashflow || !subscriptions || !cashflowModelResult.model) {
    return <div className="app-shell loading-shell"><RefreshCw className="spin" size={34} /></div>;
  }

  const {
    timeline,
    baseActual,
    todayIso,
    todayLabel,
    todayPoint,
    upcomingEvents,
    projected,
    minimum,
    nextSalary,
    nextFixedCost,
    projectionLabel,
    historyBoundaryLabel,
  } = cashflowModelResult.model;

  const activeSubs = subscriptionRows.filter((sub) => sub.status !== 'cancelled');
  const monthlySubscriptions = activeSubs.reduce((sum, sub) => sum + sub.monthlyJpy, 0);
  const annualSubscriptions = monthlySubscriptions * 12;
  const reviewMonthly = subscriptionRows.filter((sub) => sub.status === 'review').reduce((sum, sub) => sum + sub.monthlyJpy, 0);
  const cancelledMonthly = subscriptionRows.filter((sub) => sub.status === 'cancelled').reduce((sum, sub) => sum + sub.monthlyJpy, 0);
  const projectedDelta = projected.balance - todayPoint.balance;

  const setSubStatus = (name, status) => {
    const next = { ...statusMap, [name]: status };
    setStatusMap(next);
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(next));
  };

  const resetStatuses = () => {
    const allSubscriptions = [...subscriptions.subscriptions, ...customSubscriptions];
    const canonical = Object.fromEntries(allSubscriptions.map((sub) => [sub.name, sub.status || 'active']));
    setStatusMap(canonical);
    localStorage.removeItem(STATUS_STORAGE_KEY);
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

  const openAddSubscription = () => {
    const defaultFxRate = subscriptions.subscriptions.find((sub) => sub.currency === 'USD')?.fxRate || 160;
    setSubscriptionForm({ ...emptySubscriptionForm, fxRate: String(defaultFxRate) });
    setFormError('');
    setShowAddSubscription(true);
  };

  const addSubscription = (event) => {
    event.preventDefault();
    const name = subscriptionForm.name.trim();
    const plan = subscriptionForm.plan.trim();
    const price = Number(subscriptionForm.price);
    const split = Number(subscriptionForm.split);
    const existingNames = new Set(subscriptionRows.map((sub) => sub.name.toLowerCase()));

    if (!name) return setFormError('サービス名を入力して');
    if (existingNames.has(name.toLowerCase())) return setFormError('同じサービス名がすでにある');
    if (!Number.isFinite(price) || price <= 0) return setFormError('金額を正しく入力して');
    if (!Number.isFinite(split) || split < 1) return setFormError('負担人数は1以上にして');

    const newSubscription = {
      name,
      plan,
      billing: subscriptionForm.billing,
      price,
      currency: subscriptionForm.currency,
      split,
      status: subscriptionForm.status,
      monthlyJpyOverride: null,
      custom: true,
      ...(subscriptionForm.currency === 'USD' ? { taxRate: 0.1, fxRate: Number(subscriptionForm.fxRate) || 160 } : {}),
    };

    const nextCustom = [...customSubscriptions, newSubscription];
    setCustomSubscriptions(nextCustom);
    localStorage.setItem(CUSTOM_SUB_STORAGE_KEY, JSON.stringify(nextCustom));
    setStatusMap((currentMap) => ({ ...currentMap, [name]: newSubscription.status }));
    setShowAddSubscription(false);
  };

  const deleteCustomSubscription = (name) => {
    const nextCustom = customSubscriptions.filter((sub) => sub.name !== name);
    setCustomSubscriptions(nextCustom);
    localStorage.setItem(CUSTOM_SUB_STORAGE_KEY, JSON.stringify(nextCustom));
    const nextStatus = { ...statusMap };
    delete nextStatus[name];
    setStatusMap(nextStatus);
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(nextStatus));
  };

  return (
    <div className="app-shell">
      <div className="phone-layout">
        <header className="topbar simple-topbar">
          <div className="brand-lockup"><div className="app-icon"><Wallet size={23} /></div><span>金管理</span></div>
          <div className="today-chip"><span>今日</span><strong>{fullDate(todayIso)}</strong></div>
        </header>

        {screen === 'home' ? (
          <main className="content-stack home-screen">
            <section className="balance-hero forecast-hero">
              <div className="hero-copy">
                <div className="eyebrow"><TrendingUp size={17} /> 残高見込み</div>
                <div className="hero-amount">{yen(projected.balance)}</div>
                <div className="hero-meta">{projectionLabel} ・ 今日から <span className={projectedDelta >= 0 ? 'money-plus' : 'money-minus'}>{signedYen(projectedDelta)}</span></div>
              </div>
              <div className="today-forecast-block">
                <span>今日 {todayLabel}</span>
                <strong>{yen(todayPoint.balance)}</strong>
                <small>今日時点の見込み</small>
              </div>
            </section>

            <section className="snapshot-grid">
              <article className="snapshot-card">
                <span>基準実残高</span>
                <strong>{yen(baseActual.balance)}</strong>
                <small>{baseActual.date} に銀行アプリで確認</small>
              </article>
              <article className="snapshot-card accent-card">
                <span>今日時点見込み</span>
                <strong>{yen(todayPoint.balance)}</strong>
                <small>{fullDate(todayIso)} 時点</small>
              </article>
              <article className="snapshot-card warning-card">
                <span>今後の最低残高</span>
                <strong>{yen(minimum.balance)}</strong>
                <small>{minimum.date} 時点</small>
              </article>
            </section>

            <section>
              <div className="section-heading flow-section-heading">
                <div><h2>今後の入出金</h2><p>今日 {todayLabel} より後の予定だけ表示</p></div>
                <button className="text-link" onClick={() => setShowAll((value) => !value)}>{showAll ? '閉じる' : '全履歴'} <ArrowUpDown size={16} /></button>
              </div>
              <div className="flow-panel">
                {upcomingEvents.length ? upcomingEvents.map((item) => <FlowRow key={`${item.isoDate}-${item.label}`} item={item} />) : <div className="empty-flow">今後の予定は登録されていない</div>}
              </div>
            </section>

            {showAll && (
              <section className="timeline-panel expanded-history">
                <div className="section-heading"><div><h2>基準日からの全履歴</h2><p>{historyBoundaryLabel}</p></div><button className="icon-button small" onClick={() => setShowAll(false)} aria-label="閉じる"><X size={18} /></button></div>
                <div className="flow-panel compact-flow-panel">
                  {timeline.slice(1).map((item) => <FlowRow key={`history-${item.isoDate}-${item.label}`} item={item} />)}
                </div>
              </section>
            )}

            <section className="chart-card">
              <div className="chart-title-row">
                <div><h2><TrendingUp size={20} /> 残高推移</h2><p>基準実残高から12月末までの見込み</p></div>
                <div className="min-pill">最低 {shortYen(minimum.balance)}</div>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ top: 18, right: 8, bottom: 2, left: -10 }}>
                    <defs><linearGradient id="balanceGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6de4b6" stopOpacity="0.3" /><stop offset="100%" stopColor="#6de4b6" stopOpacity="0" /></linearGradient></defs>
                    <CartesianGrid vertical={false} stroke="rgba(145,170,182,.12)" />
                    <XAxis dataKey="date" tick={{ fill: '#91a2aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={shortYen} tick={{ fill: '#71858e', fontSize: 10 }} axisLine={false} tickLine={false} width={48} domain={['dataMin - 100000', 'dataMax + 100000']} />
                    <Tooltip content={<BalanceTooltip />} />
                    <ReferenceLine y={800000} stroke="#dfa83b" strokeDasharray="5 5" label={{ value: '注意 80万', fill: '#dfa83b', fontSize: 10, position: 'insideTopRight' }} />
                    <Area type="monotone" dataKey="balance" stroke="#72e6ba" strokeWidth={3} fill="url(#balanceGlow)" dot={{ fill: '#ecfff8', stroke: '#3fc999', r: 4 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-footnote"><ShieldCheck size={16} /> 実残高と予測を分離。過去を「今後」には表示しない</div>
            </section>

            <section className="summary-grid refactored-summary useful-summary">
              <div className="summary-card salary-card">
                <div className="summary-title"><Briefcase size={18} /> 次回給与</div>
                <div className="summary-kicker">{nextSalary?.date || '未設定'}</div>
                <div className="summary-value">{nextSalary ? yen(nextSalary.amount) : '未設定'}</div>
                <div className="summary-sub">予測ルールから自動取得</div>
              </div>
              <div className="summary-card fixed-card">
                <div className="summary-title"><Wallet size={18} /> 次回固定費</div>
                <div className="summary-kicker">{nextFixedCost?.date || '未設定'}</div>
                <div className="summary-value expense-value">{nextFixedCost ? yen(Math.abs(nextFixedCost.amount)) : '未設定'}</div>
                <div className="summary-sub">月末の固定費予測</div>
              </div>
              <button className="summary-card subscription-summary wide-summary" onClick={() => setScreen('subscriptions')}>
                <div className="summary-title"><RefreshCw size={18} /> サブスク</div>
                <div className="summary-kicker">実負担の月額合計</div>
                <div className="summary-value">{yen(monthlySubscriptions)}</div>
                <div className="summary-sub">{activeSubs.length}件 ・ タップして管理/追加</div>
                <div className="brand-strip">{activeSubs.slice(0, 7).map((sub) => <SubscriptionBadge key={sub.name} name={sub.name} />)}</div>
              </button>
            </section>
          </main>
        ) : (
          <main className="content-stack subscription-screen">
            <section className="subscription-hero">
              <div><span>月額合計</span><strong>{yen(monthlySubscriptions)}</strong></div>
              <div><span>年間換算</span><strong>{yen(annualSubscriptions)}</strong></div>
              <div><span>見直し候補</span><strong>{yen(reviewMonthly)}</strong></div>
            </section>

            <div className="subscription-toolbar">
              <div><RefreshCw size={16} /> ドラッグまたは選択で状態変更</div>
              <div className="subscription-actions">
                <button className="secondary-action" onClick={resetStatuses}><RotateCcw size={15} /> 状態を初期化</button>
                <button className="primary-action" onClick={openAddSubscription}>＋ サブスク追加</button>
              </div>
            </div>

            <div className="local-save-note">追加したサブスクはこのブラウザに保存。JSONの既存サブスクとは分けて管理する</div>

            {Object.entries(statusMeta).map(([status, meta]) => {
              const rows = subscriptionRows.filter((sub) => sub.status === status);
              const total = rows.reduce((sum, sub) => sum + sub.monthlyJpy, 0);
              return (
                <section className={`status-column ${meta.tone}`} key={status} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropStatus(event, status)}>
                  <div className="status-header"><div><span className="status-dot" /> {meta.label}</div><span>{rows.length}件 ・ {yen(total)}/月</span></div>
                  <div className="subscription-list">{rows.length ? rows.map((sub) => <SubscriptionCard key={sub.name} sub={sub} onDragStart={startDrag} onStatusChange={setSubStatus} onDelete={deleteCustomSubscription} />) : <div className="empty-drop">ここにドロップ</div>}</div>
                </section>
              );
            })}

            <section className="savings-card"><div><span>解約済みによる削減</span><strong>{yen(cancelledMonthly)}/月</strong></div><div className="savings-year">年間 {yen(cancelledMonthly * 12)}</div></section>
          </main>
        )}

        <footer className="app-version">v{APP_VERSION} ・ data {cashflow.updatedAt?.slice(0, 16).replace('T', ' ') || ''}</footer>

        <nav className="bottom-nav three-tab-nav">
          <button className={screen === 'home' && !showAll ? 'active' : ''} onClick={() => { setScreen('home'); setShowAll(false); }}><Home size={21} /><span>ホーム</span></button>
          <button className={screen === 'home' && showAll ? 'active' : ''} onClick={() => { setScreen('home'); setShowAll(true); }}><ArrowUpDown size={21} /><span>入出金</span></button>
          <button className={screen === 'subscriptions' ? 'active' : ''} onClick={() => { setScreen('subscriptions'); setShowAll(false); }}><RefreshCw size={21} /><span>サブスク</span></button>
        </nav>
      </div>

      {showAddSubscription && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowAddSubscription(false)}>
          <form className="subscription-modal" onSubmit={addSubscription}>
            <div className="modal-header"><div><span>新規登録</span><h2>サブスクを追加</h2></div><button type="button" className="icon-button small" onClick={() => setShowAddSubscription(false)}><X size={18} /></button></div>
            <div className="form-grid">
              <label className="full-field"><span>サービス名</span><input autoFocus value={subscriptionForm.name} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, name: event.target.value })} placeholder="例: iCloud+" /></label>
              <label className="full-field"><span>プラン</span><input value={subscriptionForm.plan} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, plan: event.target.value })} placeholder="例: 200GB" /></label>
              <label><span>請求周期</span><select value={subscriptionForm.billing} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, billing: event.target.value })}><option value="monthly">月額</option><option value="annual">年額</option></select></label>
              <label><span>通貨</span><select value={subscriptionForm.currency} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, currency: event.target.value })}><option value="JPY">JPY</option><option value="USD">USD</option></select></label>
              <label><span>金額</span><input inputMode="decimal" value={subscriptionForm.price} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, price: event.target.value })} placeholder="980" /></label>
              <label><span>負担人数</span><input inputMode="numeric" value={subscriptionForm.split} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, split: event.target.value })} placeholder="1" /></label>
              {subscriptionForm.currency === 'USD' && <label><span>USD/JPY</span><input inputMode="decimal" value={subscriptionForm.fxRate} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, fxRate: event.target.value })} /></label>}
              <label><span>状態</span><select value={subscriptionForm.status} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, status: event.target.value })}><option value="active">契約中</option><option value="review">見直し候補</option><option value="cancelled">解約済み</option></select></label>
            </div>
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal-actions"><button type="button" className="secondary-modal-button" onClick={() => setShowAddSubscription(false)}>キャンセル</button><button type="submit" className="primary-modal-button">追加する</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
