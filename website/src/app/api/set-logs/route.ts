import { NextResponse } from 'next/server';
import { supabaseForRequest } from '@/lib/supabase';

const UNAUTHORIZED = { error: 'Not signed in' };

// GET /api/set-logs - The caller's most recent sets, newest first
export async function GET(req: Request) {
  const supabase = supabaseForRequest(req);
  if (!supabase) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const { data, error } = await supabase
    .from('set_logs')
    .select('session_id, routine_id, exercise_name, set_index, reps, weight, unit, completed_at')
    .order('completed_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Load sets error:', error);
    return NextResponse.json({ error: 'Could not load workout history' }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/set-logs - Record a completed set. Retrying the same set is safe.
export async function POST(req: Request) {
  const supabase = supabaseForRequest(req);
  if (!supabase) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const log = await req.json();

  const { error } = await supabase.from('set_logs').upsert(
    {
      session_id: log.session_id,
      routine_id: log.routine_id,
      exercise_name: log.exercise_name,
      set_index: log.set_index,
      reps: log.reps,
      weight: log.weight,
      unit: log.unit,
    },
    { onConflict: 'session_id,exercise_name,set_index' }
  );

  if (error) {
    console.error('Log set error:', error);
    return NextResponse.json({ error: 'Could not save set' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/set-logs - Undo a completed set
export async function DELETE(req: Request) {
  const supabase = supabaseForRequest(req);
  if (!supabase) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const { session_id, exercise_name, set_index } = await req.json();

  const { error } = await supabase
    .from('set_logs')
    .delete()
    .match({ session_id, exercise_name, set_index });

  if (error) {
    console.error('Delete set error:', error);
    return NextResponse.json({ error: 'Could not undo set' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
