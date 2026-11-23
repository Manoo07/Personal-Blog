/**
 * Client-side preparation for editor image uploads.
 *
 * Mirrors the backend contract in Personal-BlogServices/src/routes/images.ts:
 *   POST /api/admin/uploads/image  — multipart field "file"
 *   allowed: png, jpeg, gif, webp, avif (SVG rejected) · max 2 MB
 *
 * Oversized still images are downscaled / re-encoded to WebP in the browser
 * so pasted retina screenshots "just work" instead of failing with a 413.
 */

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"] as const;

const MAX_DIMENSION = 2400;

export class ImagePrepError extends Error {}

const formatMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImagePrepError(`Couldn't read "${file.name}" as an image.`));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Re-encode to WebP, shrinking until it fits under the size limit. */
async function compress(file: File): Promise<File> {
  const img = await loadImage(file);
  let scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));

  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.9, 0.8, 0.7]) {
      const blob = await canvasToBlob(canvas, "image/webp", quality);
      if (blob && blob.type === "image/webp" && blob.size <= MAX_IMAGE_BYTES) {
        const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
        return new File([blob], name, { type: "image/webp" });
      }
    }
    scale *= 0.75;
  }
  throw new ImagePrepError(`"${file.name}" is ${formatMB(file.size)} and couldn't be compressed under 2 MB.`);
}

/** Validate (and if needed compress) a file so the backend will accept it. */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new ImagePrepError(
      `"${file.name}" isn't supported (${file.type || "unknown type"}). Use PNG, JPEG, GIF, WebP or AVIF.`
    );
  }
  if (file.size === 0) throw new ImagePrepError(`"${file.name}" is empty.`);
  if (file.size <= MAX_IMAGE_BYTES) return file;

  // Re-encoding would drop GIF animation, so ask for a smaller file instead
  if (file.type === "image/gif") {
    throw new ImagePrepError(`"${file.name}" is ${formatMB(file.size)}; animated GIFs must be under 2 MB.`);
  }
  return compress(file);
}

/** Pasted screenshots are all called "image.png" — give them a useful name. */
export function withSensibleName(file: File): File {
  if (file.name && file.name !== "image.png") return file;
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  const ext = file.type.split("/")[1] || "png";
  return new File([file], `pasted-${stamp}.${ext}`, { type: file.type });
}

/** Alt text derived from a filename: "my-diagram_v2.png" → "my diagram v2". */
export function altFromFilename(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "image";
}
