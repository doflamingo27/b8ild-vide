import { extractPdfText } from './pdf';
import { multiPassOCR } from './ocr';
import { normalizeNumberFR, normalizeDateFR, checkTotals, scoreConfidence } from './normalize';
import { R } from './regexFR';
import type { ExtractionResult, DocType } from './types';

function classifyDoc(text: string): DocType {
  const s = text.toLowerCase();
  if (/appel d'offres|appel d'offres|ao|dce|date limite|acheteur|procédure/.test(s)) return 'ao';
  if (/facture|invoice|net à payer|n° facture|n o facture|n°facture/.test(s)) return 'invoice';
  if (/(qte|quantité|prix unitaire|total)/i.test(s)) return 'table';
  return 'unknown';
}

export async function extractFromFile(file: File): Promise<ExtractionResult> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  let pagesText: string[] = [];
  let hasText = false;
  const debug: any = { steps: [] };

  if (isPdf) {
    const pdf = await extractPdfText(file);
    pagesText = pdf.pages;
    hasText = pdf.hasTextLayer;
    debug.steps.push({ step:'pdfText', hasText });
  }

  if (!hasText) {
    // OCR sur image ou PDF scanné
    const imgBlob = new Blob([await file.arrayBuffer()], { type: file.type || 'image/png' });
    const texts = await multiPassOCR([imgBlob]);
    pagesText = texts;
    debug.steps.push({ step:'ocr', pages: texts.length });
  }

  const allText = pagesText.join('\n');
  const type = classifyDoc(allText);
  const candidates: Record<string, any> = {};
  let base = 0.5;

  // Totaux facture
  const ht = allText.match(R.HT)?.[1] ? normalizeNumberFR(allText.match(R.HT)![1]) : null;
  const ttc = allText.match(R.TTC)?.[1] ? normalizeNumberFR(allText.match(R.TTC)![1]) : null;
  const net = allText.match(R.NET)?.[1] ? normalizeNumberFR(allText.match(R.NET)![1]) : null;

  const tvaPctRaw = allText.match(R.TVA_PCT)?.[1];
  const tvaPct = tvaPctRaw ? normalizeNumberFR(tvaPctRaw) : null;
  const tvaAmtRaw = allText.match(R.TVA_AMT)?.[1];
  const tvaAmt = tvaAmtRaw ? normalizeNumberFR(tvaAmtRaw) : null;

  const siret = allText.match(R.SIRET)?.[0] ?? null;
  const siren = !siret ? (allText.match(R.SIREN)?.[0] ?? null) : null;

  const numMatch = allText.match(R.NUM_FACT);
  const numFacture = numMatch ? numMatch[2]?.trim() : null;

  const dateMatch = [...allText.matchAll(R.DATE)].map(m=>m[1])[0] ?? null;
  const dateDoc = normalizeDateFR(dateMatch);

  const eur = R.EUR.test(allText);

  const totalsOk = checkTotals(ht, tvaPct, tvaAmt, net ?? ttc ?? null);

  // AO
  let aoDeadline = normalizeDateFR(allText.match(R.AO_DEADLINE)?.[1] ?? null);
  const aoBudget = normalizeNumberFR(allText.match(R.AO_BUDGET)?.[3] ?? null);
  const aoRef = allText.match(R.AO_REF)?.[2] ?? null;

  // Ville + CP
  let aoCP: string|null = null; let aoVille: string|null = null;
  const cps = [...allText.matchAll(R.AO_CP)].map(m=>m[0]);
  if (cps.length) {
    aoCP = cps[0];
    // naïf: prendre 1-2 mots voisins autour du CP
    const idx = allText.indexOf(aoCP);
    const slice = allText.slice(Math.max(0, idx-40), idx);
    const tokens = slice.trim().split(/\s+/);
    aoVille = tokens.slice(-2).join(' ').replace(/[^\p{L}\-]/gu,'').toUpperCase() || null;
  }

  const aoOrga = allText.match(R.AO_ORGA)?.[2]?.trim() ?? null;

  const confidence = scoreConfidence(base, {
    totalsOk,
    hasSiret: !!siret,
    hasDate: !!dateDoc || !!aoDeadline,
    eur,
  });

  const result: ExtractionResult = {
    type,
    rawText: pagesText,
    fields: { 
      ht, tvaPct, tvaAmt, ttc, net, siret, siren, numFacture, dateDoc, 
      currency: eur?'EUR':'OTHER',
      aoDeadline, aoBudget, aoRef, aoOrga, aoCP, aoVille 
    },
    confidence,
    candidates,
    debug
  };
  return result;
}
