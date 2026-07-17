// Free, local parsing of OCR'd text from a PO or bill. No API calls.
// Works best on clean, printed, well-formatted documents — accuracy drops
// on handwriting, unusual layouts, or scanned copies with noise.

function findDate(text) {
  // Matches: 28-Jul-2026, 28/07/2026, 28-07-2026, July 28 2026, 2026-07-28
  const patterns = [
    /(\d{1,2})[-\/](\w{3,9})[-\/](\d{4})/, // 28-Jul-2026 or 28/July/2026
    /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/, // 28-07-2026 or 28/07/2026
    /(\d{4})-(\d{1,2})-(\d{1,2})/,          // 2026-07-28
  ];
  const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    let [, a, b, c] = match;
    if (a.length === 4) return `${a}-${String(b).padStart(2, '0')}-${String(c).padStart(2, '0')}`; // YYYY-MM-DD already
    if (isNaN(b)) {
      const m = months[b.toLowerCase().slice(0, 3)];
      if (m) return `${c}-${m}-${String(a).padStart(2, '0')}`;
    } else {
      // ambiguous DD-MM vs MM-DD; assume DD-MM (India convention)
      return `${c}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
    }
  }
  return null;
}

function findNearLabel(text, labels) {
  for (const label of labels) {
    // Require an actual separator (colon, dash, or line break) between the label and its value —
    // otherwise "Customer" immediately followed by an address with no space gets glued together
    // into something like "Customer123 Industrial Estate...".
    const re = new RegExp(label + '\\s*[:\\-]\\s*([^\\n]+)', 'i');
    const match = text.match(re);
    if (match && match[1].trim()) return match[1].trim();
  }
  return null;
}

function findNumber(str) {
  if (!str) return null;
  const cleaned = str.replace(/[,\s]/g, '');
  const match = cleaned.match(/[\d.]+/);
  return match ? Number(match[0]) : null;
}

function findQuantity(text) {
  // Look for patterns like "8,000 pcs", "8000 units", "Qty: 5000"
  const patterns = [
    /qty[:\s]*([0-9,]+)/i,
    /quantity[:\s]*([0-9,]+)/i,
    /([0-9,]{3,})\s*(pcs|pieces|units|nos)/i,
  ];
  for (const p of patterns) {
    const match = text.match(p);
    if (match) return findNumber(match[1]);
  }
  return null;
}

function findMoney(text, nearWord) {
  // Look for "Rs. 52,000" or "₹52,000" near a keyword like "Total" or "Price"
  const re = new RegExp(nearWord + '[^\\n]*?(?:Rs\\.?|₹|INR)\\s*([0-9,]+(?:\\.[0-9]+)?)', 'i');
  const match = text.match(re);
  return match ? findNumber(match[1]) : null;
}

export function parsePurchaseOrder(text) {
  // "Ship To" is often YOUR company (the recipient), not the customer placing the order.
  // The customer/buyer name is usually the very first line (letterhead) or explicitly labeled.
  const customer_name = findNearLabel(text, ['buyer', 'customer name', 'from']) ||
    text.split('\n').map((l) => l.trim()).filter(Boolean)[0] || null;

  const item_name = (() => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (/\d{2,}\s*(pcs|pieces|units)/i.test(line) && !/description|qty|amount/i.test(line)) {
        // Cut everything from the first run of digits (with optional comma) followed by
        // optional space and the unit word — removes "8,000 pcs Rs. 6.50 Rs. 52,000" entirely.
        const cut = line.search(/\d[\d,]*\s*(pcs|pieces|units)/i);
        return cut > -1 ? line.slice(0, cut).trim().replace(/[-–,]\s*$/, '').trim() : line.trim();
      }
    }
    return null;
  })();

  const quantity = findQuantity(text);
  const due_date = (() => {
    const near = findNearLabel(text, ['delivery required by', 'delivery date', 'required by', 'due date']);
    return near ? findDate(near) || findDate(text) : findDate(text);
  })();
  const price = findMoney(text, 'total') || findMoney(text, 'amount');
  const po_number = findNearLabel(text, ['po no', 'po number', 'p\\.o\\. no']);

  const notesMatch = text.match(/special instructions?[:\s]*([^\n]+(?:\n[^\n]+)?)/i);
  const notes = notesMatch ? notesMatch[1].trim() : null;

  return {
    customer_name,
    item_name,
    description: null,
    quantity,
    due_date,
    price,
    notes,
    po_number,
  };
}

export function parseBill(text, knownMaterialNames = []) {
  const supplier_name = text.split('\n')[0]?.trim() || null;

  const material_name = (() => {
    for (const name of knownMaterialNames) {
      if (text.toLowerCase().includes(name.toLowerCase())) return name;
    }
    // fallback: look for common material keywords
    const match = text.match(/(HDPE|LDPE|PP|PVC|ABS|PET|masterbatch)[^\n,]*/i);
    return match ? match[0].trim() : null;
  })();

  const color = (() => {
    const match = text.match(/colou?r[:\s]*([a-zA-Z]+)/i);
    return match ? match[1].trim() : null;
  })();

  const quantity_kg = (() => {
    const match = text.match(/([0-9,.]+)\s*kg/i);
    return match ? findNumber(match[1]) : null;
  })();

  const price_per_kg = (() => {
    const match = text.match(/(?:Rs\.?|₹|INR)\s*([0-9,.]+)\s*\/?\s*kg/i);
    return match ? findNumber(match[1]) : null;
  })();

  const total_price = findMoney(text, 'total') || findMoney(text, 'grand total') || findMoney(text, 'amount');
  const bill_number = findNearLabel(text, ['bill no', 'invoice no', 'invoice number']);
  const bill_date = findDate(text);

  return {
    material_name,
    color,
    quantity_kg,
    price_per_kg,
    total_price,
    supplier_name,
    bill_number,
    bill_date,
    notes: null,
  };
}
