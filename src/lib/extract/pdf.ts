import * as pdfjsLib from 'pdfjs-dist';

// Configure worker pour Vite
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString();
  } catch (e) {
    // Fallback pour production
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }
}

export async function extractPdfText(file: File): Promise<{pages:string[], hasTextLayer:boolean}> {
  console.log('[PDF] Starting extraction for:', file.name, 'Size:', file.size);
  
  try {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    
    console.log('[PDF] Document loaded, pages:', pdf.numPages);
    
    const texts: string[] = [];
    let textCount = 0;

    for (let i=1; i<=pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((it:any) => ('str' in it ? it.str : '')).join(' ');
      texts.push(pageText);
      if (pageText.trim().length > 5) textCount++;
    }
    
    console.log('[PDF] Extraction done. Text layer:', textCount > 0, 'Total chars:', texts.join('').length);
    
    return { pages: texts, hasTextLayer: textCount > 0 };
  } catch (error: any) {
    console.error('[PDF] Extraction failed:', error);
    throw new Error(`Erreur lecture PDF: ${error.message}`);
  }
}
