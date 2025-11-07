import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href;

interface ProcessedDocument {
  extractedText: string;
  imageOcrText: string;
  combinedText: string;
}

export const processPdfDocument = async (
  file: File,
  onProgress?: (message: string) => void
): Promise<ProcessedDocument> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let extractedText = '';
  let imageOcrText = '';
  
  // Aumentar limite para 20 páginas
  const numPages = Math.min(pdf.numPages, 50);
  
  // Criar worker UMA VEZ (só se houver páginas com imagens)
  let ocrWorker: Awaited<ReturnType<typeof createWorker>> | null = null;
  let hasImages = false;
  
  // Primeiro, verificar se alguma página tem imagens
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const operatorList = await page.getOperatorList();
    
    for (let j = 0; j < operatorList.fnArray.length; j++) {
      if (operatorList.fnArray[j] === pdfjsLib.OPS.paintImageXObject) {
        hasImages = true;
        break;
      }
    }
    if (hasImages) break;
  }
  
  // Criar worker apenas se houver imagens
  if (hasImages) {
    ocrWorker = await createWorker('por', 1);
  }
  
  // Processar páginas
  for (let i = 1; i <= numPages; i++) {
    onProgress?.(`Processando página ${i} de ${numPages}...`);
    await new Promise(resolve => setTimeout(resolve, 100));
    const page = await pdf.getPage(i);
    
    // Extract text directly from PDF
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    
    if (pageText.trim()) {
      extractedText += `\n--- Página ${i} (Texto) ---\n${pageText}\n`;
    }
    
    // Extract embedded images and do OCR
    const operatorList = await page.getOperatorList();
    const imageIndices: number[] = [];
    
    for (let j = 0; j < operatorList.fnArray.length; j++) {
      if (operatorList.fnArray[j] === pdfjsLib.OPS.paintImageXObject) {
        imageIndices.push(j);
      }
    }
    
    // Fazer OCR se tiver imagens E worker estiver pronto
    if (imageIndices.length > 0 && ocrWorker) {
      onProgress?.(`Fazendo OCR da página ${i}...`);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Render page to canvas to extract images
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport,
        } as any).promise;
        
        // Convert to blob for OCR
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/png');
        });
        
        // Reutilizar o mesmo worker
        const { data: { text } } = await ocrWorker.recognize(blob);
        
        if (text.trim()) {
          imageOcrText += `\n--- Página ${i} (OCR de Imagens) ---\n${text}\n`;
        }
      }
    }
  }
  
  // Terminar worker apenas no final
  if (ocrWorker) {
    await ocrWorker.terminate();
  }
  
  const combinedText = extractedText + '\n\n' + imageOcrText;
  
  return {
    extractedText,
    imageOcrText,
    combinedText
  };
};

export const processImageDocument = async (file: File): Promise<ProcessedDocument> => {
  const worker = await createWorker('por', 1);
  
  const { data: { text } } = await worker.recognize(file);
  await worker.terminate();
  
  return {
    extractedText: '',
    imageOcrText: text,
    combinedText: text
  };
};
