import { t } from "i18next";

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
  // Use the full UTF-8 bytes of the name and compute an FNV-1a 32-bit hash.
  // This is deterministic, fast, works with Unicode and avoids collisions from
  // simple truncation of base64 output.
  const utf8Bytes = new TextEncoder().encode(name);

  // FNV-1a 32-bit hash algorithm
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < utf8Bytes.length; i++) {
    hash ^= utf8Bytes[i];
    // Multiply by FNV prime (0x01000193) with 32-bit overflow
    hash = (hash >>> 0) * 0x01000193;
    // Ensure 32-bit unsigned integer
    hash >>>= 0;
  }

  // Convert to an 8-character lowercase hex string
  const hashHex = (hash >>> 0).toString(16).padStart(8, "0").toLowerCase();

  // Ensure the first character is a letter to avoid an identifier that's purely
  // numeric (isValidId forbids all-digit IDs). If it starts with a digit,
  // replace with 'a'. This is extremely unlikely but a simple safeguard.
  const safeHash = /^[0-9]/.test(hashHex[0]) ? `a${hashHex.slice(1)}` : hashHex;

  return `${prefix}_${safeHash}`;
}

/**
 * Checks if a string is a valid camera name identifier.
 * Valid camera names contain only ASCII letters, numbers, underscores, and hyphens.
 *
 * @param name - The camera name to validate
 * @returns True if the name is valid, false otherwise
 */
export function isValidId(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name) && !/^\d+$/.test(name);
}

/**
 * Formats a list of strings into a human-readable format with proper localization.
 * Handles different cases for empty, single-item, two-item, and multi-item lists.
 *
 * @param item - The array of strings to format
 * @returns A formatted string representation of the list
 */
export function formatList(item: string[]): string {
  if (item.length === 0) return "";
  if (item.length === 1) return item[0];
  if (item.length === 2) {
    return t("list.two", {
      0: item[0],
      1: item[1],
      ns: "common",
    });
  }

  const separatorWithSpace = t("list.separatorWithSpace", { ns: "common" });
  const allButLast = item.slice(0, -1).join(separatorWithSpace);
  return t("list.many", {
    items: allButLast,
    last: item[item.length - 1],
  });
}
