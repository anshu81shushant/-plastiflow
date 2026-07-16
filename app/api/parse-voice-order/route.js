import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { transcript, materialNames } = await request.json();

    if (!transcript || !transcript.trim()) {
      return NextResponse.json({ error: 'No speech detected. Try again.' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Voice-fill is not set up yet — add ANTHROPIC_API_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const materialsHint = materialNames && materialNames.length
      ? `Known material names to match against (use the exact name from this list if it matches, else leave material_name null): ${materialNames.join(', ')}.`
      : '';

    const systemPrompt = `You extract structured order data from a naturally spoken sentence for a plastic moulding order form. The speaker will talk normally, not in a rigid format — e.g. "order for Rajesh Traders, five thousand plastic hangers, due next Friday, fifteen grams each of HDPE granules, price fifty thousand rupees". Today's date is ${today}.

Return ONLY valid JSON, no markdown, no preamble, matching exactly this shape:
{
  "customer_name": string or null,
  "item_name": string or null,
  "description": string or null,
  "quantity": number or null,
  "due_date": "YYYY-MM-DD" or null,
  "days_to_complete": number or null,
  "price": number or null,
  "notes": string or null,
  "material_name": string or null,
  "material_grams_per_unit": number or null
}

Rules:
- Understand natural phrasing, not just keyword cues. Infer customer name, item name, and quantity from context even without explicit labels like "customer:" or "item:".
- Convert relative dates ("next Friday", "in 10 days", "tomorrow") to an actual YYYY-MM-DD date based on today's date.
- Convert spoken numbers ("five thousand", "twenty five") to numeric values.
- If they mention material and grams per piece, extract material_name and material_grams_per_unit.
- If days_to_complete isn't mentioned but due_date is, leave days_to_complete null (the app can calculate it).
- Leave any field null if not mentioned or unclear. Do not invent or guess values that weren't said.
- ${materialsHint}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: transcript }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('Anthropic API error:', response.status, errText);
      return NextResponse.json({ error: 'Could not process speech right now. Try again.' }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.find((b) => b.type === 'text')?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      return NextResponse.json({ error: 'Could not understand the order details. Try again.' }, { status: 422 });
    }

    return NextResponse.json({ fields: parsed });
  } catch (err) {
    console.error('Voice parse error:', err);
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  }
}
