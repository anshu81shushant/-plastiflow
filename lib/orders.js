export const STATUSES = ['Pending', 'In Progress', 'Completed', 'Delayed'];

export function statusBadgeClass(status) {
  switch (status) {
    case 'Pending': return 'badge badge-pending';
    case 'In Progress': return 'badge badge-in-progress';
    case 'Completed': return 'badge badge-completed';
    case 'Delayed': return 'badge badge-delayed';
    default: return 'badge';
  }
}

export function daysLeft(dueDate) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
}

export function daysLeftLabel(dueDate, status) {
  if (status === 'Completed') return 'Done';
  const d = daysLeft(dueDate);
  if (d === null) return '—';
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return 'Due today';
  return `${d}d left`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

export function initials(name) {
  if (!name) return '??';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function progressPct(daysToComplete, dueDate) {
  const remaining = daysLeft(dueDate);
  if (remaining === null || !daysToComplete) return 0;
  const elapsed = daysToComplete - remaining;
  const pct = (elapsed / daysToComplete) * 100;
  return Math.max(4, Math.min(100, Math.round(pct)));
}

// Given a material and the list of active (non-completed) orders that use it,
// project remaining kg and days until it runs out.
export function materialProjection(material, activeOrdersForMaterial) {
  const committedKg = activeOrdersForMaterial.reduce((sum, o) => {
    const grams = (o.material_grams_per_unit || 0) * (o.quantity || 0);
    return sum + grams / 1000;
  }, 0);

  const remainingAfterOrders = material.stock_kg - committedKg;

  // Rough daily burn rate: total committed kg spread across the longest
  // due date among active orders using this material (simple, conservative estimate).
  const maxDaysOut = activeOrdersForMaterial.reduce((max, o) => {
    const d = daysLeft(o.due_date);
    return d !== null && d > max ? d : max;
  }, 1);

  const dailyBurnKg = committedKg > 0 ? committedKg / Math.max(maxDaysOut, 1) : 0;
  const daysUntilEmpty = dailyBurnKg > 0 ? Math.floor(material.stock_kg / dailyBurnKg) : null;

  let status = 'ok';
  if (material.stock_kg <= material.reorder_threshold_kg) status = 'low';
  if (remainingAfterOrders < 0) status = 'critical';

  return { committedKg, remainingAfterOrders, daysUntilEmpty, status };
}
