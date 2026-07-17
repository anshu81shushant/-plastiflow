import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { buildChatContext } from '@/lib/chatContext';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are the PlastiFlow assistant, built into a production-tracking app for a plastic moulding business. Answer questions about the business's orders, raw materials, and machines using ONLY the DATA SNAPSHOT provided below — it reflects the current state of their Supabase database.

Rules:
- Be concise. Use short sentences or a tight bullet list. This renders in a small mobile chat bubble, not a document.
- If the data snapshot doesn't contain something the person asks about, say so plainly instead of guessing.
- Numbers matter here (quantities, kg, dates) — never round or approximate them.
- You cannot take actions (you can't create, edit, or delete orders/materials) — if asked to do something, point out this is a read-only assistant for now and tell them where in the app to do it (e.g. "Orders → Add Order").
- Keep a plain, helpful, factory-floor tone — no corporate fluff.`;

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set on the server. Add it in your .env.local (and in Vercel project settings for production) to enable the AI assistant.' },
      { status: 500 }
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return NextResponse.json({ error: 'No message provided.' }, { status: 400 });
  }

  // Only keep the last few turns — the assistant is stateless per-request and
  // doesn't need a long history to answer factual questions about the data.
  const recentMessages = messages.slice(-10).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '').slice(0, 4000),
  }));

  let contextBlock = 'DATA SNAPSHOT: unavailable (could not read the database).';
  try {
    contextBlock = `DATA SNAPSHOT:\n${await buildChatContext(supabase)}`;
  } catch (err) {
    console.error('chat context error', err);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 600,
        system: `${SYSTEM_PROMPT}\n\n${contextBlock}`,
        messages: recentMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error', response.status, errText);
      return NextResponse.json({ error: 'The AI assistant is temporarily unavailable. Try again in a moment.' }, { status: 502 });
    }

    const data = await response.json();
    const reply = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim() || "Sorry, I couldn't come up with an answer for that.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('chat route error', err);
    return NextResponse.json({ error: 'Something went wrong reaching the AI assistant.' }, { status: 500 });
  }
}
