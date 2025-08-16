'use client';
import { useEffect, useState } from 'react';

function labelFor(score:number){
  if (score < 20) return { label: 'Extreme Fear', color: '#f87171' };
  if (score < 40) return { label: 'Fear',         color: '#f59e0b' };
  if (score < 60) return { label: 'Neutral',      color: '#a1a1aa' };
  if (score < 80) return { label: 'Greed',        color: '#34d399' };
  return                 { label: 'Extreme Greed',color: '#10b981' };
}

/** Simple half-circle gauge (0..100) with needle */
export default function MoodGauge({ className='' }: { className?: string }) {
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch('/api/mood', { cache: 'no-store' });
      const j = await res.json();
      if (alive) setScore(Math.max(0, Math.min(100, Number(j?.score)||0)));
    })();
    const id = setInterval(() => {
      fetch('/api/mood', { cache: 'no-store' }).then(r=>r.json()).then(j=>{
        setScore(Math.max(0, Math.min(100, Number(j?.score)||0)));
      }).catch(()=>{});
    }, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const s = score ?? 50;
  const { label, color } = labelFor(s);
  const angle = (s/100)*180 - 90; // −90..+90
  const needleX = 120 + 100 * Math.cos(angle * Math.PI/180);
  const needleY = 120 + 100 * Math.sin(angle * Math.PI/180);

  return (
    <div className={className}>
      <div className="rounded-xl border border-zinc-800/70 p-4 bg-gradient-to-b from-zinc-900/60 to-zinc-950/70">
        <div className="text-sm text-zinc-300 mb-2">Market Mood Index</div>
        <svg viewBox="0 0 240 140" className="w-full">
          {/* arcs */}
          <defs>
            <linearGradient id="mmigrad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%"  stopColor="#ef4444"/>
              <stop offset="25%" stopColor="#f59e0b"/>
              <stop offset="50%" stopColor="#a1a1aa"/>
              <stop offset="75%" stopColor="#34d399"/>
              <stop offset="100%" stopColor="#10b981"/>
            </linearGradient>
          </defs>
          <path d="M20,120 A100,100 0 0 1 220,120" fill="none" stroke="url(#mmigrad)" strokeWidth="18" strokeLinecap="round"/>
          {/* ticks */}
          {Array.from({length:11}).map((_,i)=>{
            const t = i/10; const ang = t*180 - 90;
            const x1 = 120 + 92 * Math.cos(ang*Math.PI/180);
            const y1 = 120 + 92 * Math.sin(ang*Math.PI/180);
            const x2 = 120 + 82 * Math.cos(ang*Math.PI/180);
            const y2 = 120 + 82 * Math.sin(ang*Math.PI/180);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3f3f46" strokeWidth="2"/>;
          })}
          {/* needle */}
          <circle cx="120" cy="120" r="5" fill="#71717a"/>
          <line x1="120" y1="120" x2={needleX} y2={needleY} stroke={color} strokeWidth="4" />
        </svg>
        <div className="mt-2 flex items-baseline justify-between">
          <div className="text-3xl font-semibold tabular-nums text-zinc-100">{s}</div>
          <div className="text-sm" style={{ color }}>{label}</div>
        </div>
        <div className="text-xs text-zinc-500 mt-1">Updates every minute • SPY trend, realized vol, and breadth</div>
      </div>
    </div>
  );
}