import { createScheduler, createWorker, PSM } from 'tesseract.js';
import type { Scheduler, Worker } from 'tesseract.js';

const CORE = '/tesseract/tesseract-core.wasm.js';
const WORKER = '/tesseract/worker.min.js';
const LANG_PATH = '/tesseract/lang';

let scheduler: Scheduler | null = null;

async function init(workers = 2): Promise<Scheduler> {
  if (scheduler) return scheduler;
  
  console.log('[OCR] Initializing local Tesseract with', workers, 'workers');
  scheduler = createScheduler();
  
  for (let i = 0; i < workers; i++) {
    const w: Worker = await createWorker('fra', 1, {
      corePath: CORE,
      workerPath: WORKER,
      langPath: LANG_PATH,
      gzip: true,
    } as any);
    
    await (w as any).setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzàâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ0123456789€.,:/- ',
      tessedit_pageseg_mode: PSM.AUTO
    });
    
    scheduler.addWorker(w);
  }
  
  console.log('[OCR] Scheduler ready');
  return scheduler;
}

export async function ocrImageBlob(blob: Blob): Promise<string> {
  console.log('[OCR] Starting recognition on blob of size:', blob.size);
  
  // ✅ Créer UN SEUL worker (pas de scheduler pour simplifier)
  const worker: Worker = await createWorker('fra', 1, {
    corePath: CORE,
    workerPath: WORKER,
    langPath: LANG_PATH,
    gzip: true,
  } as any);
  
  await (worker as any).setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzàâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ0123456789€.,:/- ',
  });
  
  const passes = [
    { name: 'AUTO', psm: PSM.AUTO },                 // 3 = Auto
    { name: 'SINGLE_BLOCK', psm: PSM.SINGLE_BLOCK }, // 6 = Un bloc
    { name: 'SPARSE_TEXT', psm: PSM.SPARSE_TEXT },   // 11 = Texte épars
  ];
  
  let best = '';
  let bestScore = 0;
  
  for (const pass of passes) {
    console.log('[OCR] Trying PSM:', pass.name, '(', pass.psm, ')');
    
    try {
      // ✅ RECONFIGURER le PSM avant chaque passe
      await (worker as any).setParameters({
        tessedit_pageseg_mode: pass.psm,
      });
      
      const result: any = await (worker as any).recognize(blob);
      
      const t = result.data?.text ?? '';
      const alphanum = (t.match(/[A-Za-z0-9]/g)?.length ?? 0);
      const sc = alphanum / Math.max(1, t.length);
      
      console.log('[OCR] PSM', pass.name, '- Score:', (sc * 100).toFixed(1) + '%', 'Length:', t.length);
      
      if (sc > bestScore) {
        best = t;
        bestScore = sc;
      }
      
      // Early exit si très bonne qualité
      if (bestScore >= 0.7) {
        console.log('[OCR] Early exit - good quality');
        break;
      }
    } catch (err) {
      console.error('[OCR] Error with PSM', pass.name, ':', err);
    }
  }
  
  await (worker as any).terminate();
  
  console.log('[OCR] Best result - Score:', (bestScore * 100).toFixed(1) + '%', 'Length:', best.length);
  return best;
}
