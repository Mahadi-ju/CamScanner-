/**
 * Domain Logic: Computer Vision, Edge Detection, Homography Perspective Warp, and Enhancement Filters
 */

import { Point2D, QuadCorners, FilterSettings } from './models';

/**
 * Calculates Euclidean distance between two points
 */
export function distance(p1: Point2D, p2: Point2D): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Solves 8-parameter Projective Transformation Matrix (Homography)
 * Maps source quadrilateral points to destination rectangle (0,0) -> (w,h)
 * [x, y, 1]^T = H * [u, v, 1]^T
 */
export function getPerspectiveTransformMatrix(
  src: QuadCorners,
  w: number,
  h: number
): number[] {
  // Destination points in rectangle
  const dstPts = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];

  const srcPts = [src.topLeft, src.topRight, src.bottomRight, src.bottomLeft];

  // We solve system A * h = b for 8 parameters [h00, h01, h02, h10, h11, h12, h20, h21] with h22 = 1
  // mapping (u, v) in dst to (x, y) in src (Inverse mapping for backward sampling)
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const u = dstPts[i].x;
    const v = dstPts[i].y;
    const x = srcPts[i].x;
    const y = srcPts[i].y;

    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    b.push(x);

    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    b.push(y);
  }

  // Gaussian elimination with partial pivoting
  const n = 8;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }

    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    [b[i], b[maxRow]] = [b[maxRow], b[i]];

    const pivot = A[i][i];
    if (Math.abs(pivot) < 1e-10) continue;

    for (let j = i; j < n; j++) {
      A[i][j] /= pivot;
    }
    b[i] /= pivot;

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = A[k][i];
        for (let j = i; j < n; j++) {
          A[k][j] -= factor * A[i][j];
        }
        b[k] -= factor * b[i];
      }
    }
  }

  // [h00, h01, h02, h10, h11, h12, h20, h21, 1]
  return [b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], 1.0];
}

/**
 * Bilinear perspective warp from Quad to Rectangle
 */
export function warpPerspective(
  source: HTMLImageElement | HTMLCanvasElement,
  corners: QuadCorners,
  targetWidth?: number,
  targetHeight?: number
): HTMLCanvasElement {
  // Determine natural target dimensions based on quad geometry
  const widthTop = distance(corners.topLeft, corners.topRight);
  const widthBottom = distance(corners.bottomLeft, corners.bottomRight);
  const avgWidth = Math.max(100, Math.round((widthTop + widthBottom) / 2));

  const heightLeft = distance(corners.topLeft, corners.bottomLeft);
  const heightRight = distance(corners.topRight, corners.bottomRight);
  const avgHeight = Math.max(100, Math.round((heightLeft + heightRight) / 2));

  // Cap max resolution for snappy real-time performance on mobile while keeping crisp detail
  const maxDim = 1600;
  let finalWidth = targetWidth || avgWidth;
  let finalHeight = targetHeight || avgHeight;

  if (finalWidth > maxDim || finalHeight > maxDim) {
    const scale = maxDim / Math.max(finalWidth, finalHeight);
    finalWidth = Math.round(finalWidth * scale);
    finalHeight = Math.round(finalHeight * scale);
  }

  // Get source canvas & image data
  let srcCanvas: HTMLCanvasElement;
  let srcCtx: CanvasRenderingContext2D;

  if (source instanceof HTMLCanvasElement) {
    srcCanvas = source;
    srcCtx = srcCanvas.getContext('2d')!;
  } else {
    srcCanvas = document.createElement('canvas');
    srcCanvas.width = source.naturalWidth || source.width;
    srcCanvas.height = source.naturalHeight || source.height;
    srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.drawImage(source, 0, 0);
  }

  const srcW = srcCanvas.width;
  const srcH = srcCanvas.height;
  const srcImgData = srcCtx.getImageData(0, 0, srcW, srcH);
  const srcPixels = srcImgData.data;

  // Destination canvas
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = finalWidth;
  dstCanvas.height = finalHeight;
  const dstCtx = dstCanvas.getContext('2d')!;
  const dstImgData = dstCtx.createImageData(finalWidth, finalHeight);
  const dstPixels = dstImgData.data;

  // Compute inverse homography matrix
  const H = getPerspectiveTransformMatrix(corners, finalWidth, finalHeight);
  const [h00, h01, h02, h10, h11, h12, h20, h21, h22] = H;

  // Sample each pixel in destination via inverse projection with bilinear interpolation
  let dstIdx = 0;
  for (let v = 0; v < finalHeight; v++) {
    for (let u = 0; u < finalWidth; u++) {
      const z = h20 * u + h21 * v + h22;
      const x = (h00 * u + h01 * v + h02) / z;
      const y = (h10 * u + h11 * v + h12) / z;

      if (x >= 0 && x < srcW - 1 && y >= 0 && y < srcH - 1) {
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const dx = x - x0;
        const dy = y - y0;
        const w00 = (1 - dx) * (1 - dy);
        const w01 = dx * (1 - dy);
        const w10 = (1 - dx) * dy;
        const w11 = dx * dy;

        const idx00 = (y0 * srcW + x0) * 4;
        const idx01 = (y0 * srcW + x1) * 4;
        const idx10 = (y1 * srcW + x0) * 4;
        const idx11 = (y1 * srcW + x1) * 4;

        dstPixels[dstIdx] = Math.round(
          srcPixels[idx00] * w00 +
          srcPixels[idx01] * w01 +
          srcPixels[idx10] * w10 +
          srcPixels[idx11] * w11
        );
        dstPixels[dstIdx + 1] = Math.round(
          srcPixels[idx00 + 1] * w00 +
          srcPixels[idx01 + 1] * w01 +
          srcPixels[idx10 + 1] * w10 +
          srcPixels[idx11 + 1] * w11
        );
        dstPixels[dstIdx + 2] = Math.round(
          srcPixels[idx00 + 2] * w00 +
          srcPixels[idx01 + 2] * w01 +
          srcPixels[idx10 + 2] * w10 +
          srcPixels[idx11 + 2] * w11
        );
        dstPixels[dstIdx + 3] = 255;
      } else {
        // Edge boundaries or slight out-of-bounds fallback
        const clampedX = Math.max(0, Math.min(srcW - 1, Math.round(x)));
        const clampedY = Math.max(0, Math.min(srcH - 1, Math.round(y)));
        const srcIdx = (clampedY * srcW + clampedX) * 4;
        dstPixels[dstIdx] = srcPixels[srcIdx];
        dstPixels[dstIdx + 1] = srcPixels[srcIdx + 1];
        dstPixels[dstIdx + 2] = srcPixels[srcIdx + 2];
        dstPixels[dstIdx + 3] = 255;
      }
      dstIdx += 4;
    }
  }

  dstCtx.putImageData(dstImgData, 0, 0);
  return dstCanvas;
}

