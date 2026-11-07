import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { starterPresets } from '@/lib/mockData';

// GET /api/routines - Fetch saved routines from Supabase
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      // Fallback to starter presets if database is empty or offline
      return NextResponse.json(starterPresets);
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(starterPresets);
  }
}

// POST /api/routines - Save a new routine into Supabase
export async function POST(req: Request) {
  try {
    const routine = await req.json();

    const { data, error } = await supabase
      .from('routines')
      .insert([{
        title: routine.title,
        description: routine.description,
        exercises: routine.exercises
      }])
      .select();

    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
