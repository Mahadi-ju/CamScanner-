/**
 * Storage Repository for CamScan Mobile
 * Offline-first IndexedDB / LocalStorage persistence
 */

import { DocumentEntity, PageEntity } from '../domain/models';
import { createStarterDocuments } from './samples';

const DB_NAME = 'camscan_mobile_db';
const DB_VERSION = 1;
const STORE_NAME = 'documents';
const LOCALSTORAGE_KEY = 'camscan_documents_v1';

class DocumentRepository {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getAllDocuments(): Promise<DocumentEntity[]> {
    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const results: DocumentEntity[] = request.result || [];
          if (results.length === 0) {
            // Check fallback or seed starter documents
            const starters = createStarterDocuments();
            this.seedDocuments(starters);
            resolve(starters);
          } else {
            // Sort by updatedAt descending
            results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            resolve(results);
          }
        };

        request.onerror = () => {
          resolve(this.getFallbackFromLocalStorage());
        };
      });
    } catch {
      return this.getFallbackFromLocalStorage();
    }
  }

  async getDocumentById(id: string): Promise<DocumentEntity | null> {
    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result || null);
        };
        request.onerror = () => {
          const all = this.getFallbackFromLocalStorage();
          resolve(all.find((d) => d.id === id) || null);
        };
      });
    } catch {
      const all = this.getFallbackFromLocalStorage();
      return all.find((d) => d.id === id) || null;
    }
  }

  async saveDocument(doc: DocumentEntity): Promise<void> {
    doc.updatedAt = new Date().toISOString();
    try {
      const db = await this.openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(doc);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Fallback
    }

    // Always mirror to localStorage for redundancy if size allows
    this.updateLocalStorage(doc);
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      const db = await this.openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Ignore
    }

    const current = this.getFallbackFromLocalStorage();
    const filtered = current.filter((d) => d.id !== id);
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(filtered));
    } catch {
      // Ignore storage quota
    }
  }

  async mergeDocuments(docIds: string[], newTitle: string): Promise<DocumentEntity | null> {
    const all = await this.getAllDocuments();
    const docsToMerge = all.filter((d) => docIds.includes(d.id));
    if (docsToMerge.length < 2) return null;

    // Collect all pages in order
    const mergedPages: PageEntity[] = [];
    let pageNum = 1;

    for (const d of docsToMerge) {
      for (const p of d.pages) {
        mergedPages.push({
          ...p,
          id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          pageNumber: pageNum++,
        });
      }
    }

    const newDoc: DocumentEntity = {
      id: `doc_${Date.now()}`,
      title: newTitle || `Merged Document (${mergedPages.length} pages)`,
      category: docsToMerge[0].category,
      pages: mergedPages,
      thumbnail: mergedPages[0]?.processedImage || mergedPages[0]?.originalImage || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: Array.from(new Set(docsToMerge.flatMap((d) => d.tags))),
      isFavorite: false,
    };

    await this.saveDocument(newDoc);
    return newDoc;
  }

  private seedDocuments(docs: DocumentEntity[]) {
    try {
      this.openDB().then((db) => {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        docs.forEach((d) => store.put(d));
      });
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(docs));
    } catch {
      // Ignore
    }
  }

  private getFallbackFromLocalStorage(): DocumentEntity[] {
    try {
      const data = localStorage.getItem(LOCALSTORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Ignore
    }
    const starters = createStarterDocuments();
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(starters));
    } catch {
      // Ignore
    }
    return starters;
  }

  private updateLocalStorage(doc: DocumentEntity) {
    try {
      const list = this.getFallbackFromLocalStorage();
      const idx = list.findIndex((d) => d.id === doc.id);
      if (idx >= 0) {
        list[idx] = doc;
      } else {
        list.unshift(doc);
      }
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(list));
    } catch {
      // Quota exceeded if images are large, indexedDB handles the heavy lifting
    }
  }
}

export const documentRepo = new DocumentRepository();
