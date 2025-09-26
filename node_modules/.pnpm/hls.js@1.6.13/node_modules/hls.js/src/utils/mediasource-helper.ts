import type { BaseTrackSet } from '../types/buffer';

export function getMediaSource(
  preferManagedMediaSource = true,
): typeof MediaSource | undefined {
  if (typeof self === 'undefined') return undefined;
  const mms =
    (preferManagedMediaSource || !self.MediaSource) &&
    ((self as any).ManagedMediaSource as undefined | typeof MediaSource);
  return (
    mms ||
    self.MediaSource ||
    ((self as any).WebKitMediaSource as typeof MediaSource)
  );
}

export function isManagedMediaSource(source: typeof MediaSource | undefined) {
  return (
    typeof self !== 'undefined' && source === (self as any).ManagedMediaSource
  );
}

export function isCompatibleTrackChange(
  currentTracks: BaseTrackSet,
  requiredTracks: BaseTrackSet,
): boolean {
  const trackNames = Object.keys(currentTracks);
  const requiredTrackNames = Object.keys(requiredTracks);
  const trackCount = trackNames.length;
  const requiredTrackCount = requiredTrackNames.length;
  return (
    !trackCount ||
    !requiredTrackCount ||
    (trackCount === requiredTrackCount &&
      !trackNames.some((name) => requiredTrackNames.indexOf(name) === -1))
  );
}
