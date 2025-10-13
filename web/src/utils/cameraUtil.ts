/**
 * Generates a fixed-length hash from a camera name for use as a valid camera identifier.
 * Works safely with Unicode input while outputting Latin-only identifiers.
 *
 * @param name - The original camera name/display name
 * @returns A valid camera identifier (lowercase, alphanumeric, max 8 chars)
 */
export function generateFixedHash(name: string): string {
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

  return `cam_${cleanHash.toLowerCase()}`;
}

/**
 * Checks if a string is a valid camera name identifier.
 * Valid camera names contain only ASCII letters, numbers, underscores, and hyphens.
 *
 * @param name - The camera name to validate
 * @returns True if the name is valid, false otherwise
 */
export function isValidCameraName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * Processes a user-entered camera name and returns both the final camera name
 * and friendly name for Frigate configuration.
 *
 * @param userInput - The name entered by the user (could be display name)
 * @returns Object with finalCameraName and friendlyName
 */
export function processCameraName(userInput: string): {
  finalCameraName: string;
  friendlyName?: string;
} {
  const normalizedInput = userInput.replace(/\s+/g, "_").toLowerCase();

  if (isValidCameraName(normalizedInput)) {
    return {
      finalCameraName: normalizedInput,
      friendlyName: userInput.includes(" ") ? userInput : undefined,
    };
  }

  return {
    finalCameraName: generateFixedHash(userInput),
    friendlyName: userInput,
  };
}
