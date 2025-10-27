export const capitalizeFirstLetter = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const capitalizeAll = (text: string): string => {
  return text
    .replaceAll("_", " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Generates a fixed-length hash from a camera name for use as a valid camera identifier.
 * Works safely with Unicode input while outputting Latin-only identifiers.
 *
 * @param name - The original camera name/display name
 * @param prefix - Optional prefix for the identifier
 * @returns A valid camera identifier (lowercase, alphanumeric, max 8 chars)
 */
export function generateFixedHash(name: string, prefix: string = "id"): string {
  // Safely encode Unicode as UTF-8 bytes
  const utf8Bytes = new TextEncoder().encode(name);

  // Convert to base64 manually
  let binary = "";
  for (const byte of utf8Bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);

  // Strip out non-alphanumeric characters and truncate
  const cleanHash = base64.replace(/[^a-zA-Z0-9]/g, "").substring(0, 8);

  return `${prefix}_${cleanHash.toLowerCase()}`;
}

/**
 * Checks if a string is a valid camera name identifier.
 * Valid camera names contain only ASCII letters, numbers, underscores, and hyphens.
 *
 * @param name - The camera name to validate
 * @returns True if the name is valid, false otherwise
 */
export function isValidId(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}
