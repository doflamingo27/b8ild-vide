export function normalizeNumberFR(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = raw
    .replace(/\u00A0/g, ' ')
    .replace(/€/g, '')
    .replace(/[^\d,.\- ]/g, '')
    .replace(/\s+/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')     // points milliers
    .replace(/,(?=\d{1,2}\b)/g, '.');  // virgule décimale
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function normalizeDateFR(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  // dd/mm/yyyy, dd-mm-yyyy
  const m = s.match(/([0-3]?\d)[\/\-]([01]?\d)[\/\-](\d{2,4})/);
  if (m) {
    const [_, d, mo, y] = m;
    const yyyy = (y.length === 2 ? '20' + y : y);
    const dd = d.padStart(2,'0');
    const mm = mo.padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

export function checkTotals(ht?: number|null, tvaPct?: number|null, tvaAmt?: number|null, ttc?: number|null) {
  let ok = false;
  if (ht != null && ttc != null && tvaPct != null) {
    const expected = ht * (1 + tvaPct/100);
    ok = Math.abs((ttc - expected) / expected) <= 0.02;
  } else if (ht != null && tvaAmt != null && ttc != null) {
    const expected = ht + tvaAmt;
    ok = Math.abs((ttc - expected)/expected) <= 0.02;
  }
  return ok;
}

export function scoreConfidence(base: number, opts: {hasSiret?:boolean; hasDate?:boolean; eur?:boolean; totalsOk?:boolean}): number {
  let s = base;
  if (opts.totalsOk) s += 0.25;
  if (opts.hasSiret) s += 0.10;
  if (opts.hasDate)  s += 0.10;
  if (opts.eur)      s += 0.10;
  return Math.min(1, Math.max(0, s));
}
