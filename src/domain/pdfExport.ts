/**
 * PDF Generation & Export Service
 * Multi-page PDF generation using 'jspdf' converting document pages (using processedImage and originalImage)
 */

import { jsPDF } from 'jspdf';
import { DocumentEntity, PageEntity } from './models';

export interface PdfExportOptions {
  pageSize: 'a4' | 'letter' | 'fit';
  orientation: 'portrait' | 'landscape' | 'auto';
  quality: 'high' | 'medium' | 'compressed';
  imageSource: 'processed' | 'original' | 'both';
  showPageNumbers: boolean;
  watermark: boolean;
  documentTitle?: string;
}

const DEFAULT_OPTIONS: PdfExportOptions = {
  pageSize: 'a4',
  orientation: 'portrait',
  quality: 'high',
  imageSource: 'processed',
  showPageNumbers: true,
  watermark: false,
};

/**
 * Loads dimensions for an image data URL
 */
function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    img.onerror = () => resolve({ width: 800, height: 1100 });
    img.src = dataUrl;
  });
}

/**
 * Converts document pages (using processedImage and originalImage) into a multi-page PDF
 */
export async function generateDocumentPdf(
  doc: DocumentEntity,
  options: Partial<PdfExportOptions> = {}
): Promise<{ blob: Blob; url: string; filename: string }> {
  if (!doc.pages || doc.pages.length === 0) {
    throw new Error('Document has no pages to convert to PDF');
  }

  const opts: PdfExportOptions = { ...DEFAULT_OPTIONS, ...options };

  // Collect page images based on imageSource option ('processed', 'original', or 'both')
  const imagesToRender: { dataUrl: string; label?: string }[] = [];

  for (let i = 0; i < doc.pages.length; i++) {
    const page = doc.pages[i];

    if (opts.imageSource === 'original') {
      const img = page.originalImage || page.processedImage || page.croppedImage;
      imagesToRender.push({ dataUrl: img, label: `Page ${i + 1} (Original)` });
    } else if (opts.imageSource === 'both') {
      // Add both processed scan and original capture
      const proc = page.processedImage || page.croppedImage || page.originalImage;
      const orig = page.originalImage || proc;
      imagesToRender.push({ dataUrl: proc, label: `Page ${i + 1} (Enhanced)` });
      imagesToRender.push({ dataUrl: orig, label: `Page ${i + 1} (Raw Photo)` });
    } else {
      // Default: 'processed' enhanced scan
      const img = page.processedImage || page.croppedImage || page.originalImage;
      imagesToRender.push({ dataUrl: img, label: `Page ${i + 1}` });
    }
  }

  // Initialize jsPDF
  let pdf: jsPDF;

  if (opts.pageSize === 'fit') {
    const firstDims = await loadImageDimensions(imagesToRender[0].dataUrl);
    const orientation = firstDims.width > firstDims.height ? 'landscape' : 'portrait';
    pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [firstDims.width, firstDims.height],
    });
  } else {
    pdf = new jsPDF({
      orientation: opts.orientation === 'landscape' ? 'landscape' : 'portrait',
      unit: 'mm',
      format: opts.pageSize === 'letter' ? 'letter' : 'a4',
    });
  }

  const totalPages = imagesToRender.length;

  for (let i = 0; i < totalPages; i++) {
    const item = imagesToRender[i];

    if (i > 0) {
      if (opts.pageSize === 'fit') {
        const pageDims = await loadImageDimensions(item.dataUrl);
        const pageOrient = pageDims.width > pageDims.height ? 'landscape' : 'portrait';
        pdf.addPage([pageDims.width, pageDims.height], pageOrient);
      } else {
        pdf.addPage(
          opts.pageSize === 'letter' ? 'letter' : 'a4',
          opts.orientation === 'landscape' ? 'landscape' : 'portrait'
        );
      }
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Margins
    const margin = opts.pageSize === 'fit' ? 0 : 8; // 8mm margin
    const availWidth = pageWidth - margin * 2;
    const availHeight = pageHeight - margin * 2 - (opts.showPageNumbers ? 8 : 0);

    const dims = await loadImageDimensions(item.dataUrl);
    const imgAspect = dims.width / dims.height;
    const availAspect = availWidth / availHeight;

    let drawW: number;
    let drawH: number;

    if (imgAspect > availAspect) {
      drawW = availWidth;
      drawH = availWidth / imgAspect;
    } else {
      drawH = availHeight;
      drawW = availHeight * imgAspect;
    }

    // Center image on the page
    const posX = margin + (availWidth - drawW) / 2;
    const posY = margin + (availHeight - drawH) / 2;

    // Add Image to PDF page
    pdf.addImage(item.dataUrl, 'JPEG', posX, posY, drawW, drawH, undefined, 'FAST');

    // Page Number & Label Footer
    if (opts.showPageNumbers && opts.pageSize !== 'fit') {
      pdf.setFontSize(9);
      pdf.setTextColor(140, 140, 140);
      const footerText = item.label || `Page ${i + 1} of ${totalPages}`;
      pdf.text(footerText, pageWidth / 2, pageHeight - 4, { align: 'center' });
    }

    // Optional Watermark
    if (opts.watermark && opts.pageSize !== 'fit') {
      pdf.setFontSize(8);
      pdf.setTextColor(180, 180, 180);
      pdf.text('Scanned with CamScan Mobile', margin, pageHeight - 4);
    }
  }

  const safeTitle = (opts.documentTitle || doc.title || 'Scanned_Document')
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
    .substring(0, 40);
  const filename = `${safeTitle}.pdf`;

  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);

  return { blob, url, filename };
}

/**
 * Convenience method to generate and trigger direct download of a document's multi-page PDF
 */
export async function downloadDocumentPdf(
  doc: DocumentEntity,
  options: Partial<PdfExportOptions> = {}
): Promise<string> {
  const { url, filename } = await generateDocumentPdf(doc, options);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
  return filename;
}
