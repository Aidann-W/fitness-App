import { NextResponse } from 'next/server';
import { supabaseForRequest } from '@/lib/supabase';

const UNAUTHORIZED = { error: 'Not signed in' };

// GET /api/schedule - The caller's gym sessions from the past week onwards
export async function GET(req: Request) {
  const supabase = supabaseForRequest(req);
  if (!supabase) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('gym_sessions')
    .select('id, title, starts_at, ends_at, source')
    .gte('ends_at', weekAgo)
    .order('starts_at');

  if (error) {
    console.error('Load schedule error:', error);
    return NextResponse.json({ error: 'Could not load your schedule' }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PATCH /api/schedule - Create or update a gym session by id
export async function PATCH(req: Request) {
  const supabase = supabaseForRequest(req);
  if (!supabase) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const { id, title, starts_at, ends_at, source } = await req.json();

  const { error } = await supabase
    .from('gym_sessions')
    .upsert({ id, title, starts_at, ends_at, source });

  if (error) {
    console.error('Save gym session error:', error);
    return NextResponse.json({ error: 'Could not save that session' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/schedule - Remove a gym session
export async function DELETE(req: Request) {
  const supabase = supabaseForRequest(req);
  if (!supabase) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const { id } = await req.json();

  const { error } = await supabase.from('gym_sessions').delete().eq('id', id);

  if (error) {
    console.error('Delete gym session error:', error);
    return NextResponse.json({ error: 'Could not remove that session' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
