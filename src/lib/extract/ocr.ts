import { createWorker, PSM, OEM } from 'tesseract.js';

type OcrOpts = { psm?: PSM; oem?: OEM; lang?: string; };

async function ocrOnce(image: Blob, opts: OcrOpts): Promise<string> {
  console.log('[OCR] Starting recognition with PSM:', opts.psm, 'OEM:', opts.oem, 'Lang:', opts.lang);
  
  try {
    const worker = await createWorker(opts.lang ?? 'fra', opts.oem ?? OEM.DEFAULT, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    if (opts.psm !== undefined) {
      await worker.setParameters({
        tessedit_pageseg_mode: opts.psm,
      });
    }
    
    const { data } = await worker.recognize(image);
    await worker.terminate();
    
    console.log('[OCR] Recognition done. Text length:', data.text.length, 'Confidence:', data.confidence);
    
    return data.text || '';
  } catch (error: any) {
    console.error('[OCR] Recognition failed:', error);
    return '';
  }
}

export async function multiPassOCR(images: Blob[]): Promise<string[]> {
  console.log('[OCR] Starting multi-pass OCR for', images.length, 'images');
  
  const passes: OcrOpts[] = [
    { psm: PSM.SINGLE_BLOCK, oem: OEM.DEFAULT, lang:'fra' },
    { psm: PSM.SINGLE_COLUMN, oem: OEM.DEFAULT, lang:'fra' },
    { psm: PSM.SPARSE_TEXT, oem: OEM.DEFAULT, lang:'fra' },
    { psm: PSM.AUTO_OSD, oem: OEM.DEFAULT, lang:'fra' },
  ];
  
  const results: string[] = [];
  
  for (let imgIndex = 0; imgIndex < images.length; imgIndex++) {
    const img = images[imgIndex];
    console.log(`[OCR] Processing image ${imgIndex + 1}/${images.length}`);
    
    let best = ''; 
    let bestScore = 0;
    
    for (const p of passes) {
      const t = await ocrOnce(img, p);
      const score = (t.match(/[A-Za-z0-9]/g)?.length ?? 0) / Math.max(1, t.length);
      
      console.log(`[OCR] Pass PSM:${p.psm} Score:${(score * 100).toFixed(1)}%`);
      
      if (score > bestScore) { 
        best = t; 
        bestScore = score; 
      }
      
      if (bestScore >= 0.7) break;
    }
    
    results.push(best);
    console.log(`[OCR] Best result for image ${imgIndex + 1}: ${best.length} chars, score: ${(bestScore * 100).toFixed(1)}%`);
  }
  
  return results;
}