/**
 * Computer Vision: Detects document corners from an image using edge gradients and quadrant contours
 */
export function detectDocumentCorners(
  source: HTMLImageElement | HTMLCanvasElement
): QuadCorners {
  const width = source instanceof HTMLImageElement ? (source.naturalWidth || source.width) : source.width;
  const height = source instanceof HTMLImageElement ? (source.naturalHeight || source.height) : source.height;

  // Safe fallback default if detection fails or low contrast (8% inset)
  const defaultCorners: QuadCorners = {
    topLeft: { x: Math.round(width * 0.08), y: Math.round(height * 0.08) },
    topRight: { x: Math.round(width * 0.92), y: Math.round(height * 0.08) },
    bottomRight: { x: Math.round(width * 0.92), y: Math.round(height * 0.92) },
    bottomLeft: { x: Math.round(width * 0.08), y: Math.round(height * 0.92) },
  };

  try {
    // Work on downsampled canvas for speed
    const sampleW = 200;
    const sampleH = Math.round((height / width) * sampleW);
    const canvas = document.createElement('canvas');
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return defaultCorners;

    ctx.drawImage(source, 0, 0, sampleW, sampleH);
    const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
    const pixels = imgData.data;

    // Convert to grayscale
    const gray = new Uint8Array(sampleW * sampleH);
    for (let i = 0; i < gray.length; i++) {
      const idx = i * 4;
      gray[i] = Math.round(0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]);
    }

    // Sobel gradient magnitude
    const edges = new Uint8Array(sampleW * sampleH);
    let edgeCount = 0;
    let sumGrad = 0;

    for (let y = 1; y < sampleH - 1; y++) {
      for (let x = 1; x < sampleW - 1; x++) {
        const idx = y * sampleW + x;
        // Horizontal gradient Gx
        const gx =
          -gray[idx - sampleW - 1] + gray[idx - sampleW + 1] +
          -2 * gray[idx - 1] + 2 * gray[idx + 1] +
          -gray[idx + sampleW - 1] + gray[idx + sampleW + 1];

        // Vertical gradient Gy
        const gy =
          -gray[idx - sampleW - 1] - 2 * gray[idx - sampleW] - gray[idx - sampleW + 1] +
          gray[idx + sampleW - 1] + 2 * gray[idx + sampleW] + gray[idx + sampleW + 1];

        const mag = Math.min(255, Math.hypot(gx, gy));
        edges[idx] = mag;
        sumGrad += mag;
      }
    }

    const avgGrad = sumGrad / (sampleW * sampleH);
    const threshold = Math.max(35, avgGrad * 1.8);

    // Find extreme candidate corner points in four quadrants
    // Quadrants:
    // Top-Left: x < sampleW * 0.5, y < sampleH * 0.5 -> minimize (x + y)
    // Top-Right: x >= sampleW * 0.5, y < sampleH * 0.5 -> maximize (x - y)
    // Bottom-Right: x >= sampleW * 0.5, y >= sampleH * 0.5 -> maximize (x + y)
    // Bottom-Left: x < sampleW * 0.5, y >= sampleH * 0.5 -> minimize (x - y)

    let bestTL = { x: sampleW * 0.1, y: sampleH * 0.1, score: Infinity };
    let bestTR = { x: sampleW * 0.9, y: sampleH * 0.1, score: -Infinity };
    let bestBR = { x: sampleW * 0.9, y: sampleH * 0.9, score: -Infinity };
    let bestBL = { x: sampleW * 0.1, y: sampleH * 0.9, score: Infinity };

    let foundEdges = false;
    for (let y = 2; y < sampleH - 2; y++) {
      for (let x = 2; x < sampleW - 2; x++) {
        const idx = y * sampleW + x;
        if (edges[idx] > threshold) {
          foundEdges = true;
          // TL
          if (x < sampleW * 0.5 && y < sampleH * 0.5) {
            const score = x + y;
            if (score < bestTL.score) {
              bestTL = { x, y, score };
            }
          }
          // TR
          if (x >= sampleW * 0.5 && y < sampleH * 0.5) {
            const score = x - y;
            if (score > bestTR.score) {
              bestTR = { x, y, score };
            }
          }
          // BR
          if (x >= sampleW * 0.5 && y >= sampleH * 0.5) {
            const score = x + y;
            if (score > bestBR.score) {
              bestBR = { x, y, score };
            }
          }
          // BL
          if (x < sampleW * 0.5 && y >= sampleH * 0.5) {
            const score = x - y;
            if (score < bestBL.score) {
              bestBL = { x, y, score };
            }
          }
        }
      }
    }

    if (!foundEdges) {
      return defaultCorners;
    }

    // Scale back to original dimensions
    const scaleX = width / sampleW;
    const scaleY = height / sampleH;

    const detected: QuadCorners = {
      topLeft: {
        x: Math.round(bestTL.x * scaleX),
        y: Math.round(bestTL.y * scaleY),
      },
      topRight: {
        x: Math.round(bestTR.x * scaleX),
        y: Math.round(bestTR.y * scaleY),
      },
      bottomRight: {
        x: Math.round(bestBR.x * scaleX),
        y: Math.round(bestBR.y * scaleY),
      },
      bottomLeft: {
        x: Math.round(bestBL.x * scaleX),
        y: Math.round(bestBL.y * scaleY),
      },
    };

    // Sanity check: Ensure area is reasonable (at least 20% of image area)
    const area = 0.5 * Math.abs(
      (detected.topLeft.x * detected.topRight.y - detected.topRight.x * detected.topLeft.y) +
      (detected.topRight.x * detected.bottomRight.y - detected.bottomRight.x * detected.topRight.y) +
      (detected.bottomRight.x * detected.bottomLeft.y - detected.bottomLeft.x * detected.bottomRight.y) +
      (detected.bottomLeft.x * detected.topLeft.y - detected.topLeft.x * detected.bottomLeft.y)
    );

    if (area < width * height * 0.15) {
      return defaultCorners;
    }

    return detected;
  } catch (err) {
    console.warn('Auto edge detection fallback triggered:', err);
    return defaultCorners;
  }
}

