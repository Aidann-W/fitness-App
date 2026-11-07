import { NextResponse } from 'next/server';
import { supabaseForRequest } from '@/lib/supabase';

const UNAUTHORIZED = { error: 'Not signed in' };

// GET /api/routines - Fetch the caller's saved routines
export async function GET(req: Request) {
  const supabase = supabaseForRequest(req);
  if (!supabase) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Load routines error:', error);
    return NextResponse.json({ error: 'Could not load routines' }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/routines - Save a routine for the caller
export async function POST(req: Request) {
  const supabase = supabaseForRequest(req);
  if (!supabase) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const routine = await req.json();

  const { data, error } = await supabase
    .from('routines')
    .insert({
      title: routine.title,
      description: routine.description,
      exercises: routine.exercises,
    })
    .select()
    .single();

  if (error) {
    console.error('Save routine error:', error);
    return NextResponse.json({ error: 'Could not save routine' }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PATCH /api/routines - Create or update one of the caller's routines by id.
// The browser picks the id, so repeated autosaves can't create duplicates.
export async function PATCH(req: Request) {
  const supabase = supabaseForRequest(req);
  if (!supabase) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const { id, title, description, exercises } = await req.json();

  const { error } = await supabase
    .from('routines')
    .upsert({ id, title, description, exercises });

  if (error) {
    console.error('Update routine error:', error);
    return NextResponse.json({ error: 'Could not update routine' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/routines - Delete one of the caller's routines. Logged sets are kept.
export async function DELETE(req: Request) {
  const supabase = supabaseForRequest(req);
  if (!supabase) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const { id } = await req.json();

  const { error } = await supabase.from('routines').delete().eq('id', id);

  if (error) {
    console.error('Delete routine error:', error);
    return NextResponse.json({ error: 'Could not delete routine' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
