export const MACHINE_STATUSES = ['Running', 'Idle', 'Down', 'Maintenance'];

export function machineStatusBadgeClass(status) {
  switch (status) {
    case 'Running': return 'badge badge-completed';
    case 'Idle': return 'badge badge-pending';
    case 'Down': return 'badge badge-delayed';
    case 'Maintenance': return 'badge badge-in-progress';
    default: return 'badge';
  }
}

export function formatHourSlot(hour) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:00 ${ampm}`;
}

// Total units produced by a machine within a set of hourly logs.
export function totalUnitsFor(logs) {
  return logs.reduce((sum, l) => sum + (l.units_produced || 0), 0);
}

// Group hourly logs by date, returning { 'YYYY-MM-DD': totalUnits }.
export function dailyTotals(logs) {
  const totals = {};
  for (const log of logs) {
    totals[log.log_date] = (totals[log.log_date] || 0) + (log.units_produced || 0);
  }
  return totals;
}

// Sum downtime duration in minutes across a set of downtime logs.
// Ongoing events (no ended_at) count up to "now".
export function totalDowntimeMinutes(downtimeLogs) {
  const now = new Date();
  return downtimeLogs.reduce((sum, d) => {
    const start = new Date(d.started_at);
    const end = d.ended_at ? new Date(d.ended_at) : now;
    const minutes = Math.max(0, (end - start) / 60000);
    return sum + minutes;
  }, 0);
}

export function formatMinutes(mins) {
  const rounded = Math.round(mins);
  if (rounded < 60) return `${rounded}m`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Returns the last N calendar dates (including today) as 'YYYY-MM-DD' strings, oldest first.
export function lastNDates(n) {
  const dates = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}