/**
 * Applies CamScanner filters and adjustments to a Canvas
 */
export function applyImageFilters(
  srcCanvas: HTMLCanvasElement,
  settings: FilterSettings
): HTMLCanvasElement {
  const width = srcCanvas.width;
  const height = srcCanvas.height;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext('2d')!;

  // Copy raw image first
  outCtx.drawImage(srcCanvas, 0, 0);

  const imgData = outCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Filter type pass
  switch (settings.filterType) {
    case 'grayscale': {
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = lum;
        data[i + 1] = lum;
        data[i + 2] = lum;
      }
      break;
    }

    case 'bw': {
      // High-contrast document binarization with adaptive threshold
      const thresh = settings.threshold ?? 135;
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const val = lum >= thresh ? 255 : 0;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
      break;
    }

    case 'magic': {
      // CamScanner Magic Color:
      // 1. Boost contrast
      // 2. Suppress paper shadows (lift background above 175 to near 255)
      // 3. Saturate text ink pigments
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        if (lum > 175) {
          // Flatten paper background to clean paper white
          const factor = (lum - 175) / (255 - 175);
          r = Math.min(255, r + 45 * factor);
          g = Math.min(255, g + 45 * factor);
          b = Math.min(255, b + 45 * factor);
        } else {
          // Darken ink text for razor clarity
          r = Math.max(0, r * 0.85);
          g = Math.max(0, g * 0.85);
          b = Math.max(0, b * 0.85);
        }

        // Slight contrast expansion
        r = Math.min(255, Math.max(0, (r - 128) * 1.25 + 128));
        g = Math.min(255, Math.max(0, (g - 128) * 1.25 + 128));
        b = Math.min(255, Math.max(0, (b - 128) * 1.25 + 128));

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }
      break;
    }

    case 'lighten': {
      // Lighten shadows without washing out ink
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * 1.2 + 20);
        data[i + 1] = Math.min(255, data[i + 1] * 1.2 + 20);
        data[i + 2] = Math.min(255, data[i + 2] * 1.2 + 20);
      }
      break;
    }

    case 'blueprint': {
      // Inverted blueprint aesthetic
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Blue background (0x10, 0x30, 0x60), white lines
        const inv = 255 - lum;
        data[i] = Math.round(15 + inv * 0.9);
        data[i + 1] = Math.round(50 + inv * 0.8);
        data[i + 2] = Math.round(120 + inv * 0.5);
      }
      break;
    }

    case 'original':
    default:
      // No base filter
      break;
  }

  // Sliders: Brightness & Contrast
  if (settings.brightness !== 0 || settings.contrast !== 0) {
    const b = settings.brightness * 1.28; // -128 to 128
    const c = (settings.contrast + 100) / 100; // 0 to 2
    const factor = c * c;

    for (let i = 0; i < data.length; i += 4) {
      // Apply contrast
      let r = (data[i] - 128) * factor + 128 + b;
      let g = (data[i + 1] - 128) * factor + 128 + b;
      let bl = (data[i + 2] - 128) * factor + 128 + b;

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, bl));
    }
  }

  outCtx.putImageData(imgData, 0, 0);

  // Sharpness pass using convolution kernel
  if (settings.sharpness > 0) {
    const sharpCanvas = document.createElement('canvas');
    sharpCanvas.width = width;
    sharpCanvas.height = height;
    const sharpCtx = sharpCanvas.getContext('2d')!;

    const srcCopy = outCtx.getImageData(0, 0, width, height);
    const srcBuf = srcCopy.data;
    const sharpData = sharpCtx.createImageData(width, height);
    const sharpBuf = sharpData.data;

    // Unsharp mask kernel strength
    const weight = (settings.sharpness / 100) * 0.8;
    const center = 1 + 4 * weight;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        for (let c = 0; c < 3; c++) {
          const val =
            srcBuf[idx + c] * center -
            (srcBuf[((y - 1) * width + x) * 4 + c] +
             srcBuf[((y + 1) * width + x) * 4 + c] +
             srcBuf[(y * width + (x - 1)) * 4 + c] +
             srcBuf[(y * width + (x + 1)) * 4 + c]) * weight;

          sharpBuf[idx + c] = Math.max(0, Math.min(255, val));
        }
        sharpBuf[idx + 3] = srcBuf[idx + 3];
      }
    }

    sharpCtx.putImageData(sharpData, 0, 0);
    return sharpCanvas;
  }

  return outCanvas;
}

/**
 * Rotates a canvas by 90, 180, or 270 degrees
 */
export function rotateCanvas(
  source: HTMLCanvasElement,
  angleDegrees: number
): HTMLCanvasElement {
  const normalized = ((angleDegrees % 360) + 360) % 360;
  if (normalized === 0) return source;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  if (normalized === 90 || normalized === 270) {
    canvas.width = source.height;
    canvas.height = source.width;
  } else {
    canvas.width = source.width;
    canvas.height = source.height;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((normalized * Math.PI) / 180);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);

  return canvas;
}
