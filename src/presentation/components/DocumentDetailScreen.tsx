/**
 * Presentation: DocumentDetailScreen
 * Multi-page document viewer, page reordering, inline title editing, OCR, and PDF export
 */

import React, { useState } from 'react';
import {
  ChevronLeft,
  Share2,
  FileText,
  Plus,
  Trash2,
  Edit2,
  Download,
  Star,
  Crop,
  Sliders,
  ChevronRight,
  MoreVertical,
  ArrowLeft,
  ArrowRight,
  Check,
  Tag,
} from 'lucide-react';
import { DocumentEntity, PageEntity, DocCategory } from '../../domain/models';
import { downloadDocumentPdf } from '../../domain/pdfExport';
import { OcrModal } from './OcrModal';
import { PdfExportModal } from './PdfExportModal';

interface DocumentDetailScreenProps {
  document: DocumentEntity;
  onBack: () => void;
  onUpdateDocument: (doc: DocumentEntity) => void;
  onDeleteDocument: (id: string) => void;
  onAddPage: () => void;
  onReCropPage: (page: PageEntity) => void;
  onReFilterPage: (page: PageEntity) => void;
}

const CATEGORIES: { id: DocCategory; label: string }[] = [
  { id: 'all', label: 'General' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'ids', label: 'ID Cards' },
  { id: 'notes', label: 'Notes' },
];

