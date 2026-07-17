import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageBase64, mediaType, docType, materialNames } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No document image provided.' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Document scanning is not set up yet — add ANTHROPIC_API_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    const isPO = docType !== 'bill';

    const materialsHint = materialNames && materialNames.length
      ? `Known material names in this system (use the exact name from this list if it matches, else leave material_name as whatever is written on the document): ${materialNames.join(', ')}.`
      : '';

    const systemPrompt = isPO
      ? `You extract order details from a photo or scan of a customer's Purchase Order (PO) for a plastic moulding business. Read the document carefully, including handwriting if present.

Return ONLY valid JSON, no markdown, no preamble, matching exactly this shape:
{
  "customer_name": string or null,
  "item_name": string or null,
  "description": string or null,
  "quantity": number or null,
  "due_date": "YYYY-MM-DD" or null,
  "price": number or null,
  "notes": string or null,
  "po_number": string or null,
  "confidence": "high" | "medium" | "low"
}

Rules:
- customer_name is the company placing the order (often at the top of the document, or "Bill To"/"Ship From").
- item_name and description come from the line item(s) — if there are multiple line items, use the first/main one for item_name and summarize the rest in description or notes.
- Convert any date format to YYYY-MM-DD. Assume the delivery/required-by date as due_date, not the PO issue date, if both are present.
- quantity should be a plain number (convert "8,000 pcs" to 8000).
- price is the total order value if visible, not per-unit price, unless only per-unit is shown.
- Put any special instructions (packing, color requirements, etc.) in notes.
- Set confidence to "low" if the image is blurry, partially unreadable, or handwriting is ambiguous — this signals the user should double check before saving.
- Never invent information that is not visibly on the document.`
      : `You extract raw material details from a photo or scan of a supplier's bill/invoice for a plastic moulding business (typically for granules, masterbatch, or similar raw materials). Read the document carefully, including handwriting if present.

Return ONLY valid JSON, no markdown, no preamble, matching exactly this shape:
{
  "material_name": string or null,
  "color": string or null,
  "quantity_kg": number or null,
  "price_per_kg": number or null,
  "total_price": number or null,
  "supplier_name": string or null,
  "bill_number": string or null,
  "bill_date": "YYYY-MM-DD" or null,
  "notes": string or null,
  "confidence": "high" | "medium" | "low"
}

Rules:
- supplier_name is the company issuing the bill (usually at the top).
- material_name should be the product name as written (e.g. "HDPE Granules", "Masterbatch Blue").
- quantity_kg: convert any unit to kg if possible (e.g. "2 bags of 25kg" = 50). If unit is unclear, use the raw number and note the ambiguity in notes.
- ${materialsHint}
- Set confidence to "low" if the image is blurry, partially unreadable, or handwriting is ambiguous.
- Never invent information not visibly on the document.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
              { type: 'text', text: isPO ? 'Extract the order details from this purchase order.' : 'Extract the material details from this bill.' },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('Anthropic API error:', response.status, errText);
      return NextResponse.json({ error: 'Could not read the document right now. Try again.' }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.find((b) => b.type === 'text')?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      return NextResponse.json({ error: 'Could not make sense of that document. Try a clearer photo.' }, { status: 422 });
    }

    return NextResponse.json({ fields: parsed, docType: isPO ? 'po' : 'bill' });
  } catch (err) {
    console.error('Document parse error:', err);
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  }
}
