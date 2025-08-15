export type NewsItem = { title: string; summary?: string; url: string; source?: string; createdAt?: string };

const STOP = new Set(['the','a','an','and','or','but','if','then','else','of','in','on','for','to','from','by','with','is','are','was','were','be','been','being','at','as','it','that','this','these','those','we','you','they','he','she','i','will','would','can','could','should','may','might','do','does','did']);

function normalize(s: string) {
  return s.replace(/https?:\/\/\S+/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/[^\w\s\.\!\?]/g, ' ').replace(/\s+/g, ' ').trim();
}
function sentences(text: string): string[] {
  return normalize(text).split(/(?<=[\.\!\?])\s+(?=[A-Z0-9])/).map(s=>s.trim()).filter(Boolean);
}
function scoreSentences(sents: string[]) {
  const freq = new Map<string, number>();
  for (const s of sents) for (const w of s.toLowerCase().split(/\W+/)) if (w && !STOP.has(w) && w.length>2) freq.set(w,(freq.get(w)||0)+1);
  const max = Math.max(1, ...freq.values());
  const norm = new Map([...freq].map(([k,v])=>[k, v/max]));
  return sents.map(sent => {
    let score = 0, len = sent.split(/\s+/).length;
    for (const w of sent.toLowerCase().split(/\W+/)) if (w && !STOP.has(w)) score += norm.get(w)||0;
    if (len>8 && len<40) score *= 1.1;
    return { sent, score };
  }).sort((a,b)=>b.score-a.score);
}
export function summarizeItems(items: NewsItem[], maxBullets=4) {
  const blobs = items.map(i => [i.title, i.summary||''].join('. ')).join(' ');
  const sents = sentences(blobs);
  if (!sents.length) return { summary: '', bullets: [] as string[] };
  const seen = new Set<string>();
  const uniq = sents.filter(s => { const k=s.toLowerCase().replace(/\s+/g,' ').slice(0,160); if(seen.has(k))return false; seen.add(k); return true; });
  const scored = scoreSentences(uniq);
  const bullets = scored.slice(0, Math.min(maxBullets, 6)).map(s=>s.sent);
  const summary = scored.slice(0,3).map(s=>s.sent).join(' ');
  return { summary, bullets };
}