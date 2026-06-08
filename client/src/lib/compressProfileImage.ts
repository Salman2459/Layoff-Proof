/** Max edge length for resume profile photos (keeps PDF/preview payloads small). */
const MAX_DIMENSION = 480;
/** Target max JPEG size before base64 encoding (~370KB encoded). */
const MAX_BYTES = 280_000;
const INITIAL_QUALITY = 0.82;
const MIN_QUALITY = 0.45;
/** Skip re-encoding when the data URL is already small enough for API proxies. */
const MAX_DATA_URL_LENGTH = 380_000;

let cachedSource = "";
let cachedCompressed = "";

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image file."));
    };
    img.src = url;
  });
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image."));
    img.src = dataUrl;
  });
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to encode image."));
    reader.readAsDataURL(blob);
  });
}

async function renderToCanvas(img: HTMLImageElement): Promise<HTMLCanvasElement> {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h, 1));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");
  ctx.drawImage(img, 0, 0, tw, th);
  return canvas;
}

async function compressCanvasToDataUrl(canvas: HTMLCanvasElement): Promise<string> {
  let quality = INITIAL_QUALITY;
  while (quality >= MIN_QUALITY) {
    const blob = await canvasToJpegBlob(canvas, quality);
    if (!blob) break;
    if (blob.size <= MAX_BYTES || quality <= MIN_QUALITY) {
      return blobToDataUrl(blob);
    }
    quality -= 0.08;
  }
  const blob = await canvasToJpegBlob(canvas, MIN_QUALITY);
  if (!blob) throw new Error("Failed to compress image.");
  return blobToDataUrl(blob);
}

/** Resize and compress an uploaded file to a lightweight JPEG data URL. */
export async function compressImageFile(file: File): Promise<string> {
  const img = await loadImageFromFile(file);
  const canvas = await renderToCanvas(img);
  const result = await compressCanvasToDataUrl(canvas);
  cachedSource = result;
  cachedCompressed = result;
  return result;
}

/** Shrink an existing data URL before sending it in API JSON bodies. */
export async function compressProfileImageDataUrl(dataUrl: string): Promise<string> {
  const trimmed = dataUrl.trim();
  if (!trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.length <= MAX_DATA_URL_LENGTH) return trimmed;
  if (trimmed === cachedSource && cachedCompressed) return cachedCompressed;

  const img = await loadImageFromDataUrl(trimmed);
  const canvas = await renderToCanvas(img);
  const result = await compressCanvasToDataUrl(canvas);
  cachedSource = trimmed;
  cachedCompressed = result;
  return result;
}
