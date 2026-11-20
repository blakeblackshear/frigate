// HEIC/HEIF is the default photo format on iPhones. The backend decodes
// uploads with OpenCV, which has no HEIC support, and only Safari can preview
// it, so HEIC images are converted to JPEG in the browser before upload.

export const HEIC_EXTENSIONS = [".heic", ".heif"];

const HEIC_MIME_TYPES = [
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
];

/**
 * Check whether a file is HEIC/HEIF. The extension is checked as well as the
 * MIME type because browsers on systems without a HEIF codec installed (such
 * as Windows) report an empty type for these files.
 */
export function isHeicFile(file: File): boolean {
  if (HEIC_MIME_TYPES.includes(file.type.toLowerCase())) {
    return true;
  }

  const name = file.name.toLowerCase();
  return HEIC_EXTENSIONS.some((extension) => name.endsWith(extension));
}

/**
 * Convert a HEIC/HEIF file to a JPEG file. Orientation is applied during
 * decoding, so the output pixels are already upright.
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  // the decoder is a large WASM bundle, so it is only fetched when needed
  const { heicTo } = await import("heic-to");
  const jpeg = await heicTo({
    blob: file,
    type: "image/jpeg",
    // faces are cropped and re-encoded by the backend, keep detail here
    quality: 0.95,
  });
  const baseName = file.name.replace(/\.hei[cf]$/i, "") || "image";

  return new File([jpeg], `${baseName}.jpg`, { type: "image/jpeg" });
}
