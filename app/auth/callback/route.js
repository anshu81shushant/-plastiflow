import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(`${origin}${next}`);
  }

  // If no code, check for token in hash (password reset flow)
  // Supabase sends password reset tokens in URL fragment (#access_token=...)
  // The frontend will handle this in reset-password page
  return NextResponse.redirect(`${origin}/reset-password`);
}
