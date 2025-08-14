import { NextResponse } from 'next/server';
import { sharpe, sortino, histVaR, histCVaR } from '@/lib/math';

export async function GET() {
  const returns = [0.002, -0.001, 0.003, 0.001, -0.002, 0.0025, 0.0015, -0.0005];
  const metrics = {
    sharpe: +sharpe(returns).toFixed(3),
    sortino: +sortino(returns).toFixed(3),
    var: +histVaR(returns, 0.95).toFixed(4),
    cvar: +histCVaR(returns, 0.95).toFixed(4),
    max_drawdown: 0.03
  };
  return NextResponse.json(metrics);
}
