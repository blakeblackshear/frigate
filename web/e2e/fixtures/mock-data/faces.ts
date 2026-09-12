/**
 * Face library factories.
 *
 * The /api/faces endpoint returns a record keyed by collection name
 * with the list of face image filenames. Grouped training attempts
 * live under the "train" key with filenames of the form
 * `${event_id}-${timestamp}-${label}-${score}.webp`.
 *
 * Used by face-library.spec.ts and chat.spec.ts (attachment chip).
 */

export type FacesMock = Record<string, string[]>;

export function basicFacesMock(): FacesMock {
  return {
    alice: ["alice-1.webp", "alice-2.webp"],
    bob: ["bob-1.webp"],
    charlie: ["charlie-1.webp"],
  };
}

export function emptyFacesMock(): FacesMock {
  return {};
}

/**
 * Adds a grouped recent-recognition training attempt to an existing
 * faces mock. The grouping key on the backend is the event id — so
 * images with the same event-id prefix render as one dialog-able card.
 */
export function withGroupedTrainingAttempt(
  base: FacesMock,
  opts: {
    eventId: string;
    attempts: Array<{ timestamp: number; label: string; score: number }>;
  },
): FacesMock {
  const trainImages = opts.attempts.map(
    (a) => `${opts.eventId}-${a.timestamp}-${a.label}-${a.score}.webp`,
  );
  return {
    ...base,
    train: [...(base.train ?? []), ...trainImages],
  };
}
