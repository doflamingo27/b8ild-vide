export function normalizeNumberFR(raw?: string | null): number | null {
  if (!raw) return null;
  
  const originalRaw = raw;
  
  // ✅ Supprimer TOUS les types d'espaces Unicode + sauts de ligne + €
  let s = String(raw)
    .replace(/[\s\u00A0\u202F\u2009\n\r\t]/g, '') // Espaces classiques, insécables, sauts de ligne, tabs
    .replace(/€/g, '')
    .trim();
  
  console.log(`[normalizeNumberFR] Input: "${originalRaw}" → After space removal: "${s}"`);
  
  // ✅ Supprimer séparateurs de milliers (point) et convertir virgule décimale
  s = s
    .replace(/\./g, '')  // Supprimer tous les points (séparateurs de milliers)
    .replace(/,/g, '.');  // Virgule décimale → point
  
  // Garder chiffres, signe, point
  s = s.replace(/[^0-9\.\-]/g, '');
  if (!s || s === '-' || s === '.' || s === '-.') {
    console.log(`[normalizeNumberFR] Input: "${originalRaw}" → Rejected (empty after cleaning)`);
    return null;
  }
  
  let n = Number(s);
  if (!Number.isFinite(n)) {
    console.log(`[normalizeNumberFR] Input: "${originalRaw}" → Rejected (not finite)`);
    return null;
  }
  
  // Bornes sûres
  if (Math.abs(n) > 999999999999.99) {
    console.log(`[normalizeNumberFR] Input: "${originalRaw}" → Rejected (out of bounds)`);
    return null;
  }
  
  // ✅ Arrondi systématique à 2 décimales
  const rounded = Math.round(n * 100) / 100;
  
  console.log(`[normalizeNumberFR] Input: "${originalRaw}" → Cleaned: "${s}" → Parsed: ${n} → Rounded: ${rounded}`);
  
  return rounded;
}

export function normalizePercentFR(raw?: string | null): number | null {
  const n = normalizeNumberFR(raw);
  if (n == null) return null;
  
  // Si < 1, considérer que c'était un ratio → ramener en %
  const pct = n < 1 ? n * 100 : n;
  
  return Math.max(0, Math.min(100, Math.round(pct * 100) / 100));
}

export function normalizeDateFR(raw?: string | null): string | null {
  if (!raw) return null;
  
  const s = String(raw).trim();
  const m = s.match(/([0-3]?\d)[\/\-\. ]([01]?\d)[\/\-\. ](\d{2,4})/);
  
  if (m) {
    const d = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    let y = m[3];
    
    if (y.length === 2) {
      y = (Number(y) >= 80 ? '19' + y : '20' + y);
    }
    
    return `${y}-${mo}-${d}`;
  }
  
  return null;
}

export function checkTotals(
  ht?: number | null,
  tvaPct?: number | null,
  tvaAmt?: number | null,
  ttc?: number | null
): boolean {
  if (ht != null && ttc != null) {
    if (tvaPct != null) {
      const expected = ht * (1 + tvaPct / 100);
      return Math.abs((ttc - expected) / Math.max(1, expected)) <= 0.02;
    }
    if (tvaAmt != null) {
      const expected = ht + tvaAmt;
      return Math.abs((ttc - expected) / Math.max(1, expected)) <= 0.02;
    }
  }
  return false;
}

export function scoreConfidence(
  base: number,
  flags: {
    totalsOk?: boolean;
    hasSiret?: boolean;
    hasDate?: boolean;
    hasEuro?: boolean;
  }
): number {
  let s = base;
  if (flags.totalsOk) s += 0.25;
  if (flags.hasSiret) s += 0.10;
  if (flags.hasDate) s += 0.05;
  if (flags.hasEuro) s += 0.05;
  return Math.max(0, Math.min(1, s));
}
