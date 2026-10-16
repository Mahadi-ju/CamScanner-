/**
 * Domain Models for CamScan Mobile
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface QuadCorners {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
}

export type FilterType = 'original' | 'magic' | 'bw' | 'grayscale' | 'lighten' | 'blueprint';

export interface FilterSettings {
  filterType: FilterType;
  brightness: number; // -100 to 100, default 0
  contrast: number;   // -100 to 100, default 0
  sharpness: number;  // 0 to 100, default 0
  threshold?: number; // 0 to 255 for B&W, default 128
}

export interface OcrResult {
  text: string;
  language: string;
  confidence: number;
  extractedAt: string;
  keyFields?: {
    title?: string;
    date?: string;
    totalAmount?: string;
    invoiceNumber?: string;
    vendor?: string;
    summary?: string;
  };
}

export interface PageEntity {
  id: string;
  pageNumber: number;
  originalImage: string; // Data URL or storage key
  croppedImage: string;  // Flattened perspective warp
  processedImage: string;// Final with filters applied
  corners?: QuadCorners;
  rotation: number;      // 0, 90, 180, 270
  aspectRatio: number;   // width / height
  filters: FilterSettings;
  ocr?: OcrResult;
  createdAt: string;
}

export type DocCategory = 'all' | 'receipts' | 'invoices' | 'contracts' | 'ids' | 'notes';

export interface DocumentEntity {
  id: string;
  title: string;
  category: DocCategory;
  pages: PageEntity[];
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isFavorite: boolean;
}

export interface CameraGuideMode {
  id: 'doc' | 'id_card' | 'receipt' | 'book';
  label: string;
  aspect: number; // width / height
  description: string;
}
