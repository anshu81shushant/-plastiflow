// Free, local (no API) parser for voice-dictated order details.
// Expects structured cues like: "customer Rajesh Traders, item plastic hanger,
// quantity 5000, due date 20 July, material HDPE, grams 15, price 50000, notes handle with care"

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100, thousand: 1000, lakh: 100000,
};

const MONTHS = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3, may: 4,
  june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7, september: 8, sep: 8, sept: 8,
  october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
};

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Convert spoken number phrases ("five thousand", "twenty five") to a number.
// Falls back to parsing plain digits if no words matched.
function wordsToNumber(text) {
  const digits = text.match(/[\d,]+(\.\d+)?/);
  const cleanWords = text.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  const tokens = cleanWords.split(/\s+/).filter(Boolean);

  let total = 0;
  let current = 0;
  let matchedAny = false;

  for (const token of tokens) {
    if (token in NUMBER_WORDS) {
      matchedAny = true;
      const val = NUMBER_WORDS[token];
      if (val === 100) {
        current = (current || 1) * val;
      } else if (val === 1000 || val === 100000) {
        current = (current || 1) * val;
        total += current;
        current = 0;
      } else {
        current += val;
      }
    }
  }
  total += current;

  if (matchedAny) return total;
  if (digits) return parseFloat(digits[0].replace(/,/g, ''));
  return null;
}

// Parse relative/absolute spoken dates into YYYY-MM-DD.
function parseSpokenDate(text) {
  const t = text.toLowerCase().trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (t.includes('today')) return today;

  if (t.includes('tomorrow')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }

  // "in N days"
  const inDaysMatch = t.match(/in\s+([a-z\d\s]+?)\s+days?/);
  if (inDaysMatch) {
    const n = wordsToNumber(inDaysMatch[1]);
    if (n !== null) {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return d;
    }
  }

  // "next <weekday>"
  const nextDayMatch = t.match(/next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
  if (nextDayMatch) {
    const targetDay = WEEKDAYS.indexOf(nextDayMatch[1]);
    const d = new Date(today);
    let diff = (targetDay - d.getDay() + 7) % 7;
    diff = diff === 0 ? 7 : diff;
    d.setDate(d.getDate() + diff);
    return d;
  }

  // "this <weekday>" or just "<weekday>"
  const dayMatch = t.match(/(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
  if (dayMatch) {
    const targetDay = WEEKDAYS.indexOf(dayMatch[1]);
    const d = new Date(today);
    let diff = (targetDay - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + diff);
    return d;
  }

  // "20 july" / "july 20" / "20th of july"
  const monthNames = Object.keys(MONTHS).join('|');
  const dmMatch = t.match(new RegExp(`(\\d{1,2})(st|nd|rd|th)?\\s+(?:of\\s+)?(${monthNames})`));
  if (dmMatch) {
    const day = parseInt(dmMatch[1], 10);
    const month = MONTHS[dmMatch[3]];
    let year = today.getFullYear();
    const d = new Date(year, month, day);
    if (d < today) d.setFullYear(year + 1);
    return d;
  }
  const mdMatch = t.match(new RegExp(`(${monthNames})\\s+(\\d{1,2})`));
  if (mdMatch) {
    const month = MONTHS[mdMatch[1]];
    const day = parseInt(mdMatch[2], 10);
    let year = today.getFullYear();
    const d = new Date(year, month, day);
    if (d < today) d.setFullYear(year + 1);
    return d;
  }

  // plain numeric date DD/MM/YYYY or DD-MM-YYYY
  const numericMatch = t.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (numericMatch) {
    const [, dd, mm, yy] = numericMatch;
    const year = yy.length === 2 ? 2000 + parseInt(yy, 10) : parseInt(yy, 10);
    return new Date(year, parseInt(mm, 10) - 1, parseInt(dd, 10));
  }

  return null;
}

function toISODate(date) {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Cue words that mark the start of each field, in the order we scan for them.
const FIELD_CUES = [
  { key: 'customer_name', cues: ['customer', 'client', 'for'] },
  { key: 'item_name', cues: ['item', 'product'] },
  { key: 'quantity', cues: ['quantity', 'qty', 'pieces', 'units'] },
  { key: 'due_date', cues: ['due date', 'due', 'deadline', 'by'] },
  { key: 'material_name', cues: ['material'] },
  { key: 'material_grams_per_unit', cues: ['grams', 'gram', 'gsm'] },
  { key: 'price', cues: ['price', 'cost', 'amount'] },
  { key: 'notes', cues: ['notes', 'note'] },
];

export function parseVoiceTranscript(transcript, materialNames = []) {
  const text = ' ' + transcript.toLowerCase().replace(/\s+/g, ' ').trim() + ' ';
  const result = {
    customer_name: null,
    item_name: null,
    description: null,
    quantity: null,
    due_date: null,
    days_to_complete: null,
    price: null,
    notes: null,
    material_name: null,
    material_grams_per_unit: null,
  };

  // Find the position of each cue phrase in the text, then take the text between
  // one cue and the next as that field's value.
  const positions = [];
  for (const field of FIELD_CUES) {
    for (const cue of field.cues) {
      const idx = text.indexOf(` ${cue} `);
      if (idx !== -1) {
        positions.push({ field: field.key, start: idx + cue.length + 2, cueLength: cue.length });
        break; // only first matching cue per field
      }
    }
  }
  positions.sort((a, b) => a.start - b.start);

  for (let i = 0; i < positions.length; i++) {
    const { field, start } = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1].start - positions[i + 1].cueLength - 2 : text.length;
    let value = text.slice(start, end).replace(/,|\band\b/g, ' ').trim();
    if (!value) continue;

    switch (field) {
      case 'customer_name':
        result.customer_name = titleCase(value);
        break;
      case 'item_name':
        result.item_name = titleCase(value);
        break;
      case 'quantity': {
        const n = wordsToNumber(value);
        if (n !== null) result.quantity = n;
        break;
      }
      case 'due_date': {
        const d = parseSpokenDate(value);
        if (d) result.due_date = toISODate(d);
        break;
      }
      case 'material_name': {
        const match = materialNames.find((m) => value.includes(m.toLowerCase()));
        result.material_name = match || titleCase(value);
        break;
      }
      case 'material_grams_per_unit': {
        const n = wordsToNumber(value);
        if (n !== null) result.material_grams_per_unit = n;
        break;
      }
      case 'price': {
        const n = wordsToNumber(value);
        if (n !== null) result.price = n;
        break;
      }
      case 'notes':
        result.notes = value;
        break;
    }
  }

  return result;
}

function titleCase(str) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}
