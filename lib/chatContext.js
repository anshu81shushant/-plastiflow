import { daysLeftLabel } from './orders';

// Builds a compact, plain-text snapshot of the business's current data so the
// AI assistant can answer questions like "which orders are overdue?" or
// "which material is running low?" without needing raw database access.
// Kept intentionally short (a few hundred tokens) to stay fast and cheap.
export async function buildChatContext(supabase) {
  const [ordersRes, materialsRes, machinesRes] = await Promise.all([
    supabase
      .from('orders')
      .select('item_name, customer_name, quantity, status, due_date')
      .order('due_date', { ascending: true })
      .limit(200),
    supabase
      .from('raw_materials')
      .select('name, color, stock_kg, reorder_threshold_kg')
      .limit(100),
    supabase
      .from('machines')
      .select('name, status')
      .limit(50),
  ]);

  const orders = ordersRes.data || [];
  const materials = materialsRes.data || [];
  const machines = machinesRes.data || [];

  const total = orders.length;
  const byStatus = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const overdue = orders.filter((o) => {
    if (o.status === 'Completed') return false;
    return o.due_date && new Date(o.due_date) < new Date(new Date().toDateString());
  });

  const upcoming = orders
    .filter((o) => o.status !== 'Completed')
    .slice(0, 12)
    .map((o) => `- ${o.item_name} for ${o.customer_name}, qty ${o.quantity ?? '—'}, status ${o.status}, ${daysLeftLabel(o.due_date, o.status)}`)
    .join('\n');

  const lowStock = materials.filter((m) => Number(m.stock_kg) <= Number(m.reorder_threshold_kg));

  const materialLines = materials
    .map((m) => `- ${m.name}${m.color ? ` (${m.color})` : ''}: ${m.stock_kg}kg in stock, reorder below ${m.reorder_threshold_kg}kg${Number(m.stock_kg) <= Number(m.reorder_threshold_kg) ? '  ⚠ LOW STOCK' : ''}`)
    .join('\n');

  const machineLines = machines
    .map((m) => `- ${m.name}: ${m.status}`)
    .join('\n');

  return `
ORDER SUMMARY
Total orders: ${total}
By status: ${Object.entries(byStatus).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'}
Overdue orders: ${overdue.length}

ORDERS (not yet completed, soonest due first, up to 12 shown):
${upcoming || 'None.'}

RAW MATERIALS (${materials.length} total, ${lowStock.length} low on stock):
${materialLines || 'No materials tracked yet.'}

MACHINES (${machines.length} total):
${machineLines || 'No machines tracked yet.'}
`.trim();
}
