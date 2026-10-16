/**
 * App Root: CamScan Mobile
 * Clean Architecture Presentation coordinator and state store
 */

import React, { useState, useEffect, useCallback } from 'react';
import { DocumentEntity, PageEntity, QuadCorners, FilterSettings, DocCategory } from './domain/models';
import { documentRepo } from './data/storage';
import { generateSampleDocumentDataUrl } from './data/samples';
import { warpPerspective } from './domain/transform';
import { processPageOcr } from './domain/ocrService';
import { MobileFrame } from './presentation/components/MobileFrame';
import { DocumentListScreen } from './presentation/components/DocumentListScreen';
import { CameraScreen } from './presentation/components/CameraScreen';
import { CropPerspectiveScreen } from './presentation/components/CropPerspectiveScreen';
import { FilterEnhanceScreen } from './presentation/components/FilterEnhanceScreen';
import { DocumentDetailScreen } from './presentation/components/DocumentDetailScreen';

type AppScreen = 'list' | 'camera' | 'crop' | 'filter' | 'detail';

interface ScanSession {
  targetDocId?: string; // If adding a page to an existing document
  rawImageSrc: string;
  corners?: QuadCorners;
  warpedCanvas?: HTMLCanvasElement;
  batchMode?: boolean;
  pageCount?: number;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('list');
  const [documents, setDocuments] = useState<DocumentEntity[]>([]);
  const [activeDocument, setActiveDocument] = useState<DocumentEntity | null>(null);
  const [scanSession, setScanSession] = useState<ScanSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load documents on boot
  const loadDocuments = useCallback(async () => {
    try {
      const docs = await documentRepo.getAllDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Save document handler
  const handleUpdateDocument = async (updated: DocumentEntity) => {
    setActiveDocument(updated);
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    await documentRepo.saveDocument(updated);
  };

  // Delete document handler
  const handleDeleteDocument = async (id: string) => {
    await documentRepo.deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (activeDocument?.id === id) {
      setActiveDocument(null);
      setCurrentScreen('list');
    }
  };

  // Merge multiple documents into 1 multi-page PDF document
  const handleMergeDocuments = async (docIds: string[]) => {
    const merged = await documentRepo.mergeDocuments(docIds, 'Merged Document Scan');
    if (merged) {
      setDocuments((prev) => [merged, ...prev]);
      setActiveDocument(merged);
      setCurrentScreen('detail');
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (id: string) => {
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;
    const updated = { ...doc, isFavorite: !doc.isFavorite };
    await handleUpdateDocument(updated);
  };

  // CAMERA & SCAN FLOW ACTIONS
  const startNewScan = (targetDocId?: string) => {
    const targetDoc = targetDocId ? documents.find((d) => d.id === targetDocId) : null;
    setScanSession({
      targetDocId,
      rawImageSrc: '',
      batchMode: false,
      pageCount: targetDoc ? targetDoc.pages.length : 0,
    });
    setCurrentScreen('camera');
  };

  const handleCaptureFromCamera = (dataUrl: string, batchMode: boolean) => {
    setScanSession((prev) => ({
      ...prev,
      rawImageSrc: dataUrl,
      batchMode,
    }));
    setCurrentScreen('crop');
  };

  const handleImportGallery = (dataUrl: string, targetDocId?: string) => {
    const targetDoc = targetDocId ? documents.find((d) => d.id === targetDocId) : null;
    setScanSession({
      targetDocId,
      rawImageSrc: dataUrl,
      batchMode: false,
      pageCount: targetDoc ? targetDoc.pages.length : 0,
    });
    setCurrentScreen('crop');
  };

  const handleSelectSample = (type: 'invoice' | 'receipt' | 'contract' | 'id_badge', targetDocId?: string) => {
    const sample = generateSampleDocumentDataUrl(type, true);
    const targetDoc = targetDocId ? documents.find((d) => d.id === targetDocId) : null;
    setScanSession({
      targetDocId,
      rawImageSrc: sample.dataUrl,
      corners: sample.naturalCorners,
      batchMode: false,
      pageCount: targetDoc ? targetDoc.pages.length : 0,
    });
    setCurrentScreen('crop');
  };

  // CROP CONFIRM -> WARP TO FILTER
  const handleCropConfirm = (warpedCanvas: HTMLCanvasElement, corners: QuadCorners) => {
    setScanSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        corners,
        warpedCanvas,
      };
    });
    setCurrentScreen('filter');
  };

  // FILTER CONFIRM -> SAVE NEW PAGE / NEW DOCUMENT
  const handleFilterConfirm = async (processedDataUrl: string, settings: FilterSettings) => {
    if (!scanSession || !scanSession.rawImageSrc || !scanSession.warpedCanvas) return;

    const pageId = `page_${Date.now()}`;
    const pageNum = (scanSession.pageCount || 0) + 1;

    const newPage: PageEntity = {
      id: pageId,
      pageNumber: pageNum,
      originalImage: scanSession.rawImageSrc,
      croppedImage: scanSession.warpedCanvas.toDataURL('image/jpeg', 0.94),
      processedImage: processedDataUrl,
      corners: scanSession.corners,
      rotation: 0,
      aspectRatio: scanSession.warpedCanvas.width / scanSession.warpedCanvas.height,
      filters: settings,
      createdAt: new Date().toISOString(),
    };

    if (scanSession.targetDocId) {
      // Appending page to existing document
      const doc = documents.find((d) => d.id === scanSession.targetDocId);
      if (doc) {
        const updatedDoc: DocumentEntity = {
          ...doc,
          pages: [...doc.pages, newPage],
          updatedAt: new Date().toISOString(),
        };
        await handleUpdateDocument(updatedDoc);
        setActiveDocument(updatedDoc);
        setCurrentScreen('detail');

        // Process OCR in background using Tesseract.js and store in page metadata for searchability
        processPageOcr(newPage, 'en').then((pageWithOcr) => {
          if (pageWithOcr.ocr) {
            documentRepo.getDocumentById(updatedDoc.id).then((freshDoc) => {
              if (freshDoc) {
                const idx = freshDoc.pages.findIndex((p) => p.id === newPage.id);
                if (idx >= 0) {
                  freshDoc.pages[idx] = pageWithOcr;
                  documentRepo.saveDocument(freshDoc);
                  setDocuments((prev) => prev.map((d) => (d.id === freshDoc.id ? freshDoc : d)));
                  setActiveDocument((curr) => (curr?.id === freshDoc.id ? freshDoc : curr));
                }
              }
            });
          }
        });
      }
    } else {
      // Creating a brand new document
      const docDate = new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      const newDoc: DocumentEntity = {
        id: `doc_${Date.now()}`,
        title: `Scan ${docDate} - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        category: 'all',
        pages: [newPage],
        thumbnail: processedDataUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['New Scan'],
        isFavorite: false,
      };

      await documentRepo.saveDocument(newDoc);
      setDocuments((prev) => [newDoc, ...prev]);
      setActiveDocument(newDoc);
      setCurrentScreen('detail');

      // Process OCR in background using Tesseract.js and store in page metadata for searchability
      processPageOcr(newPage, 'en').then((pageWithOcr) => {
        if (pageWithOcr.ocr) {
          documentRepo.getDocumentById(newDoc.id).then((freshDoc) => {
            if (freshDoc) {
              const idx = freshDoc.pages.findIndex((p) => p.id === newPage.id);
              if (idx >= 0) {
                freshDoc.pages[idx] = pageWithOcr;
                documentRepo.saveDocument(freshDoc);
                setDocuments((prev) => prev.map((d) => (d.id === freshDoc.id ? freshDoc : d)));
                setActiveDocument((curr) => (curr?.id === freshDoc.id ? freshDoc : curr));
              }
            }
          });
        }
      });
    }

    setScanSession(null);
  };

  // Re-crop an existing page
  const handleReCropPage = (page: PageEntity) => {
    if (!activeDocument) return;
    setScanSession({
      targetDocId: activeDocument.id,
      rawImageSrc: page.originalImage,
      corners: page.corners,
      pageCount: page.pageNumber - 1,
    });
    setCurrentScreen('crop');
  };

  // Re-filter an existing page
  const handleReFilterPage = (page: PageEntity) => {
    if (!activeDocument) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        setScanSession({
          targetDocId: activeDocument.id,
          rawImageSrc: page.originalImage,
          corners: page.corners,
          warpedCanvas: canvas,
          pageCount: page.pageNumber - 1,
        });
        setCurrentScreen('filter');
      }
    };
    img.src = page.croppedImage || page.originalImage;
  };

  return (
    <MobileFrame>
      {/* 1. DOCUMENT LIST / HOME SCREEN */}
      {currentScreen === 'list' && (
        <DocumentListScreen
          documents={documents}
          onOpenDocument={(doc) => {
            setActiveDocument(doc);
            setCurrentScreen('detail');
          }}
          onNewScan={() => startNewScan()}
          onImportGallery={(dataUrl) => handleImportGallery(dataUrl)}
          onSelectSample={(type) => handleSelectSample(type)}
          onDeleteDocument={handleDeleteDocument}
          onMergeDocuments={handleMergeDocuments}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {/* 2. CAMERA SCREEN */}
      {currentScreen === 'camera' && (
        <CameraScreen
          onCapture={handleCaptureFromCamera}
          onClose={() => {
            if (activeDocument) {
              setCurrentScreen('detail');
            } else {
              setCurrentScreen('list');
            }
          }}
          initialBatchCount={scanSession?.pageCount || 0}
          documentTitle={
            scanSession?.targetDocId
              ? documents.find((d) => d.id === scanSession.targetDocId)?.title
              : undefined
          }
        />
      )}

      {/* 3. CROP PERSPECTIVE SCREEN */}
      {currentScreen === 'crop' && scanSession && (
        <CropPerspectiveScreen
          imageSrc={scanSession.rawImageSrc}
          onConfirm={handleCropConfirm}
          onRetake={() => setCurrentScreen('camera')}
        />
      )}

      {/* 4. FILTER ENHANCE SCREEN */}
      {currentScreen === 'filter' && scanSession?.warpedCanvas && (
        <FilterEnhanceScreen
          warpedCanvas={scanSession.warpedCanvas}
          onConfirm={handleFilterConfirm}
          onBack={() => setCurrentScreen('crop')}
          isNewPage={Boolean(scanSession.targetDocId)}
        />
      )}

      {/* 5. DOCUMENT DETAIL SCREEN */}
      {currentScreen === 'detail' && activeDocument && (
        <DocumentDetailScreen
          document={activeDocument}
          onBack={() => {
            setActiveDocument(null);
            setCurrentScreen('list');
          }}
          onUpdateDocument={handleUpdateDocument}
          onDeleteDocument={handleDeleteDocument}
          onAddPage={() => startNewScan(activeDocument.id)}
          onReCropPage={handleReCropPage}
          onReFilterPage={handleReFilterPage}
        />
      )}
    </MobileFrame>
  );
}
