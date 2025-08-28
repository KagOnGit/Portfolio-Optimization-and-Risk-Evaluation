import { pf2 } from '@/lib/format';
'use client';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { sampleWeightsWithBounds } from '@/lib/opt_constraints';
import jsPDF from 'jspdf';
import { Download } from 'lucide-react';

export default function OptimizePage() {
  const [tickers, setTickers] = useState('SPY,AGG,GLD');
  const [riskFree, setRiskFree] = useState('0.02');
  const [minW, setMinW] = useState('0');  // allow negatives for shorting
  const [maxW, setMaxW] = useState('1');

  const q = useQuery({
    queryKey: ['prices', tickers],
    queryFn: async () => {
      const symbols = tickers.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      const prices: Record<string, Record<string, number>> = {};
      
      for (const sym of symbols) {
        const res = await fetch(`/api/market/alpha?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=${sym}`);
        const data = await res.json();
        const series = data?.data?.['Monthly Adjusted Time Series'] ?? {};
        prices[sym] = Object.fromEntries(
          Object.entries(series).map(([date, v]) => [
            date,
            Number((v as Record<string, string>)['5. adjusted close']) || 0
          ])
        );
      }
      
      return { prices, symbols };
    },
    enabled: Boolean(tickers.trim())
  });

  const factors = useQuery({
    queryKey: ["factors", tickers],
    queryFn: async ()=>{
      const res = await fetch('/api/fmp/factors?symbols=' + encodeURIComponent(tickers));
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Fetch failed');
      return json as { factors: { symbol:string; name:string; sector:string; beta:number; pe:number; marketCap:number }[] };
    }
  });

  const calc = useMemo(()=>{
    if (!q.data) return null;
    const { prices, symbols } = q.data;
    const rf = Number(riskFree) || 0;
    // Frontier with bounds: sample many bounded weights and evaluate
    const n = symbols.length;
    const minVal = Number(minW);
    const maxVal = Number(maxW);
    const mins = Array.from({length:n},()=>minVal);
    const maxs = Array.from({length:n},()=>maxVal);
    // generate a bunch of feasible weights
    const extra:number = 3000;
    const frontier = [];
    let best = { risk: Infinity, ret: -Infinity, weights: {} as Record<string,number>, sharpe: -Infinity };
    function pctReturns(series:number[]){const r:number[]=[];for(let i=1;i<series.length;i++) r.push((series[i]-series[i-1])/series[i-1]); return r;}
    function mean(v:number[]){return v.length? v.reduce((a,b)=>a+b,0)/v.length:0;}
    const dates = Object.keys(prices[symbols[0]]).sort();
    const P = symbols.map(sym => dates.map(d=>prices[sym][d]).filter(v=>v>0));
    const L = Math.min(...P.map(a=>a.length));
    const R = P.map(p=>pctReturns(p.slice(-L)));
    const T = Math.min(...R.map(r=>r.length));
    const Rt = R.map(r=>r.slice(-T));
    const mu = Rt.map(mean);
    const C = (function covMatrix(cols:number[][]){
      const n=cols.length, m=cols[0]?.length||0;
      const means=cols.map(c=>mean(c));
      const C=Array.from({length:n},()=>Array(n).fill(0));
      for(let i=0;i<n;i++) for(let j=i;j<n;j++){
        let c=0; for(let t=0;t<m;t++) c+=(cols[i][t]-means[i])*(cols[j][t]-means[j]);
        c = m>1 ? c/(m-1): 0; C[i][j]=C[j][i]=c;
      } return C;
    })(Rt);
    function dot(a:number[],b:number[]){return a.reduce((s,ai,i)=>s+ai*b[i],0);}
    function matVec(M:number[][],v:number[]){return M.map(row=>dot(row,v));}

    for (let k=0;k<extra;k++){
      const w = sampleWeightsWithBounds(mins,maxs);
      const v = dot(w, matVec(C,w));
      const risk = Math.sqrt(Math.max(v,0));
      const ret = dot(w, mu);
      const sharpe = (ret - rf) / (risk || 1e-8);
      const weights = Object.fromEntries(symbols.map((s,i)=>[s,w[i]]));
      const pt = { risk, ret, weights, sharpe };
      frontier.push(pt);
      if (sharpe > best.sharpe) best = pt;
    }
    frontier.sort((a,b)=>a.risk-b.risk);
    return { frontier, bestSharpe: best, symbols };
  }, [q.data, riskFree, minW, maxW]);

  const downloadCSV = ()=>{
    if (!calc) return;
    const rows = [
      ['Symbol', ...calc.symbols],
      ['Weight', ...calc.symbols.map(s => (calc.bestSharpe.weights[s]*100).toFixed(2) + '%')]
    ];
    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio-weights.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = ()=>{
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(14);
    doc.text('Portfolio Optimizer Report', 40, 40);
    if (calc) {
      doc.setFontSize(11);
      doc.text('Max-Sharpe Weights:', 40, 70);
      const lines = Object.entries(calc.bestSharpe.weights).map(([k,v])=>`${k}: ${(v*100).toFixed(2)}%`);
      lines.forEach((t,i)=>doc.text(t, 60, 90 + i*16));
      doc.text(`Sharpe: ${calc.bestSharpe.sharpe.toFixed(2)}`, 40, 90 + lines.length*16 + 20);
    }
    doc.save('portfolio-report.pdf');
  };

  async function savePortfolio(){
    if (!calc) return;
    const name = prompt('Name this portfolio run (e.g., MaxSharpe SPY/AGG/GLD)');
    if (!name) return;
    const payload = { frontier: calc.frontier, best: calc.bestSharpe };
    const res = await fetch('/api/portfolios', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, payload }) });
    const j = await res.json();
    alert(j.ok ? 'Saved!' : ('Save failed: '+j.error));
  }

  const [list,setList] = useState<Array<{ id: number; name: string; created_at: string; payload: { best: Record<string, number | string> } }>>([]);
  async function loadList(){
    const r = await fetch('/api/portfolios'); const j = await r.json();
    if(j.ok) setList(j.data); else alert('Load failed: '+j.error);
  }

  return (
    <main className="grid gap-6">
      <section className="card p-5">
        <h2 className="text-xl font-semibold mb-4">Portfolio Optimizer</h2>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tickers (comma):</label>
          <input className="border rounded px-2 py-1 w-[320px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" value={tickers} onChange={e=>setTickers(e.target.value)} placeholder="SPY,AGG,GLD"/>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Risk-free (monthly):</label>
          <input className="border rounded px-2 py-1 w-28 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" value={riskFree} onChange={e=>setRiskFree(e.target.value)} />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Min weight:</label>
          <input className="border rounded px-2 py-1 w-24 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" value={minW} onChange={e=>setMinW(e.target.value)} />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max weight:</label>
          <input className="border rounded px-2 py-1 w-24 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" value={maxW} onChange={e=>setMaxW(e.target.value)} />
          <button onClick={downloadCSV} className="border rounded px-3 py-1 ml-auto flex items-center gap-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Download className="w-4 h-4"/> CSV
          </button>
        </div>
        
        {q.isLoading && <p className="muted">Loading price data...</p>}
        {q.error && <p className="text-red-500">Error: {String(q.error)}</p>}
        
        {calc && (
          <div className="grid gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Efficient Frontier</h3>
              <div className="h-[24rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart data={calc.frontier}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="risk" tick={{ fill: "currentColor", fontSize: 12 }} tickFormatter={(v)=>pf2.format(v)} label={{ value: "Risk (σ)", position: "insideBottom", offset: -6 }} />
                    <YAxis dataKey="ret" tick={{ fill: "currentColor", fontSize: 12 }} tickFormatter={(v)=>pf2.format(v)} label={{ value: "Return (μ)", angle: -90, position: "insideLeft" }} />
                    <Tooltip 
                      formatter={(value, name) => [
                        typeof value === 'number' ? value.toFixed(4) : value, 
                        name === 'ret' ? 'Return' : name === 'risk' ? 'Risk' : name
                      ]}
                    />
                    <Scatter dataKey="ret" fill="#8884d8" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Max Sharpe Portfolio</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm muted">Sharpe Ratio</span>
                  <p className="font-semibold">{calc.bestSharpe.sharpe.toFixed(3)}</p>
                </div>
                <div>
                  <span className="text-sm muted">Return</span>
                  <p className="font-semibold">{(calc.bestSharpe.ret*100).toFixed(2)}%</p>
                </div>
                <div>
                  <span className="text-sm muted">Risk</span>
                  <p className="font-semibold">{(calc.bestSharpe.risk*100).toFixed(2)}%</p>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Weights</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(calc.bestSharpe.weights).map(([symbol, weight]) => (
                    <div key={symbol} className="flex justify-between border rounded px-2 py-1">
                      <span className="font-medium">{symbol}</span>
                      <span>{(weight * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button onClick={downloadCSV} className="border rounded px-3 py-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"><Download className="w-4 h-4 inline mr-1"/> CSV</button>
              <button onClick={exportPDF} className="border rounded px-3 py-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">PDF</button>
              <button onClick={savePortfolio} className="border rounded px-3 py-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">Save Portfolio</button>
              <button onClick={loadList} className="border rounded px-3 py-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">Load List</button>
            </div>
          </div>
        )}
      </section>

      <section className="card p-5">
        <h3 className="text-lg font-semibold mb-3">Factors (FMP)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left muted">
              <tr><th className="py-2 pr-4">Symbol</th><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Sector</th><th className="py-2 pr-4">Beta</th><th className="py-2 pr-4">P/E</th><th className="py-2">Mkt Cap</th></tr>
            </thead>
            <tbody>
              {(factors.data?.factors||[]).map((r)=>(
                <tr key={r.symbol} className="border-t">
                  <td className="py-2 pr-4 font-medium">{r.symbol}</td>
                  <td className="py-2 pr-4">{r.name}</td>
                  <td className="py-2 pr-4">{r.sector}</td>
                  <td className="py-2 pr-4">{Number.isFinite(r.beta)? r.beta.toFixed(2): '—'}</td>
                  <td className="py-2 pr-4">{Number.isFinite(r.pe)? r.pe.toFixed(2): '—'}</td>
                  <td className="py-2">{r.marketCap? Intl.NumberFormat().format(r.marketCap): '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-5">
        <h3 className="text-lg font-semibold mb-3">Saved Portfolios</h3>
        <ul className="text-sm space-y-1">
          {list.map((r)=> (<li key={r.id}><b>{r.name}</b> — {new Date(r.created_at).toLocaleString()} (<a className="underline" href="#" onClick={e=>{e.preventDefault(); alert(JSON.stringify(r.payload.best, null, 2));}}>view best</a>)</li>))}
        </ul>
      </section>
    </main>
  );
}
