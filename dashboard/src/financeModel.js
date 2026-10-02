function parseIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`日付が不正: ${value}`);
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(`日付が不正: ${value}`);
  return date;
}

function amountValue(value) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '' || !Number.isFinite(Number(value))) {
    throw new Error('残高または入出金額が不正');
  }
  return Number(value);
}

function formatDate(date) {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function endOfMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0));
}

function tokyoTodayIso(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const pick = (type) => parts.find((part) => part.type === type)?.value;
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

function inferIsoDate(monthDay, baseIsoDate) {
  if (!monthDay || !baseIsoDate) return null;
  const match = String(monthDay).match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;
  const base = parseIsoDate(baseIsoDate);
  const month = Number(match[1]);
  const day = Number(match[2]);
  let year = base.getUTCFullYear();
  if (month < base.getUTCMonth() + 1) year += 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeEvent(event, baseIsoDate, forecast = false) {
  const isoDate = event.isoDate || inferIsoDate(event.date, baseIsoDate);
  if (!isoDate) throw new Error(`${event.label || 'イベント'}の日付を解決できない`);
  parseIsoDate(isoDate);
  return {
    ...event,
    isoDate,
    amount: amountValue(event.amount),
    forecast,
  };
}

function expandRecurringRule(rule) {
  const start = parseIsoDate(rule.start);
  const end = parseIsoDate(rule.end);
  const events = [];
  const day = Number(rule.day);
  if (rule.schedule === 'monthly-day' && ((typeof rule.day !== 'number' && typeof rule.day !== 'string') || String(rule.day).trim() === '' || !Number.isInteger(day) || day < 1 || day > 31)) {
    throw new Error('予測の指定日は1〜31の整数が必要');
  }

  for (
    let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    cursor <= end;
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
  ) {
    let eventDate;

    if (rule.schedule === 'month-end') {
      eventDate = endOfMonth(cursor.getUTCFullYear(), cursor.getUTCMonth());
    } else if (rule.schedule === 'monthly-day') {
      // Fixed calendar days never spill into the next month.
      if (day > endOfMonth(cursor.getUTCFullYear(), cursor.getUTCMonth()).getUTCDate()) continue;
      eventDate = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), day));
    } else {
      throw new Error(`未対応の予測スケジュール: ${rule.schedule}`);
    }

    if (eventDate < start || eventDate > end) continue;

    events.push({
      date: formatDate(eventDate),
      isoDate: toIsoDate(eventDate),
      label: rule.label,
      amount: amountValue(rule.amount),
      type: rule.type,
      note: rule.note,
      forecast: true,
      forecastRuleId: rule.id,
    });
  }

  return events;
}

function forecastRules(forecast) {
  if (!forecast?.enabled) return [];
  if (!Array.isArray(forecast.recurring)) throw new Error('予測ルールの配列が必要');
  const ids = new Set();
  for (const rule of forecast.recurring) {
    if (typeof rule?.id !== 'string' || !rule.id.trim() || rule.id !== rule.id.trim()) {
      throw new Error('予測ルールidは空白のない非空文字列が必要');
    }
    if (ids.has(rule.id)) throw new Error('予測ルールidが重複');
    ids.add(rule.id);
  }
  return forecast.recurring;
}

export function buildCashflowModel(cashflow, now = new Date()) {
  if (!cashflow?.start || !Array.isArray(cashflow.events)) {
    throw new Error('cashflow.json の形式が不正');
  }

  const baseIsoDate = cashflow.start.isoDate;
  if (!baseIsoDate) throw new Error('start.isoDate が必要');
  parseIsoDate(baseIsoDate);

  const baseActual = {
    date: cashflow.start.date,
    isoDate: baseIsoDate,
    label: cashflow.start.label,
    amount: 0,
    balance: amountValue(cashflow.start.balance),
    type: 'base',
    note: cashflow.start.note,
    forecast: false,
  };

  const rules = forecastRules(cashflow.forecast);
  const ruleIds = new Set(rules.map(rule => rule.id));
  const confirmedEvents = cashflow.events.map((event) => {
    const id = event.forecastRuleId;
    // Missing/null means an unlinked actual transaction; never guess its rule.
    if (id != null && (typeof id !== 'string' || !id.trim() || id !== id.trim())) {
      throw new Error('forecastRuleIdは空白のない非空文字列が必要');
    }
    if (id != null && cashflow.forecast?.enabled && !ruleIds.has(id)) {
      throw new Error('forecastRuleIdに対応する予測ルールがない');
    }
    return normalizeEvent(event, baseIsoDate, false);
  });
  // Confirmation explicitly identifies the forecast occurrence it replaces.
  // Equal labels or amounts alone are not proof that two transactions are identical.
  const confirmedForecastKeys = new Set(confirmedEvents
    .filter(event => typeof event.forecastRuleId === 'string' && event.forecastRuleId.trim())
    .map(event => JSON.stringify([event.forecastRuleId, event.isoDate])));
  const forecastEvents = rules.flatMap(expandRecurringRule)
    .filter(event => event.isoDate > baseIsoDate)
    .filter(event => !confirmedForecastKeys.has(JSON.stringify([event.forecastRuleId, event.isoDate])));
  const allEvents = [...confirmedEvents, ...forecastEvents].sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  const timeline = [baseActual];
  for (const event of allEvents) {
    const previousBalance = timeline[timeline.length - 1].balance;
    timeline.push({ ...event, balance: previousBalance + event.amount });
  }

  const todayIso = tokyoTodayIso(now);
  const todayDate = parseIsoDate(todayIso);
  const todayLabel = formatDate(todayDate);
  const appliedThroughToday = timeline.filter((item) => item.isoDate <= todayIso);
  const todayPoint = appliedThroughToday[appliedThroughToday.length - 1] || baseActual;
  const upcomingEvents = timeline.filter((item, index) => index > 0 && item.isoDate > todayIso);
  const pastAndTodayEvents = timeline.filter((item, index) => index > 0 && item.isoDate <= todayIso);
  const projected = timeline[timeline.length - 1];
  const minimumWindow = [todayPoint, ...upcomingEvents];
  const minimum = minimumWindow.reduce((min, item) => item.balance < min.balance ? item : min, minimumWindow[0]);
  const nextSalary = upcomingEvents.find((event) => event.type === 'income' && event.label.includes('給与')) || null;
  const nextFixedCost = upcomingEvents.find((event) => event.type === 'fixed') || null;

  return {
    timeline,
    baseActual,
    todayIso,
    todayLabel,
    todayPoint,
    upcomingEvents,
    pastAndTodayEvents,
    confirmedEvents,
    forecastEvents,
    projected,
    minimum,
    nextSalary,
    nextFixedCost,
    forecastNote: cashflow.forecast?.note || '',
    projectionLabel: projected.amount < 0 ? `${projected.date} 支払後` : projected.amount > 0 ? `${projected.date} 入金後` : `${projected.date} 時点`,
    historyBoundaryLabel: `${baseActual.date}の実残高を基準に計算`,
  };
}
