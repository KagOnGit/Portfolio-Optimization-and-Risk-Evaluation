/** Produce a random long/short weight vector satisfying sum=1 and bounds [min,max] per asset.
 * If min>=0, it's long-only. Provide arrays same length as n.
 */
export function sampleWeightsWithBounds(mins:number[], maxs:number[]): number[] {
  const n = mins.length;
  // Start at lower bounds
  let w = mins.slice();
  let remaining = 1 - w.reduce((a,b)=>a+b,0);
  if (remaining < -1e-9) {
    // infeasible
    const msg = 'Bounds infeasible: sum(mins) > 1';
    console.warn(msg);
    // fall back to normalized mins
    const s = w.reduce((a,b)=>a+b,0) || 1;
    return w.map(x=>x/s);
  }
  // Capacities above mins up to max
  const caps = maxs.map((M,i)=>Math.max(0, M - mins[i]));
  const capSum = caps.reduce((a,b)=>a+b,0);
  if (remaining > capSum + 1e-9) {
    // infeasible (cannot reach sum=1 within maxs)
    const s = maxs.reduce((a,b)=>a+b,0) || 1;
    return maxs.map(x=>x/s);
  }
  // Dirichlet-ish allocation into capacities
  if (remaining > 0) {
    const x = Array.from({length:n},()=>Math.random());
    const xs = x.reduce((a,b)=>a+b,0) || 1;
    const share = x.map(v=>v/xs);
    // initial allocate
    let add = share.map((sh,i)=>Math.min(caps[i], sh*remaining));
    // fix overflow & underfill iteratively
    let iter=0;
    while (Math.abs(add.reduce((a,b)=>a+b,0) - remaining) > 1e-9 && iter++ < 10*n) {
      const cur = add.reduce((a,b)=>a+b,0);
      const delta = remaining - cur;
      if (Math.abs(delta) < 1e-9) break;
      const room = add.map((ai,i)=> Math.max(0, caps[i]-ai));
      const roomSum = room.reduce((a,b)=>a+b,0);
      if (roomSum === 0) break;
      const rshare = room.map(r=>r/(roomSum||1));
      add = add.map((ai,i)=>ai + rshare[i]*delta);
      // clamp
      add = add.map((ai,i)=>Math.min(caps[i], Math.max(0, ai)));
    }
    w = w.map((wi,i)=>wi + add[i]);
  }
  // tiny numerical cleanup
  const sum = w.reduce((a,b)=>a+b,0) || 1;
  return w.map(v=>v/sum);
}
