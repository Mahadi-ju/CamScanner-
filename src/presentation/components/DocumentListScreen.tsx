/**
 * Presentation: DocumentListScreen
 * CamScanner Home Screen with search (name & OCR text), categories, multi-select merge, grid/list view, FAB
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Grid,
  List,
  Camera,
  Plus,
  Trash2,
  Combine,
  MoreVertical,
  Star,
  FileText,
  Calendar,
  Sparkles,
  Tag,
  CheckSquare,
  Square,
  Upload,
  FolderOpen,
  Filter,
} from 'lucide-react';
import { DocumentEntity, DocCategory } from '../../domain/models';
import { generateSampleDocumentDataUrl } from '../../data/samples';

interface DocumentListScreenProps {
  documents: DocumentEntity[];
  onOpenDocument: (doc: DocumentEntity) => void;
  onNewScan: () => void;
  onImportGallery: (dataUrl: string) => void;
  onSelectSample: (type: 'invoice' | 'receipt' | 'contract' | 'id_badge') => void;
  onDeleteDocument: (id: string) => void;
  onMergeDocuments: (docIds: string[]) => void;
  onToggleFavorite: (id: string) => void;
}

const CATEGORY_TABS: { id: DocCategory | 'favorites'; label: string }[] = [
  { id: 'all', label: 'All Docs' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'ids', label: 'ID Cards' },
  { id: 'notes', label: 'Notes' },
  { id: 'favorites', label: '★ Starred' },
];

export const DocumentListScreen: React.FC<DocumentListScreenProps> = ({
  documents,
  onOpenDocument,
  onNewScan,
  onImportGallery,
  onSelectSample,
  onDeleteDocument,
  onMergeDocuments,
  onToggleFavorite,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<DocCategory | 'favorites'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [showFabMenu, setShowFabMenu] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filter documents based on Search Query (Title, Category, Tags, OCR text) and Selected Category
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Category filter
      if (selectedCategory === 'favorites') {
        if (!doc.isFavorite) return false;
      } else if (selectedCategory !== 'all') {
        if (doc.category !== selectedCategory) return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      // Check title & tags
      if (doc.title.toLowerCase().includes(q)) return true;
      if (doc.tags.some((t) => t.toLowerCase().includes(q))) return true;

      // Check inside OCR text of all pages
      const hasOcrMatch = doc.pages.some(
        (p) => p.ocr?.text && p.ocr.text.toLowerCase().includes(q)
      );
      if (hasOcrMatch) return true;

      return false;
    });
  }, [documents, searchQuery, selectedCategory]);

  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocIds.length === filteredDocuments.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocuments.map((d) => d.id));
    }
  };

  const handleMergeSelected = () => {
    if (selectedDocIds.length < 2) return;
    onMergeDocuments(selectedDocIds);
    setIsSelectMode(false);
    setSelectedDocIds([]);
  };

  const handleDeleteSelected = () => {
    selectedDocIds.forEach((id) => onDeleteDocument(id));
    setIsSelectMode(false);
    setSelectedDocIds([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onImportGallery(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative w-full h-full bg-slate-950 text-white flex flex-col justify-between overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* TOP HEADER & APP BRANDING */}
      <div className="relative z-20 px-4 pt-4 pb-3 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-md shadow-teal-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <FileText className="w-5 h-5 text-teal-400" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight leading-none flex items-center gap-1.5">
                <span>CamScan</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-bold tracking-wide uppercase">
                  Mobile
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {documents.length} {documents.length === 1 ? 'document' : 'documents'} scanned
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
              title={viewMode === 'grid' ? 'Switch to List' : 'Switch to Grid'}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </button>

            {/* Multi-Select Toggle */}
            <button
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedDocIds([]);
              }}
              className={`p-2 rounded-xl text-xs font-semibold transition ${
                isSelectMode
                  ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Batch Selection"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SEARCH BAR (Searches Title, Tags, and OCR Content) */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents or text inside OCR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 text-white text-xs rounded-xl pl-9 pr-4 py-2 border border-slate-800 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* CATEGORY FILTER CHIPS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-0.5 no-scrollbar">
          {CATEGORY_TABS.map((tab) => {
            const isSelected = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition active:scale-95 ${
                  isSelected
                    ? 'bg-teal-500 text-white shadow-sm shadow-teal-500/25'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* BATCH ACTION BAR (When in multi-select mode) */}
      {isSelectMode && (
        <div className="bg-teal-950/80 border-b border-teal-800/60 px-4 py-2 flex items-center justify-between text-xs animate-in slide-in-from-top duration-150">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="font-semibold text-teal-300 hover:underline"
            >
              {selectedDocIds.length === filteredDocuments.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-teal-400/60">•</span>
            <span className="text-teal-200">{selectedDocIds.length} selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMergeSelected}
              disabled={selectedDocIds.length < 2}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-teal-600 text-white font-semibold disabled:opacity-40 hover:bg-teal-500"
              title="Combine into 1 multi-page PDF"
            >
              <Combine className="w-3.5 h-3.5" />
              <span>Merge</span>
            </button>

            <button
              onClick={handleDeleteSelected}
              disabled={selectedDocIds.length === 0}
              className="p-1 rounded-lg bg-rose-600/80 text-white hover:bg-rose-500 disabled:opacity-40"
              title="Delete Selected"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* DOCUMENT LIST / GRID CONTENT */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredDocuments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-4 text-teal-400">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No Scanned Documents</h3>
            <p className="text-xs text-slate-400 mb-6 max-w-xs leading-relaxed">
              {searchQuery
                ? `No results matched "${searchQuery}". Try searching by another keyword or tag.`
                : 'Photograph a document, upload from gallery, or try one of the realistic test presets.'}
            </p>
            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              <button
                onClick={onNewScan}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold text-xs shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2 active:scale-98 transition"
              >
                <Camera className="w-4 h-4" />
                <span>Scan New Document</span>
              </button>
              <button
                onClick={() => onSelectSample('invoice')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium text-xs flex items-center justify-center gap-2 hover:bg-slate-750 active:scale-98 transition"
              >
                <Sparkles className="w-4 h-4 text-teal-400" />
                <span>Load Sample Invoice</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-2 gap-3.5 pb-20">
            {filteredDocuments.map((doc) => {
              const isSelected = selectedDocIds.includes(doc.id);
              const firstPage = doc.pages[0];
              const thumb = doc.thumbnail || firstPage?.processedImage || firstPage?.originalImage;

              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    if (isSelectMode) {
                      toggleSelectDoc(doc.id);
                    } else {
                      onOpenDocument(doc);
                    }
                  }}
                  className={`group relative rounded-2xl bg-slate-900 border overflow-hidden cursor-pointer transition-all active:scale-[0.98] ${
                    isSelected
                      ? 'border-teal-400 ring-2 ring-teal-400/40 shadow-lg shadow-teal-500/20'
                      : 'border-slate-800 hover:border-slate-700 hover:shadow-xl'
                  }`}
                >
                  {/* Thumbnail Image */}
                  <div className="relative w-full aspect-[3/4] bg-slate-950 flex items-center justify-center overflow-hidden">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={doc.title}
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <FileText className="w-10 h-10 text-slate-700" />
                    )}

                    {/* Multi-Select Checkbox overlay */}
                    {isSelectMode && (
                      <div className="absolute top-2 left-2 z-10">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-md bg-teal-500 text-white flex items-center justify-center shadow">
                            <CheckSquare className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md bg-black/60 border border-white/60 shadow" />
                        )}
                      </div>
                    )}

                    {/* Page Count Badge */}
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-white flex items-center gap-1 border border-white/10">
                      <span>{doc.pages.length}p</span>
                    </div>

                    {/* Star Favorite icon */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(doc.id);
                      }}
                      className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-md text-slate-300 hover:text-amber-400 transition"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          doc.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Card Meta */}
                  <div className="p-3">
                    <h4 className="font-bold text-xs text-white truncate mb-1" title={doc.title}>
                      {doc.title}
                    </h4>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="capitalize px-1.5 py-0.2 rounded bg-slate-800 text-teal-400 font-medium">
                        {doc.category}
                      </span>
                      <span>
                        {new Date(doc.updatedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="space-y-2.5 pb-20">
            {filteredDocuments.map((doc) => {
              const isSelected = selectedDocIds.includes(doc.id);
              const firstPage = doc.pages[0];
              const thumb = doc.thumbnail || firstPage?.processedImage || firstPage?.originalImage;

              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    if (isSelectMode) {
                      toggleSelectDoc(doc.id);
                    } else {
                      onOpenDocument(doc);
                    }
                  }}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900 border cursor-pointer transition-all active:scale-[0.99] ${
                    isSelected
                      ? 'border-teal-400 ring-2 ring-teal-400/40'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isSelectMode && (
                    <div className="pl-1">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-teal-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                  )}

                  {/* Thumbnail */}
                  <div className="w-14 h-18 rounded-xl bg-slate-950 overflow-hidden flex-shrink-0 border border-slate-800">
                    {thumb ? (
                      <img src={thumb} alt={doc.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="w-6 h-6 text-slate-700" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-white truncate mb-1">{doc.title}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1">
                      <span className="capitalize px-1.5 py-0.2 rounded bg-slate-800 text-teal-400 font-medium">
                        {doc.category}
                      </span>
                      <span>•</span>
                      <span>{doc.pages.length} pages</span>
                      <span>•</span>
                      <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                    </div>

                    {/* OCR Snippet preview if available */}
                    {firstPage?.ocr?.text && (
                      <p className="text-[10px] text-slate-500 truncate font-mono">
                        {firstPage.ocr.text.replace(/\n/g, ' ')}
                      </p>
                    )}
                  </div>

                  {/* Star Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(doc.id);
                    }}
                    className="p-2 text-slate-400 hover:text-amber-400"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        doc.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FLOATING ACTION BUTTON (FAB) & EXPANDABLE SCAN OPTIONS */}
      <div className="absolute bottom-6 right-5 z-30 flex flex-col items-end gap-2.5">
        {showFabMenu && (
          <div className="flex flex-col items-end gap-2 animate-in slide-in-from-bottom-2 duration-150">
            {/* Gallery Upload */}
            <button
              onClick={() => {
                setShowFabMenu(false);
                fileInputRef.current?.click();
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-lg border border-slate-700"
            >
              <span>Import Photo</span>
              <Upload className="w-4 h-4 text-teal-400" />
            </button>

            {/* Instant Sample Preset */}
            <button
              onClick={() => {
                setShowFabMenu(false);
                onSelectSample('invoice');
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-lg border border-slate-700"
            >
              <span>Load Sample Doc</span>
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Main Camera Shutter FAB */}
          <button
            onClick={() => {
              if (showFabMenu) {
                setShowFabMenu(false);
              }
              onNewScan();
            }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-xl shadow-teal-500/30 hover:scale-105 active:scale-95 transition-transform"
            title="Scan Document with Camera"
          >
            <Camera className="w-6 h-6" />
          </button>

          {/* Plus menu toggle button */}
          <button
            onClick={() => setShowFabMenu(!showFabMenu)}
            className={`w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-white flex items-center justify-center shadow-lg transition-transform ${
              showFabMenu ? 'rotate-45 text-rose-400' : ''
            }`}
            title="Scan options"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
