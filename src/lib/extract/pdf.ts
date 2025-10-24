import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export async function extractPdfText(file: File): Promise<{pages:string[], hasTextLayer:boolean}> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const texts: string[] = [];
  let textCount = 0;

  for (let i=1; i<=pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((it:any) => ('str' in it ? it.str : '')).join(' ');
    texts.push(pageText);
    if (pageText.trim().length > 5) textCount++;
  }
  return { pages: texts, hasTextLayer: textCount > 0 };
}
