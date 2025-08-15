// app/api/fundamentals/[symbol]/route.ts
import { NextResponse } from 'next/server';
import { fetchFundamentals } from '@/lib/fundamentals';

export async function GET(_req: Request, ctx: { params: { symbol: string } }) {
  try {
    const sym = ctx?.params?.symbol?.toUpperCase?.();
    if (!sym) {
      return NextResponse.json({ error: 'symbol required' }, { status: 400 });
    }
    const data = await fetchFundamentals(sym);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fundamentals error' }, { status: 500 });
  }
}