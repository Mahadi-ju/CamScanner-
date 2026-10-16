/**
 * Presentation: PdfExportModal
 * Multi-page PDF compilation, page size, orientation, compression, watermark, download and native sharing
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Share2,
  X,
  Check,
  Settings,
  Sparkles,
  Layers,
  Printer,
} from 'lucide-react';
import { DocumentEntity } from '../../domain/models';
import { generateDocumentPdf, PdfExportOptions } from '../../domain/pdfExport';

interface PdfExportModalProps {
  document: DocumentEntity;
  onClose: () => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  document,
  onClose,
}) => {
  const [options, setOptions] = useState<PdfExportOptions>({
    pageSize: 'a4',
    orientation: 'portrait',
    quality: 'high',
    imageSource: 'processed',
    showPageNumbers: true,
    watermark: false,
    documentTitle: document.title,
  });

  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [filename, setFilename] = useState<string>('document.pdf');
  const [canShare, setCanShare] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanShare(true);
    }
  }, []);

  const buildPdf = async () => {
    setIsGenerating(true);
    try {
      const res = await generateDocumentPdf(document, options);
      setPdfUrl(res.url);
      setPdfBlob(res.blob);
      setFilename(res.filename);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    buildPdf();
  }, [options]);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = window.document.createElement('a');
    a.href = pdfUrl;
    a.download = filename;
    a.click();
  };

  const handleShare = async () => {
    if (!pdfBlob) return;
    try {
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: document.title,
          text: `Scanned document: ${document.title} (${document.pages.length} pages)`,
        });
      } else if (navigator.share) {
        await navigator.share({
          title: document.title,
          text: `Scanned document: ${document.title}`,
          url: window.location.href,
        });
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  const handlePrint = () => {
    if (!pdfUrl) return;
    const iframe = window.document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = pdfUrl;
    window.document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.print();
    };
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Export PDF</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 font-semibold">
                  {document.pages.length} {document.pages.length === 1 ? 'Page' : 'Pages'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-xs">{document.title}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SETTINGS BAR */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Page Size */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Paper Format
              </label>
              <select
                value={options.pageSize}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, pageSize: e.target.value as any }))
                }
                className="w-full bg-slate-800 text-white text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-teal-500"
              >
                <option value="a4">Standard A4 (210 × 297 mm)</option>
                <option value="letter">US Letter (8.5 × 11 in)</option>
                <option value="fit">Fit to Image Size</option>
              </select>
            </div>

            {/* Quality */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Quality & Size
              </label>
              <select
                value={options.quality}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, quality: e.target.value as any }))
                }
                className="w-full bg-slate-800 text-white text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-teal-500"
              >
                <option value="high">High Resolution (Crisp Print)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="compressed">Compressed (Fast Email)</option>
              </select>
            </div>
          </div>

          {/* Page Image Source: Processed vs Original vs Both */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Page Image Content
            </label>
            <select
              value={options.imageSource}
              onChange={(e) =>
                setOptions((prev) => ({ ...prev, imageSource: e.target.value as any }))
              }
              className="w-full bg-slate-800 text-white text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-teal-500"
            >
              <option value="processed">Enhanced Scan (processedImage - Magic Color/B&W)</option>
              <option value="original">Original Capture (originalImage - Raw Uncropped Photo)</option>
              <option value="both">Both (Enhanced Scan + Original Photo Comparison)</option>
            </select>
          </div>

          {/* Toggles: Page Numbers & Watermark */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-300">Include Page Numbers</span>
              <span className="text-[10px] text-slate-500">("Page 1 of N" in footer)</span>
            </div>
            <input
              type="checkbox"
              checked={options.showPageNumbers}
              onChange={(e) =>
                setOptions((prev) => ({ ...prev, showPageNumbers: e.target.checked }))
              }
              className="accent-teal-500 w-4 h-4 rounded cursor-pointer"
            />
          </div>

          {/* PDF PREVIEW FRAME */}
          <div className="relative w-full h-56 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                <div className="w-7 h-7 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                <span>Compiling multi-page PDF...</span>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full border-none rounded-xl"
                title="PDF Preview"
              />
            ) : (
              <span className="text-xs text-slate-500">Failed to render preview</span>
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <button
            onClick={handlePrint}
            disabled={isGenerating || !pdfUrl}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition text-xs font-semibold"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <div className="flex items-center gap-2">
            {canShare && (
              <button
                onClick={handleShare}
                disabled={isGenerating || !pdfBlob}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition text-xs font-semibold border border-slate-700"
              >
                <Share2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Share</span>
              </button>
            )}

            <button
              onClick={handleDownload}
              disabled={isGenerating || !pdfUrl}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold text-xs shadow-md shadow-teal-500/25 active:scale-95 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
