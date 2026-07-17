// Renders the first page of a PDF file to a PNG blob URL, using pdf.js (runs entirely in-browser).
// This lets us feed PDF pages into the same OCR pipeline used for photos.

export async function pdfFirstPageToImage(file) {
  const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  // Render at 2x scale for better OCR accuracy on smaller text
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext('2d');

  await page.render({ canvasContext: context, viewport }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Could not render PDF page.')); return; }
      resolve(blob);
    }, 'image/png');
  });
}
