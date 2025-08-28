import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase';

export async function GET() {
  const sb = createSupabaseServer();
  const { data, error } = await sb.from('portfolios').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok:true, data });
}

export async function POST(req: Request) {
  const body = await req.json().catch(()=>null);
  if (!body || !body.name || !body.payload) return NextResponse.json({ ok:false, error:'Invalid payload' }, { status: 400 });
  const sb = createSupabaseServer();
  const { data, error } = await sb.from('portfolios').insert({ name: body.name, payload: body.payload }).select().single();
  if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok:true, data });
}
