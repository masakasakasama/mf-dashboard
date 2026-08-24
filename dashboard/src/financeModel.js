function parseIsoDate(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) throw new Error(`予測日付が不正: ${value}`);
  return new Date(Date.UTC(year, month - 1, day));
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

function expandRecurringRule(rule) {
  const start = parseIsoDate(rule.start);
  const end = parseIsoDate(rule.end);
  const events = [];

  for (
    let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    cursor <= end;
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
  ) {
    let eventDate;

    if (rule.schedule === 'month-end') {
      eventDate = endOfMonth(cursor.getUTCFullYear(), cursor.getUTCMonth());
    } else if (rule.schedule === 'monthly-day') {
      eventDate = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), Number(rule.day)));
    } else {
      throw new Error(`未対応の予測スケジュール: ${rule.schedule}`);
    }

    if (eventDate < start || eventDate > end) continue;

    events.push({
      date: formatDate(eventDate),
      isoDate: toIsoDate(eventDate),
      label: rule.label,
      amount: Number(rule.amount),
      type: rule.type,
      note: rule.note,
      forecast: true,
      forecastRuleId: rule.id,
    });
  }

  return events;
}

function expandForecast(forecast) {
  if (!forecast?.enabled || !Array.isArray(forecast.recurring)) return [];

  return forecast.recurring
    .flatMap(expandRecurringRule)
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));
}

export function buildCashflowModel(cashflow) {
  if (!cashflow?.start || !Array.isArray(cashflow.events)) {
    throw new Error('cashflow.json の形式が不正');
  }

  const timeline = [{
    date: cashflow.start.date,
    label: cashflow.start.label,
    amount: 0,
    balance: Number(cashflow.start.balance),
    type: 'base',
    note: cashflow.start.note,
    forecast: false,
  }];

  const confirmedEvents = cashflow.events.map((event) => ({
    ...event,
    amount: Number(event.amount),
    forecast: false,
  }));
  const forecastEvents = expandForecast(cashflow.forecast);
  const allFutureEvents = [...confirmedEvents, ...forecastEvents];

  for (const event of allFutureEvents) {
    const previousBalance = timeline[timeline.length - 1].balance;
    timeline.push({
      ...event,
      balance: previousBalance + Number(event.amount),
    });
  }

  const current = timeline[0];
  const futureEvents = timeline.slice(1);
  const projected = timeline[timeline.length - 1];
  const minimum = timeline.reduce((min, item) => item.balance < min.balance ? item : min, timeline[0]);
  const latestSalary = confirmedEvents.find((event) => event.type === 'income' && event.label.includes('給与'))
    || forecastEvents.find((event) => event.type === 'income' && event.label.includes('給与'))
    || null;

  return {
    timeline,
    current,
    futureEvents,
    confirmedEvents,
    forecastEvents,
    projected,
    minimum,
    latestSalary,
    forecastNote: cashflow.forecast?.note || '',
    projectionLabel: projected.amount < 0 ? `${projected.date} 支払後` : projected.amount > 0 ? `${projected.date} 入金後` : `${projected.date} 時点`,
    historyBoundaryLabel: `${current.date}以前は現在残高に反映済み`,
  };
}
