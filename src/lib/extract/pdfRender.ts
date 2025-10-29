import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

export async function renderPdfPageToBlob(file: File, pageNum: number): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const page = await pdf.getPage(pageNum);
  
  const viewport = page.getViewport({ scale: 2.0 }); // Haute résolution pour OCR
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

export async function renderAllPdfPagesToBlobs(file: File): Promise<Blob[]> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  
  const blobs: Blob[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const blob = await renderPdfPageToBlob(file, p);
    blobs.push(blob);
  }
  
  return blobs;
}
