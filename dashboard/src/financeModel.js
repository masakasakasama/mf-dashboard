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
  }];

  for (const event of cashflow.events) {
    const previousBalance = timeline[timeline.length - 1].balance;
    timeline.push({
      ...event,
      amount: Number(event.amount),
      balance: previousBalance + Number(event.amount),
    });
  }

  const current = timeline[0];
  const futureEvents = timeline.slice(1);
  const projected = timeline[timeline.length - 1];
  const minimum = timeline.reduce((min, item) => item.balance < min.balance ? item : min, timeline[0]);
  const latestSalary = [...futureEvents].reverse().find((event) => event.type === 'income' && event.label.includes('給与')) || null;

  return {
    timeline,
    current,
    futureEvents,
    projected,
    minimum,
    latestSalary,
    projectionLabel: projected.amount < 0 ? `${projected.date} 支払後` : projected.amount > 0 ? `${projected.date} 入金後` : `${projected.date} 時点`,
    historyBoundaryLabel: `${current.date}以前は現在残高に反映済み`,
  };
}
