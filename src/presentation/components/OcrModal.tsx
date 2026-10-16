/**
 * Presentation: OcrModal
 * Text extraction viewer, multi-language selector, copy, search, key fields analysis, and TXT export
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Copy,
  Check,
  Search,
  Download,
  X,
  Sparkles,
  Globe,
  Calendar,
  DollarSign,
  Hash,
  Building,
  RefreshCw,
} from 'lucide-react';
import { PageEntity, OcrResult } from '../../domain/models';
import { SUPPORTED_LANGUAGES, processPageOcr } from '../../domain/ocrService';

interface OcrModalProps {
  page: PageEntity;
  onClose: () => void;
  onSaveOcr?: (ocr: OcrResult) => void;
}

export const OcrModal: React.FC<OcrModalProps> = ({
  page,
  onClose,
  onSaveOcr,
}) => {
  const [selectedLang, setSelectedLang] = useState<string>(page.ocr?.language || 'en');
  const [ocrData, setOcrData] = useState<OcrResult | null>(page.ocr || null);
  const [isLoading, setIsLoading] = useState<boolean>(!page.ocr);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Initializing OCR...');
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract OCR using Tesseract.js on page.processedImage
  const runExtraction = async (lang: string) => {
    setIsLoading(true);
    setProgress(0.05);
    setStatusMessage('Starting Tesseract.js worker...');

    try {
      const updatedPage = await processPageOcr(page, lang, (prog, msg) => {
        setProgress(prog);
        setStatusMessage(msg);
      });

      if (updatedPage.ocr) {
        setOcrData(updatedPage.ocr);
        if (onSaveOcr) {
          onSaveOcr(updatedPage.ocr);
        }
      }
    } catch (err) {
      console.error('OCR processing error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!ocrData) {
      runExtraction(selectedLang);
    }
  }, []);

  const handleLanguageChange = (lang: string) => {
    setSelectedLang(lang);
    runExtraction(lang);
  };

  const handleCopy = () => {
    if (!ocrData?.text) return;
    navigator.clipboard.writeText(ocrData.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!ocrData?.text) return;
    const blob = new Blob([ocrData.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OCR_Page_${page.pageNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Text search highlighter
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-400 text-slate-950 font-semibold px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>OCR Text Recognition</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">
                  Page {page.pageNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Offline-first high accuracy optical character extraction</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOOLBAR: Language & Search */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-400" />
            <select
              value={selectedLang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-slate-800 text-white text-xs rounded-xl px-3 py-1.5 border border-slate-700 focus:outline-none focus:border-teal-500"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.native})
                </option>
              ))}
            </select>
          </div>

          {/* Search in text */}
          <div className="relative flex-1 min-w-[140px] max-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Find in text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 text-white text-xs rounded-xl pl-8 pr-3 py-1.5 border border-slate-700 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {/* CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center max-w-xs mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mb-4 text-teal-400">
                <RefreshCw className="w-7 h-7 animate-spin" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Tesseract.js OCR Processing</h4>
              <p className="text-xs text-slate-400 mb-4">{statusMessage}</p>

              {/* Live Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/60 mb-2">
                <div
                  className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-200"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-teal-400">{Math.round(progress * 100)}%</span>
            </div>
          ) : ocrData ? (
            <>
              {/* SMART KEY FIELDS CARD */}
              {ocrData.keyFields && (
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-400 mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Smart Document Extraction</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {ocrData.keyFields.totalAmount && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-700/50">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Amount</div>
                          <div className="font-bold text-emerald-300">{ocrData.keyFields.totalAmount}</div>
                        </div>
                      </div>
                    )}

                    {ocrData.keyFields.date && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-700/50">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Date</div>
                          <div className="font-medium text-slate-200">{ocrData.keyFields.date}</div>
                        </div>
                      </div>
                    )}

                    {ocrData.keyFields.invoiceNumber && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-700/50">
                        <Hash className="w-3.5 h-3.5 text-amber-400" />
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Ref / Invoice #</div>
                          <div className="font-mono text-slate-200">{ocrData.keyFields.invoiceNumber}</div>
                        </div>
                      </div>
                    )}

                    {ocrData.keyFields.vendor && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-700/50">
                        <Building className="w-3.5 h-3.5 text-purple-400" />
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Vendor / Title</div>
                          <div className="font-medium text-slate-200 truncate">{ocrData.keyFields.vendor}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* EXTRACTED RAW TEXT BOX */}
              <div className="relative">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 px-1">
                  <span>Full Extracted Text ({ocrData.text.length} characters)</span>
                  <span className="text-[11px] text-emerald-400 font-medium">
                    {Math.round(ocrData.confidence * 100)}% Confidence
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-text max-h-64 overflow-y-auto">
                  {renderHighlightedText(ocrData.text, searchQuery)}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">No text recognized from this page.</div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            onClick={() => runExtraction(selectedLang)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Re-extract</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTxt}
              disabled={!ocrData?.text}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .TXT</span>
            </button>

            <button
              onClick={handleCopy}
              disabled={!ocrData?.text}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-teal-500 text-white hover:bg-teal-400 shadow-md shadow-teal-500/25'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
