import type { Level } from '../types/level';
import type { MediaAttributes, MediaPlaylist } from '../types/media-playlist';

export function subtitleOptionsIdentical(
  trackList1: MediaPlaylist[] | Level[],
  trackList2: MediaPlaylist[],
): boolean {
  if (trackList1.length !== trackList2.length) {
    return false;
  }
  for (let i = 0; i < trackList1.length; i++) {
    if (
      !mediaAttributesIdentical(
        trackList1[i].attrs as MediaAttributes,
        trackList2[i].attrs,
      )
    ) {
      return false;
    }
  }
  return true;
}

export function mediaAttributesIdentical(
  attrs1: MediaAttributes,
  attrs2: MediaAttributes,
  customAttributes?: string[],
): boolean {
  // Media options with the same rendition ID must be bit identical
  const stableRenditionId = attrs1['STABLE-RENDITION-ID'];
  if (stableRenditionId && !customAttributes) {
    return stableRenditionId === attrs2['STABLE-RENDITION-ID'];
  }
  // When rendition ID is not present, compare attributes
  return !(
    customAttributes || [
      'LANGUAGE',
      'NAME',
      'CHARACTERISTICS',
      'AUTOSELECT',
      'DEFAULT',
      'FORCED',
      'ASSOC-LANGUAGE',
    ]
  ).some(
    (subtitleAttribute) =>
      attrs1[subtitleAttribute] !== attrs2[subtitleAttribute],
  );
}

export function subtitleTrackMatchesTextTrack(
  subtitleTrack: Pick<MediaPlaylist, 'name' | 'lang' | 'attrs'>,
  textTrack: TextTrack,
) {
  return (
    textTrack.label.toLowerCase() === subtitleTrack.name.toLowerCase() &&
    (!textTrack.language ||
      textTrack.language.toLowerCase() ===
        (subtitleTrack.lang || '').toLowerCase())
  );
}
