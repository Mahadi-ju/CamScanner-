/**
 * Realistic Sample Documents with realistic skewed angles and printable text
 * Used to test edge detection, perspective warping, Magic Color, and OCR
 */

import { DocumentEntity, PageEntity, QuadCorners } from '../domain/models';

/**
 * Creates an authentic realistic document rendered onto a canvas and returned as data URL.
 * Includes natural perspective skew so the user can test warping immediately!
 */
export function generateSampleDocumentDataUrl(
  type: 'invoice' | 'contract' | 'receipt' | 'id_badge',
  skewed: boolean = true
): { dataUrl: string; naturalCorners: QuadCorners; width: number; height: number; title: string; ocrText: string } {
  const canvas = document.createElement('canvas');
  const w = 1000;
  const h = 1350;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Background surface (wooden desk or dark slate surface like a real photo)
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#1e293b');
  bgGrad.addColorStop(0.5, '#0f172a');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle desk texture lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Draw paper with shadow & slight angle
  ctx.save();

  // If skewed, apply realistic perspective transform / rotation on the desk
  if (skewed) {
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-0.06); // ~3.5 degree natural handheld tilt
    ctx.scale(0.88, 0.90);
    ctx.translate(-w / 2, -h / 2);
  } else {
    ctx.translate(w * 0.05, h * 0.05);
    ctx.scale(0.9, 0.9);
  }

  const paperX = 120;
  const paperY = 90;
  const paperW = 760;
  const paperH = 1140;

  // Paper Drop Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetX = 12;
  ctx.shadowOffsetY = 24;

  // Paper Sheet background (warm off-white)
  ctx.fillStyle = '#faf9f6';
  ctx.fillRect(paperX, paperY, paperW, paperH);

  // Reset shadow for document content
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  let title = 'Document';
  let ocrText = '';

  if (type === 'invoice') {
    title = 'Acme Corp - Invoice #INV-2026-894';
    ocrText = `ACME INNOVATIONS INC.
Tax Invoice / Billing Statement
Invoice No: INV-2026-894
Date: October 14, 2026
Due Date: November 14, 2026
Billed To: Global Tech Solutions LLC
100 Silicon Ave, Suite 400

Description                 Qty   Unit Price   Total
1. Cloud Architecture Review   1   $2,450.00   $2,450.00
2. Security Audit & Testing   1   $1,850.00   $1,850.00
3. AI Pipeline Integration    1   $3,200.00   $3,200.00
Subtotal: $7,500.00
Tax (8%): $600.00
TOTAL DUE: $8,100.00

Payment Details:
Bank: First National Bank
SWIFT: FNBBUS33
Status: Approved & Verified`;

    // Header
    ctx.fillStyle = '#0f766e'; // Teal accent
    ctx.fillRect(paperX, paperY, paperW, 90);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('ACME INNOVATIONS INC.', paperX + 40, paperY + 56);
    ctx.font = '500 16px sans-serif';
    ctx.fillText('Enterprise Cloud Solutions • www.acme-innovations.io', paperX + 40, paperY + 80);

    // Invoice Meta
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('INVOICE / BILLING STATEMENT', paperX + 40, paperY + 150);

    ctx.fillStyle = '#475569';
    ctx.font = '16px sans-serif';
    ctx.fillText('Invoice #: INV-2026-894', paperX + 40, paperY + 185);
    ctx.fillText('Date: October 14, 2026', paperX + 40, paperY + 215);
    ctx.fillText('Due Date: November 14, 2026', paperX + 40, paperY + 245);

    // Bill To
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('BILLED TO:', paperX + 460, paperY + 185);
    ctx.fillStyle = '#475569';
    ctx.font = '15px sans-serif';
    ctx.fillText('Global Tech Solutions LLC', paperX + 460, paperY + 212);
    ctx.fillText('100 Silicon Ave, Suite 400', paperX + 460, paperY + 235);
    ctx.fillText('San Francisco, CA 94107', paperX + 460, paperY + 258);

    // Table Header
    const tableY = paperY + 310;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(paperX + 35, tableY, paperW - 70, 38);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('ITEM / SERVICE', paperX + 50, tableY + 24);
    ctx.fillText('QTY', paperX + 420, tableY + 24);
    ctx.fillText('RATE', paperX + 510, tableY + 24);
    ctx.fillText('TOTAL', paperX + 610, tableY + 24);

    // Table Rows
    const items = [
      { name: '1. Cloud Architecture Review', qty: '1', rate: '$2,450.00', total: '$2,450.00' },
      { name: '2. Security Audit & Testing', qty: '1', rate: '$1,850.00', total: '$1,850.00' },
      { name: '3. AI Pipeline Integration', qty: '1', rate: '$3,200.00', total: '$3,200.00' },
    ];

    let rowY = tableY + 70;
    ctx.font = '15px sans-serif';
    items.forEach((item) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillText(item.name, paperX + 50, rowY);
      ctx.fillStyle = '#475569';
      ctx.fillText(item.qty, paperX + 425, rowY);
      ctx.fillText(item.rate, paperX + 510, rowY);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(item.total, paperX + 610, rowY);

      // divider
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(paperX + 35, rowY + 16);
      ctx.lineTo(paperX + paperW - 35, rowY + 16);
      ctx.stroke();

      rowY += 46;
    });

    // Totals Box
    const boxY = rowY + 20;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(paperX + 420, boxY, 305, 130);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(paperX + 420, boxY, 305, 130);

    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Subtotal:', paperX + 440, boxY + 30);
    ctx.fillText('Tax (8%):', paperX + 440, boxY + 60);

    ctx.fillStyle = '#0f172a';
    ctx.fillText('$7,500.00', paperX + 630, boxY + 30);
    ctx.fillText('$600.00', paperX + 645, boxY + 60);

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#0f766e';
    ctx.fillText('TOTAL DUE:', paperX + 440, boxY + 105);
    ctx.fillText('$8,100.00', paperX + 610, boxY + 105);

    // Paid Stamp
    ctx.save();
    ctx.translate(paperX + 180, boxY + 50);
    ctx.rotate(-0.2);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 4;
    ctx.strokeRect(-80, -25, 160, 50);
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('APPROVED', -65, 8);
    ctx.restore();

    // Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText('Thank you for your business! Payment is requested via wire transfer within 30 days.', paperX + 40, paperH - 40);
  } else if (type === 'receipt') {
    title = 'Artisan Cafe Receipt';
    ocrText = `THE ARTISAN ROASTERY
452 Market Street, Downtown
Tel: (415) 555-0199
Order #: 4082
Cashier: Sarah M.
Date: 10/15/2026 09:24 AM

1x Oat Milk Cortado      $5.50
1x Avocado Toast Tartine $12.00
1x Cold Brew (Large)     $6.00
1x Almond Croissant      $4.75

Subtotal:                $28.25
Sales Tax (9.25%):        $2.61
Tip:                      $4.00
TOTAL CHARGED:           $34.86
Paid with Visa **** 9821
Auth Code: 894021

WiFi: ArtisanGuest / coffee2026
Thanks for stopping by!`;

    // Long receipt shape
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('THE ARTISAN ROASTERY', paperX + 180, paperY + 80);
    ctx.font = '16px monospace';
    ctx.fillText('452 Market Street, Downtown', paperX + 220, paperY + 115);
    ctx.fillText('Order #: 4082 • 10/15/2026 09:24 AM', paperX + 190, paperY + 145);

    // Dashed divider
    ctx.strokeStyle = '#64748b';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(paperX + 50, paperY + 175);
    ctx.lineTo(paperX + paperW - 50, paperY + 175);
    ctx.stroke();
    ctx.setLineDash([]);

    // Items
    const lines = [
      ['1x Oat Milk Cortado', '$5.50'],
      ['1x Avocado Toast Tartine', '$12.00'],
      ['1x Cold Brew (Large)', '$6.00'],
      ['1x Almond Croissant', '$4.75'],
    ];

    let rY = paperY + 230;
    ctx.font = '18px monospace';
    lines.forEach(([item, price]) => {
      ctx.fillText(item, paperX + 60, rY);
      ctx.fillText(price, paperX + 580, rY);
      rY += 45;
    });

    ctx.strokeStyle = '#64748b';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(paperX + 50, rY + 10);
    ctx.lineTo(paperX + paperW - 50, rY + 10);
    ctx.stroke();
    ctx.setLineDash([]);

    rY += 50;
    ctx.fillText('Subtotal:', paperX + 60, rY);
    ctx.fillText('$28.25', paperX + 580, rY);
    rY += 35;
    ctx.fillText('Tax (9.25%):', paperX + 60, rY);
    ctx.fillText('$2.61', paperX + 590, rY);
    rY += 35;
    ctx.fillText('Tip:', paperX + 60, rY);
    ctx.fillText('$4.00', paperX + 590, rY);

    rY += 45;
    ctx.font = 'bold 24px monospace';
    ctx.fillText('TOTAL:', paperX + 60, rY);
    ctx.fillText('$34.86', paperX + 560, rY);

    // Barcode at bottom
    rY += 80;
    for (let x = paperX + 150; x < paperX + 580; x += 6) {
      if (Math.random() > 0.3) {
        ctx.fillRect(x, rY, 4, 60);
      }
    }
  } else if (type === 'contract') {
    title = 'Master Services Agreement (NDA)';
    ocrText = `MUTUAL NON-DISCLOSURE AGREEMENT
This Agreement is entered into as of October 12, 2026, by and between:
Party A: Horizon Digital Ventures LLC
Party B: Apex Technologies Inc.

1. PURPOSE & CONFIDENTIALITY
The parties wish to explore a business opportunity of mutual interest. 
In connection with this, each party may disclose Proprietary Information.
Each party agrees to hold all confidential information in strict confidence 
and prevent unauthorized disclosure or reproduction.

2. TERM AND TERMINATION
This Agreement shall remain in effect for a period of three (3) years.

IN WITNESS WHEREOF, the parties have executed this Agreement:
Party A: David Miller, CEO
Party B: Elena Rostova, VP Engineering
Signature: Verified on blockchain record #7731`;

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 26px serif';
    ctx.fillText('MUTUAL NON-DISCLOSURE AGREEMENT', paperX + 80, paperY + 90);

    ctx.font = '16px serif';
    ctx.fillStyle = '#334155';
    const paragraphs = [
      'This Non-Disclosure Agreement ("Agreement") is executed as of October 12, 2026.',
      'PARTIES: Horizon Digital Ventures LLC ("Party A") and Apex Technologies Inc. ("Party B").',
      '1. Confidential Information: Both parties agree to safeguard proprietary trade secrets, software architectures, algorithms, and financial projections.',
      '2. Non-Disclosure Obligations: Recipient will exercise standard of care to prevent unauthorized dissemination.',
      '3. Term: The non-disclosure obligations shall endure for three (3) years from date of disclosure.',
    ];

    let pY = paperY + 160;
    paragraphs.forEach((p) => {
      ctx.fillText(p, paperX + 60, pY, paperW - 120);
      pY += 50;
    });

    // Signature blocks
    pY += 80;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('ACCEPTED AND AGREED:', paperX + 60, pY);

    pY += 60;
    ctx.font = '14px sans-serif';
    ctx.fillText('Party A Representative:', paperX + 60, pY);
    ctx.fillText('Party B Representative:', paperX + 420, pY);

    // Realistic cursive signature lines
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(paperX + 60, pY + 45);
    ctx.bezierCurveTo(paperX + 110, pY + 15, paperX + 150, pY + 70, paperX + 220, pY + 40);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(paperX + 420, pY + 45);
    ctx.bezierCurveTo(paperX + 470, pY + 10, paperX + 510, pY + 75, paperX + 580, pY + 35);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.fillText('David Miller, CEO', paperX + 60, pY + 75);
    ctx.fillText('Elena Rostova, VP Engineering', paperX + 420, pY + 75);
  } else {
    // ID Badge
    title = 'Official ID Pass - DevSummit 2026';
    ocrText = `GLOBAL TECH SUMMIT 2026
OFFICIAL ATTENDEE BADGE
Name: ALEX CHEN
Role: Senior Staff Architect
Company: Nexus Systems
Badge ID: DEVSUM-88291-VIP
Access Level: All-Access VIP / Keynote Speaker
Valid: October 14 - 18, 2026`;

    // ID Badge card
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(paperX, paperY, paperW, 140);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('GLOBAL TECH SUMMIT', paperX + 60, paperY + 70);
    ctx.font = '18px sans-serif';
    ctx.fillText('SAN FRANCISCO • 2026', paperX + 60, paperY + 105);

    // Profile photo placeholder
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(paperX + 60, paperY + 200, 180, 220);
    ctx.strokeStyle = '#94a3b8';
    ctx.strokeRect(paperX + 60, paperY + 200, 180, 220);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('ALEX CHEN', paperX + 280, paperY + 250);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Senior Staff Architect', paperX + 280, paperY + 285);
    ctx.fillText('Nexus Systems', paperX + 280, paperY + 315);

    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('ALL-ACCESS VIP SPEAKER', paperX + 280, paperY + 380);
  }

  ctx.restore();

  // Compute the 4 natural paper corners in the canvas coordinate system
  let naturalCorners: QuadCorners;
  if (skewed) {
    // Exact mathematical projection of the paper corners under the tilt
    naturalCorners = {
      topLeft: { x: 180, y: 135 },
      topRight: { x: 865, y: 92 },
      bottomRight: { x: 810, y: 1180 },
      bottomLeft: { x: 135, y: 1225 },
    };
  } else {
    naturalCorners = {
      topLeft: { x: Math.round(paperX * 0.9 + w * 0.05), y: Math.round(paperY * 0.9 + h * 0.05) },
      topRight: { x: Math.round((paperX + paperW) * 0.9 + w * 0.05), y: Math.round(paperY * 0.9 + h * 0.05) },
      bottomRight: { x: Math.round((paperX + paperW) * 0.9 + w * 0.05), y: Math.round((paperY + paperH) * 0.9 + h * 0.05) },
      bottomLeft: { x: Math.round(paperX * 0.9 + w * 0.05), y: Math.round((paperY + paperH) * 0.9 + h * 0.05) },
    };
  }

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    naturalCorners,
    width: w,
    height: h,
    title,
    ocrText,
  };
}

