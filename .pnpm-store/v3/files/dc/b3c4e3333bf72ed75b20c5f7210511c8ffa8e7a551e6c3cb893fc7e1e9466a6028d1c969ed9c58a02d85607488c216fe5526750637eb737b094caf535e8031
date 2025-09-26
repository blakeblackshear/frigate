declare global {
  interface ArrayBuffer {
    ' buffer_kind'?: 'array';
  }
  interface Uint8Array {
    ' buffer_kind'?: 'uint8';
  }
}

export type SourceBufferName = 'video' | 'audio' | 'audiovideo';

/* eslint-disable no-restricted-globals */
// `SourceBuffer` global is restricted for is-supported check with prefixed MSE
export type ExtendedSourceBuffer = SourceBuffer & {
  onbufferedchange?: ((this: SourceBuffer, ev: Event) => any) | null;
};
/* eslint-enable no-restricted-globals */

export interface BaseTrack {
  id: 'audio' | 'main';
  container: string;
  codec?: string;
  supplemental?: string;
  encrypted?: boolean;
  levelCodec?: string;
  pendingCodec?: string;
  metadata?: {
    channelCount?: number;
    width?: number;
    height?: number;
  };
}

export interface ParsedTrack extends BaseTrack {
  initSegment?: Uint8Array;
}
export interface SourceBufferTrack extends BaseTrack {
  buffer?: ExtendedSourceBuffer;
  listeners: SourceBufferListener[];
  ending?: boolean;
  ended?: boolean;
}

export interface PendingSourceBufferTrack extends SourceBufferTrack {
  buffer: undefined;
}

export interface BufferCreatedTrack extends BaseTrack {
  buffer: ExtendedSourceBuffer;
}

export type ParsedTrackSet = Partial<Record<SourceBufferName, ParsedTrack>>;

export type BaseTrackSet = Partial<Record<SourceBufferName, BaseTrack>>;

export type SourceBufferTrackSet = Partial<
  Record<SourceBufferName, SourceBufferTrack>
>;

export type BufferCreatedTrackSet = Partial<
  Record<SourceBufferName, BufferCreatedTrack>
>;

export type EmptyTuple = [null, null];

export type SourceBuffersTuple = [
  (
    | [Extract<SourceBufferName, 'video' | 'audiovideo'>, ExtendedSourceBuffer]
    | EmptyTuple
  ),
  [Extract<SourceBufferName, 'audio'>, ExtendedSourceBuffer] | EmptyTuple,
];

export type MediaOverrides = {
  duration?: number;
  endOfStream?: boolean;
  cueRemoval?: boolean;
};

export interface BufferOperationQueues {
  video: Array<BufferOperation>;
  audio: Array<BufferOperation>;
  audiovideo: Array<BufferOperation>;
}

export interface BufferOperation {
  label: string;
  execute: Function;
  onStart: Function;
  onComplete: Function;
  onError: Function;
  start?: number;
  end?: number;
}

export interface SourceBufferListener {
  event: string;
  listener: EventListener;
}

export type AttachMediaSourceData = {
  media: HTMLMediaElement;
  mediaSource: MediaSource | null;
  tracks: SourceBufferTrackSet;
};
