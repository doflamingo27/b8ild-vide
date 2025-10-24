import Tesseract from 'tesseract.js';

type OcrOpts = { psm?: number; oem?: number; lang?: string; };

async function ocrOnce(image: Blob, opts: OcrOpts) {
  const { data } = await Tesseract.recognize(image, opts.lang ?? 'fra');
  return data.text || '';
}

export async function multiPassOCR(images: Blob[]): Promise<string[]> {
  const passes: OcrOpts[] = [
    { psm:6, oem:3, lang:'fra' },
    { psm:4, oem:3, lang:'fra' },
    { psm:11,oem:3, lang:'fra' },
    { psm:1, oem:3, lang:'fra' },
  ];
  const results: string[] = [];
  for (const img of images) {
    let best = ''; let bestScore = 0;
    for (const p of passes) {
      const t = await ocrOnce(img, p);
      const score = (t.match(/[A-Za-z0-9]/g)?.length ?? 0) / Math.max(1,t.length);
      if (score > bestScore) { best = t; bestScore = score; }
      if (bestScore >= 0.7) break;
    }
    results.push(best);
  }
  return results;
}
