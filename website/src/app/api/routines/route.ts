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
