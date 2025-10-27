import { createWorker, PSM, OEM } from 'tesseract.js';

type OcrOpts = { psm?: PSM; oem?: OEM; lang?: string; timeout?: number };

async function ocrOnce(image: Blob, opts: OcrOpts): Promise<string> {
  console.log('[OCR] Starting with PSM:', opts.psm, 'OEM:', opts.oem, 'Timeout:', opts.timeout);
  
  const controller = new AbortController();
  let timeoutId: number | undefined;
  
  if (opts.timeout) {
    timeoutId = window.setTimeout(() => {
      console.warn('[OCR] Timeout reached, aborting...');
      controller.abort();
    }, opts.timeout);
  }
  
  try {
    const worker = await createWorker(opts.lang ?? 'fra', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    await worker.setParameters({
      tessedit_pageseg_mode: opts.psm ?? PSM.AUTO,
      tessedit_ocr_engine_mode: opts.oem ?? OEM.LSTM_ONLY,
    });
    
    const { data } = await worker.recognize(image);
    await worker.terminate();
    
    if (timeoutId) clearTimeout(timeoutId);
    
    console.log('[OCR] Done. Length:', data.text.length, 'Confidence:', data.confidence);
    
    return data.text || '';
  } catch (error: any) {
    if (timeoutId) clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error('[OCR] Aborted due to timeout');
    } else {
      console.error('[OCR] Failed:', error);
    }
    return '';
  }
}

export async function multiPassOCR(images: Blob[]): Promise<string[]> {
  console.log('[OCR] Starting for', images.length, 'images');
  
  // Passes optimisées pour factures/AO
  const passes: OcrOpts[] = [
    { psm: PSM.AUTO, oem: OEM.LSTM_ONLY, lang: 'fra', timeout: 30000 },        // Auto intelligent
    { psm: PSM.SINGLE_COLUMN, oem: OEM.LSTM_ONLY, lang: 'fra', timeout: 25000 }, // Colonne (factures)
    { psm: PSM.SINGLE_BLOCK, oem: OEM.LSTM_ONLY, lang: 'fra', timeout: 20000 },  // Bloc unique
  ];
  
  const results: string[] = [];
  
  for (let imgIndex = 0; imgIndex < images.length; imgIndex++) {
    const img = images[imgIndex];
    console.log(`[OCR] Processing ${imgIndex + 1}/${images.length}`);
    
    let best = ''; 
    let bestScore = 0;
    
    for (const p of passes) {
      const t = await ocrOnce(img, p);
      const alphanum = (t.match(/[A-Za-z0-9]/g)?.length ?? 0);
      const score = alphanum / Math.max(1, t.length);
      
      console.log(`[OCR] PSM:${p.psm} -> ${alphanum} chars, score: ${(score * 100).toFixed(1)}%`);
      
      if (score > bestScore) { 
        best = t; 
        bestScore = score; 
      }
      
      // Early exit à 60% (baissé de 70%)
      if (bestScore >= 0.6) {
        console.log('[OCR] Early exit - good quality');
        break;
      }
    }
    
    results.push(best);
    console.log(`[OCR] Best: ${best.length} chars, score: ${(bestScore * 100).toFixed(1)}%`);
  }
  
  return results;
}
