// Helpers shared across machine / hourly-production pages.

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function hourLabel(h) {
  const next = (h + 1) % 24;
  return `${pad2(h)}:00–${pad2(next)}:00`;
}

// All 24 hour slots of a day, in order.
export const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);

export function formatDateLong(dateStr) {
  if (!dateStr) return '—';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Totals for a set of hourly logs (any machine/date mix).
export function totals(logs) {
  return logs.reduce(
    (acc, l) => {
      acc.quantity += l.quantity || 0;
      acc.rejected += l.rejected_qty || 0;
      acc.downtimeMin += l.downtime_minutes || 0;
      acc.hoursLogged += 1;
      return acc;
    },
    { quantity: 0, rejected: 0, downtimeMin: 0, hoursLogged: 0 }
  );
}

// Efficiency = actual good output vs theoretical capacity for the hours actually logged.
export function efficiencyPct(qty, hoursLogged, capacityPerHour) {
  if (!capacityPerHour || hoursLogged <= 0) return null;
  const theoretical = capacityPerHour * hoursLogged;
  if (theoretical <= 0) return null;
  return Math.min(999, (qty / theoretical) * 100);
}

export function rejectRatePct(qty, rejected) {
  const produced = qty + rejected;
  if (produced <= 0) return 0;
  return (rejected / produced) * 100;
}

export function effColor(pct) {
  if (pct === null) return 'var(--text-muted)';
  if (pct >= 90) return 'var(--green-text)';
  if (pct >= 70) return 'var(--amber-text)';
  return 'var(--red-text)';
}

export function groupBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

// Build a YYYY-MM-DD array between two dates inclusive.
export function dateRange(startStr, endStr) {
  const out = [];
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T00:00:00`);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
