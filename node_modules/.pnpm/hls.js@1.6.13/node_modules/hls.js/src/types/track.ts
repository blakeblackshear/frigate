import type { BaseTrack } from './buffer';

export interface TrackSet {
  audio?: Track;
  video?: Track;
  audiovideo?: Track;
}

export interface Track extends BaseTrack {
  buffer?: SourceBuffer; // eslint-disable-line no-restricted-globals
  initSegment?: Uint8Array;
}