export const DocumentDetailScreen: React.FC<DocumentDetailScreenProps> = ({
  document,
  onBack,
  onUpdateDocument,
  onDeleteDocument,
  onAddPage,
  onReCropPage,
  onReFilterPage,
}) => {
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>(document.title);
  const [showCategoryMenu, setShowCategoryMenu] = useState<boolean>(false);
  const [showOcrModal, setShowOcrModal] = useState<boolean>(false);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  const currentPage = document.pages[selectedPageIndex] || document.pages[0];

  const handleDirectDownloadPdf = async () => {
    if (isDownloadingPdf || document.pages.length === 0) return;
    setIsDownloadingPdf(true);
    try {
      const filename = await downloadDocumentPdf(document, {
        pageSize: 'a4',
        quality: 'high',
        imageSource: 'processed',
        showPageNumbers: true,
      });
      setDownloadSuccessToast(filename);
      setTimeout(() => setDownloadSuccessToast(null), 3500);
    } catch (err) {
      console.error('Download PDF error:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSaveTitle = () => {
    if (newTitle.trim()) {
      const updated = { ...document, title: newTitle.trim(), updatedAt: new Date().toISOString() };
      onUpdateDocument(updated);
    }
    setIsEditingTitle(false);
  };

  const handleToggleFavorite = () => {
    const updated = { ...document, isFavorite: !document.isFavorite };
    onUpdateDocument(updated);
  };

  const handleChangeCategory = (cat: DocCategory) => {
    const updated = { ...document, category: cat };
    onUpdateDocument(updated);
    setShowCategoryMenu(false);
  };

  // Move page left
  const handleMovePageLeft = (idx: number) => {
    if (idx <= 0) return;
    const newPages = [...document.pages];
    [newPages[idx - 1], newPages[idx]] = [newPages[idx], newPages[idx - 1]];
    // renumber
    newPages.forEach((p, i) => (p.pageNumber = i + 1));
    const updated = { ...document, pages: newPages };
    onUpdateDocument(updated);
    setSelectedPageIndex(idx - 1);
  };

  // Move page right
  const handleMovePageRight = (idx: number) => {
    if (idx >= document.pages.length - 1) return;
    const newPages = [...document.pages];
    [newPages[idx], newPages[idx + 1]] = [newPages[idx + 1], newPages[idx]];
    // renumber
    newPages.forEach((p, i) => (p.pageNumber = i + 1));
    const updated = { ...document, pages: newPages };
    onUpdateDocument(updated);
    setSelectedPageIndex(idx + 1);
  };

  // Delete page
  const handleDeletePage = (idx: number) => {
    if (document.pages.length === 1) {
      setShowDeleteConfirm(true);
      return;
    }
    const newPages = document.pages.filter((_, i) => i !== idx);
    newPages.forEach((p, i) => (p.pageNumber = i + 1));
    const newThumb = newPages[0]?.processedImage || newPages[0]?.originalImage || '';
    const updated = { ...document, pages: newPages, thumbnail: newThumb };
    onUpdateDocument(updated);
    setSelectedPageIndex(Math.max(0, idx - 1));
  };

  return (
    <div className="relative w-full h-full bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none">
      {/* TOP HEADER */}
      <div className="relative z-20 flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Inline editable document title */}
        <div className="flex-1 mx-3 flex flex-col items-center max-w-[60%]">
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5 w-full">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                autoFocus
                className="w-full bg-slate-800 text-white text-xs font-semibold px-2 py-1 rounded border border-teal-500 focus:outline-none"
              />
              <button
                onClick={handleSaveTitle}
                className="p-1 rounded bg-teal-500 text-white"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-white truncate max-w-full hover:text-teal-400 group"
            >
              <span className="truncate">{document.title}</span>
              <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-teal-400 opacity-60" />
            </button>
          )}

          <div className="flex items-center gap-2 mt-0.5">
            {/* Category badge */}
            <div className="relative">
              <button
                onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full font-medium hover:bg-teal-500/20 flex items-center gap-1"
              >
                <Tag className="w-2.5 h-2.5" />
                <span className="capitalize">{document.category}</span>
              </button>

              {showCategoryMenu && (
                <div className="absolute top-6 left-0 z-30 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 w-32">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleChangeCategory(cat.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 hover:text-white"
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="text-[10px] text-slate-500">
              Page {selectedPageIndex + 1} of {document.pages.length}
            </span>
          </div>
        </div>

        {/* Action icons: Direct Download, Favorite, Delete */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDirectDownloadPdf}
            disabled={isDownloadingPdf}
            className="p-2 rounded-xl text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 transition active:scale-95 disabled:opacity-50"
            title="Download PDF"
          >
            {isDownloadingPdf ? (
              <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-xl transition ${
              document.isFavorite ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400 hover:text-white'
            }`}
            title="Favorite"
          >
            <Star className={`w-4 h-4 ${document.isFavorite ? 'fill-amber-400' : ''}`} />
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 transition"
            title="Delete Document"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAIN ACTIVE PAGE VIEWER */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center p-4 overflow-hidden bg-slate-950">
        {currentPage ? (
          <div className="relative max-w-full max-h-[60vh] flex items-center justify-center shadow-2xl rounded-lg overflow-hidden border border-slate-800/80">
            <img
              src={currentPage.processedImage || currentPage.croppedImage || currentPage.originalImage}
              alt={`Page ${currentPage.pageNumber}`}
              className="max-w-full max-h-[60vh] object-contain rounded-md block bg-white"
            />

            {/* Quick page action badge */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700 text-xs shadow-lg">
              <button
                onClick={() => onReCropPage(currentPage)}
                className="flex items-center gap-1 text-slate-300 hover:text-teal-400 px-2 py-0.5 rounded transition"
                title="Adjust Crop Corners"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Crop</span>
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => onReFilterPage(currentPage)}
                className="flex items-center gap-1 text-slate-300 hover:text-teal-400 px-2 py-0.5 rounded transition"
                title="Change Filter / Contrast"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Filter</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-400">No pages found in this document.</div>
        )}
      </div>

      {/* MULTI-PAGE THUMBNAILS CAROUSEL RIBBON */}
      <div className="relative z-20 bg-slate-900/95 border-t border-slate-800 px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Pages ({document.pages.length})</span>
          <div className="flex items-center gap-2">
            {/* Reorder Left/Right */}
            <button
              onClick={() => handleMovePageLeft(selectedPageIndex)}
              disabled={selectedPageIndex === 0}
              className="p-1 rounded bg-slate-800 text-slate-300 disabled:opacity-30 hover:text-white"
              title="Move Page Backward"
            >
              <ArrowLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleMovePageRight(selectedPageIndex)}
              disabled={selectedPageIndex >= document.pages.length - 1}
              className="p-1 rounded bg-slate-800 text-slate-300 disabled:opacity-30 hover:text-white"
              title="Move Page Forward"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
          {document.pages.map((p, idx) => {
            const isSelected = idx === selectedPageIndex;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPageIndex(idx)}
                className={`relative group rounded-xl overflow-hidden cursor-pointer flex-shrink-0 transition-all ${
                  isSelected
                    ? 'ring-2 ring-teal-400 shadow-md shadow-teal-500/20 scale-105'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={p.processedImage || p.originalImage}
                  alt={`Thumbnail ${p.pageNumber}`}
                  className="w-14 h-18 object-cover bg-white"
                />
                <span className="absolute bottom-1 right-1 px-1 rounded bg-black/70 text-[9px] font-mono text-white">
                  {idx + 1}
                </span>

                {/* Individual page delete icon */}
                {document.pages.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePage(idx);
                    }}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition shadow"
                    title="Remove this page"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Page Button */}
          <button
            onClick={onAddPage}
            className="w-14 h-18 rounded-xl border-2 border-dashed border-slate-700 hover:border-teal-400/80 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-teal-400 flex-shrink-0 transition active:scale-95 bg-slate-800/40"
            title="Scan / Add New Page"
          >
            <Plus className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Add</span>
          </button>
        </div>
      </div>

      {/* BOTTOM ACTION BAR (OCR Text & Download PDF) */}
      <div className="relative z-20 px-4 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2.5">
        {/* OCR Button */}
        <button
          onClick={() => setShowOcrModal(true)}
          className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition active:scale-98"
        >
          <FileText className="w-4 h-4 text-teal-400" />
          <span>OCR Text</span>
        </button>

        {/* Primary Download PDF Button */}
        <div className="flex-1 flex items-center">
          <button
            onClick={handleDirectDownloadPdf}
            disabled={isDownloadingPdf}
            className="flex-1 py-2.5 px-3 rounded-l-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold text-xs shadow-md shadow-teal-500/25 flex items-center justify-center gap-1.5 active:scale-98 transition disabled:opacity-50"
            title="Download multi-page PDF"
          >
            {isDownloadingPdf ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isDownloadingPdf ? 'Generating...' : 'Download PDF'}</span>
          </button>

          {/* PDF Customization Settings Trigger */}
          <button
            onClick={() => setShowPdfModal(true)}
            className="py-2.5 px-2 rounded-r-xl bg-emerald-700 hover:bg-emerald-600 text-white border-l border-emerald-600/50 flex items-center justify-center transition active:scale-98"
            title="PDF Export Settings (Page format, quality, watermark)"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* DOWNLOAD SUCCESS TOAST BANNER */}
      {downloadSuccessToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Downloaded {downloadSuccessToast}</span>
        </div>
      )}

      {/* OCR MODAL */}
      {showOcrModal && currentPage && (
        <OcrModal
          page={currentPage}
          onClose={() => setShowOcrModal(false)}
          onSaveOcr={(ocr) => {
            const newPages = [...document.pages];
            newPages[selectedPageIndex] = { ...currentPage, ocr };
            onUpdateDocument({ ...document, pages: newPages });
          }}
        />
      )}

      {/* PDF EXPORT MODAL */}
      {showPdfModal && (
        <PdfExportModal
          document={document}
          onClose={() => setShowPdfModal(false)}
        />
      )}

      {/* DELETE ENTIRE DOCUMENT CONFIRMATION */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-5 rounded-2xl max-w-sm w-full text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">Delete Document?</h4>
            <p className="text-xs text-slate-400 mb-5">
              This document and its {document.pages.length} page(s) will be permanently deleted from local storage.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDeleteDocument(document.id);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-500 shadow-md shadow-rose-600/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