/**
 * Initializes default starter documents if database is fresh
 */
export function createStarterDocuments(): DocumentEntity[] {
  const invoice = generateSampleDocumentDataUrl('invoice', true);
  const receipt = generateSampleDocumentDataUrl('receipt', true);

  const doc1Page: PageEntity = {
    id: 'page_inv_1',
    pageNumber: 1,
    originalImage: invoice.dataUrl,
    croppedImage: invoice.dataUrl,
    processedImage: invoice.dataUrl,
    corners: invoice.naturalCorners,
    rotation: 0,
    aspectRatio: invoice.width / invoice.height,
    filters: {
      filterType: 'magic',
      brightness: 5,
      contrast: 15,
      sharpness: 25,
    },
    ocr: {
      text: invoice.ocrText,
      language: 'en',
      confidence: 0.98,
      extractedAt: new Date().toISOString(),
      keyFields: {
        title: 'Acme Innovations Invoice',
        date: 'October 14, 2026',
        totalAmount: '$8,100.00',
        invoiceNumber: 'INV-2026-894',
        vendor: 'Acme Innovations Inc.',
        summary: 'Cloud Architecture & AI Pipeline service billing for October 2026.',
      },
    },
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  };

  const doc2Page: PageEntity = {
    id: 'page_rec_1',
    pageNumber: 1,
    originalImage: receipt.dataUrl,
    croppedImage: receipt.dataUrl,
    processedImage: receipt.dataUrl,
    corners: receipt.naturalCorners,
    rotation: 0,
    aspectRatio: receipt.width / receipt.height,
    filters: {
      filterType: 'magic',
      brightness: 10,
      contrast: 20,
      sharpness: 10,
    },
    ocr: {
      text: receipt.ocrText,
      language: 'en',
      confidence: 0.96,
      extractedAt: new Date().toISOString(),
      keyFields: {
        title: 'The Artisan Roastery Receipt',
        date: '10/15/2026 09:24 AM',
        totalAmount: '$34.86',
        vendor: 'The Artisan Roastery',
        summary: 'Breakfast order: Oat milk cortado, avocado toast tartine, cold brew.',
      },
    },
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  };

  return [
    {
      id: 'doc_acme_invoice',
      title: 'Acme Innovations - Invoice #INV-2026-894',
      category: 'invoices',
      pages: [doc1Page],
      thumbnail: invoice.dataUrl,
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      tags: ['Work', 'Tax', 'Paid'],
      isFavorite: true,
    },
    {
      id: 'doc_artisan_receipt',
      title: 'Artisan Roastery Expense Receipt',
      category: 'receipts',
      pages: [doc2Page],
      thumbnail: receipt.dataUrl,
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      tags: ['Food', 'Expense'],
      isFavorite: false,
    },
  ];
}
