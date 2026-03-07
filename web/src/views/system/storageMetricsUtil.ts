import { RecordingRootStorage } from "@/components/storage/RecordingsRoots";

export function aggregateRecordingRoots(
  recordingRoots: RecordingRootStorage[],
): { used: number; total: number } {
  const seen = new Set<string>();

  return recordingRoots.reduce(
    (acc, root) => {
      // Prefer filesystem metadata for deduplication when available.
      // Fall back to path, which cannot deduplicate separate paths on the same mount.
      const dedupeKey = root.filesystem || root.path;

      if (seen.has(dedupeKey)) {
        return acc;
      }

      seen.add(dedupeKey);
      acc.used += root.used || 0;
      acc.total += root.total || 0;
      return acc;
    },
    { used: 0, total: 0 },
  );
}
