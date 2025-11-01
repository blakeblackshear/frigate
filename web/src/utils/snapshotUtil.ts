import { baseUrl } from "@/api/baseUrl";

type SnapshotResponse = {
  dataUrl: string;
  blob: Blob;
  contentType: string;
};

export type SnapshotResult =
  | {
      success: true;
      data: SnapshotResponse;
    }
  | {
      success: false;
      error: string;
    };

export async function fetchCameraSnapshot(
  name: string,
): Promise<SnapshotResult> {
  try {
    const url = `${baseUrl}api/${encodeURIComponent(name)}/latest.jpg`;

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Snapshot request failed with status ${response.status}`,
      };
    }

    const blob = await response.blob();

    if (!blob || blob.size === 0) {
      return {
        success: false,
        error: "Snapshot response was empty",
      };
    }

    const dataUrl = await blobToDataUrl(blob);
    const contentType = response.headers.get("content-type") ?? `image/jpeg`;

    return {
      success: true,
      data: {
        dataUrl,
        blob,
        contentType,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert blob to data URL"));
      }
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read snapshot blob"));
    };

    reader.readAsDataURL(blob);
  });
}

export function downloadSnapshot(dataUrl: string, filename: string): void {
  try {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to download snapshot for ${filename}:`, error);
  }
}

export function generateSnapshotFilename(cameraName: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  return `${cameraName}_snapshot_${timestamp}.jpg`;
}

export async function grabVideoSnapshot(): Promise<SnapshotResult> {
  try {
    // Find the video element in the player
    const videoElement = document.querySelector(
      "#player-container video",
    ) as HTMLVideoElement;

    if (!videoElement) {
      return {
        success: false,
        error: "Video element not found",
      };
    }

    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;

    if (width === 0 || height === 0) {
      return {
        success: false,
        error: "Video element has no dimensions",
      };
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      return {
        success: false,
        error: "Failed to get canvas context",
      };
    }

    context.drawImage(videoElement, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    return {
      success: true,
      data: {
        dataUrl,
        blob,
        contentType: "image/jpeg",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
