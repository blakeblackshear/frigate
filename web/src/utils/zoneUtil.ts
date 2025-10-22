import { isValidCameraName } from "./cameraUtil.ts";
import { generateFixedHash } from "./stringUtil.ts";

export function processZoneName(userInput: string): {
  finalZoneName: string;
  friendlyName?: string;
} {
  const normalizedInput = userInput.replace(/\s+/g, "_").toLowerCase();

  if (isValidCameraName(normalizedInput)) {
    return {
      finalZoneName: normalizedInput,
      friendlyName: userInput.includes(" ") ? userInput : undefined,
    };
  }

  return {
    finalZoneName: generateFixedHash(userInput, "zone"),
    friendlyName: userInput,
  };
}
