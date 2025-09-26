import { buildAbsoluteURL } from 'url-toolkit';
import { LoadStats } from './load-stats';
import type { LevelKey } from './level-key';
import type {
  FragmentLoaderContext,
  KeyLoaderContext,
  Loader,
  PlaylistLevelType,
} from '../types/loader';
import type { AttrList } from '../utils/attr-list';
import type { KeySystemFormats } from '../utils/mediakeys-helper';

export const enum ElementaryStreamTypes {
  AUDIO = 'audio',
  VIDEO = 'video',
  AUDIOVIDEO = 'audiovideo',
}

export interface ElementaryStreamInfo {
  startPTS: number;
  endPTS: number;
  startDTS: number;
  endDTS: number;
  partial?: boolean;
}

export type ElementaryStreams = Record<
  ElementaryStreamTypes,
  ElementaryStreamInfo | null
>;

export type Base = {
  url: string;
};

export class BaseSegment {
  private _byteRange: [number, number] | null = null;
  private _url: string | null = null;
  private _stats: LoadStats | null = null;
  private _streams: ElementaryStreams | null = null;

  // baseurl is the URL to the playlist
  public readonly base: Base;

  // relurl is the portion of the URL that comes from inside the playlist.
  public relurl?: string;

  constructor(base: Base | string) {
    if (typeof base === 'string') {
      base = { url: base };
    }
    this.base = base;
    makeEnumerable(this, 'stats');
  }

  // setByteRange converts a EXT-X-BYTERANGE attribute into a two element array
  setByteRange(value: string, previous?: BaseSegment) {
    const params = value.split('@', 2);
    let start: number;
    if (params.length === 1) {
      start = previous?.byteRangeEndOffset || 0;
    } else {
      start = parseInt(params[1]);
    }
    this._byteRange = [start, parseInt(params[0]) + start];
  }

  get baseurl(): string {
    return this.base.url;
  }

  get byteRange(): [number, number] | [] {
    if (this._byteRange === null) {
      return [];
    }

    return this._byteRange;
  }

  get byteRangeStartOffset(): number | undefined {
    return this.byteRange[0];
  }

  get byteRangeEndOffset(): number | undefined {
    return this.byteRange[1];
  }

  get elementaryStreams(): ElementaryStreams {
    if (this._streams === null) {
      this._streams = {
        [ElementaryStreamTypes.AUDIO]: null,
        [ElementaryStreamTypes.VIDEO]: null,
        [ElementaryStreamTypes.AUDIOVIDEO]: null,
      };
    }
    return this._streams;
  }

  set elementaryStreams(value: ElementaryStreams) {
    this._streams = value;
  }

  get hasStats(): boolean {
    return this._stats !== null;
  }

  get hasStreams(): boolean {
    return this._streams !== null;
  }

  get stats(): LoadStats {
    if (this._stats === null) {
      this._stats = new LoadStats();
    }
    return this._stats;
  }

  set stats(value: LoadStats) {
    this._stats = value;
  }

  get url(): string {
    if (!this._url && this.baseurl && this.relurl) {
      this._url = buildAbsoluteURL(this.baseurl, this.relurl, {
        alwaysNormalize: true,
      });
    }
    return this._url || '';
  }

  set url(value: string) {
    this._url = value;
  }

  clearElementaryStreamInfo() {
    const { elementaryStreams } = this;
    elementaryStreams[ElementaryStreamTypes.AUDIO] = null;
    elementaryStreams[ElementaryStreamTypes.VIDEO] = null;
    elementaryStreams[ElementaryStreamTypes.AUDIOVIDEO] = null;
  }
}

export interface MediaFragment extends Fragment {
  sn: number;
  ref: MediaFragmentRef;
}

export type MediaFragmentRef = {
  base: Base;
  start: number;
  duration: number;
  sn: number;
  programDateTime: number | null;
};

export function isMediaFragment(frag: Fragment): frag is MediaFragment {
  return frag.sn !== 'initSegment';
}

/**
 * Object representing parsed data from an HLS Segment. Found in {@link hls.js#LevelDetails.fragments}.
 */
export class Fragment extends BaseSegment {
  private _decryptdata: LevelKey | null = null;
  private _programDateTime: number | null = null;
  private _ref: MediaFragmentRef | null = null;
  // Approximate bit rate of the fragment expressed in bits per second (bps) as indicated by the last EXT-X-BITRATE (kbps) tag
  private _bitrate?: number;

  public rawProgramDateTime: string | null = null;
  public tagList: Array<string[]> = [];

  // EXTINF has to be present for a m3u8 to be considered valid
  public duration: number = 0;
  // sn notates the sequence number for a segment, and if set to a string can be 'initSegment'
  public sn: number | 'initSegment' = 0;
  // levelkeys are the EXT-X-KEY tags that apply to this segment for decryption
  // core difference from the private field _decryptdata is the lack of the initialized IV
  // _decryptdata will set the IV for this segment based on the segment number in the fragment
  public levelkeys?: { [key: string]: LevelKey | undefined };
  // A string representing the fragment type
  public readonly type: PlaylistLevelType;
  // A reference to the loader. Set while the fragment is loading, and removed afterwards. Used to abort fragment loading
  public loader: Loader<FragmentLoaderContext> | null = null;
  // A reference to the key loader. Set while the key is loading, and removed afterwards. Used to abort key loading
  public keyLoader: Loader<KeyLoaderContext> | null = null;
  // The level/track index to which the fragment belongs
  public level: number = -1;
  // The continuity counter of the fragment
  public cc: number = 0;
  // The starting Presentation Time Stamp (PTS) of the fragment. Set after transmux complete.
  public startPTS?: number;
  // The ending Presentation Time Stamp (PTS) of the fragment. Set after transmux complete.
  public endPTS?: number;
  // The starting Decode Time Stamp (DTS) of the fragment. Set after transmux complete.
  public startDTS?: number;
  // The ending Decode Time Stamp (DTS) of the fragment. Set after transmux complete.
  public endDTS?: number;
  // The start time of the fragment, as listed in the manifest. Updated after transmux complete.
  public start: number = 0;
  // The offset time (seconds) of the fragment from the start of the Playlist
  public playlistOffset: number = 0;
  // Set by `updateFragPTSDTS` in level-helper
  public deltaPTS?: number;
  // The maximum starting Presentation Time Stamp (audio/video PTS) of the fragment. Set after transmux complete.
  public maxStartPTS?: number;
  // The minimum ending Presentation Time Stamp (audio/video PTS) of the fragment. Set after transmux complete.
  public minEndPTS?: number;
  // Init Segment bytes (unset for media segments)
  public data?: Uint8Array;
  // A flag indicating whether the segment was downloaded in order to test bitrate, and was not buffered
  public bitrateTest: boolean = false;
  // #EXTINF  segment title
  public title: string | null = null;
  // The Media Initialization Section for this segment
  public initSegment: Fragment | null = null;
  // Fragment is the last fragment in the media playlist
  public endList?: boolean;
  // Fragment is marked by an EXT-X-GAP tag indicating that it does not contain media data and should not be loaded
  public gap?: boolean;
  // Deprecated
  public urlId: number = 0;

  constructor(type: PlaylistLevelType, base: Base | string) {
    super(base);
    this.type = type;
  }

  get byteLength(): number | null {
    if (this.hasStats) {
      const total = this.stats.total;
      if (total) {
        return total;
      }
    }
    if (this.byteRange.length) {
      const start = this.byteRange[0];
      const end = this.byteRange[1];
      if (Number.isFinite(start) && Number.isFinite(end)) {
        return (end as number) - (start as number);
      }
    }
    return null;
  }

  get bitrate(): number | null {
    if (this.byteLength) {
      return (this.byteLength * 8) / this.duration;
    }
    if (this._bitrate) {
      return this._bitrate;
    }
    return null;
  }

  set bitrate(value: number) {
    this._bitrate = value;
  }

  get decryptdata(): LevelKey | null {
    const { levelkeys } = this;

    if (!levelkeys || levelkeys.NONE) {
      return null;
    }

    if (levelkeys.identity) {
      if (!this._decryptdata) {
        this._decryptdata = levelkeys.identity.getDecryptData(this.sn);
      }
    } else if (!this._decryptdata?.keyId) {
      const keyFormats = Object.keys(levelkeys);
      if (keyFormats.length === 1) {
        const levelKey = (this._decryptdata = levelkeys[keyFormats[0]] || null);
        if (levelKey) {
          this._decryptdata = levelKey.getDecryptData(this.sn, levelkeys);
        }
      } else {
        // Multiple keys. key-loader to call Fragment.setKeyFormat based on selected key-system.
      }
    }

    return this._decryptdata;
  }

  get end(): number {
    return this.start + this.duration;
  }

  get endProgramDateTime() {
    if (this.programDateTime === null) {
      return null;
    }

    const duration = !Number.isFinite(this.duration) ? 0 : this.duration;

    return this.programDateTime + duration * 1000;
  }

  get encrypted() {
    // At the m3u8-parser level we need to add support for manifest signalled keyformats
    // when we want the fragment to start reporting that it is encrypted.
    // Currently, keyFormat will only be set for identity keys
    if (this._decryptdata?.encrypted) {
      return true;
    } else if (this.levelkeys) {
      const keyFormats = Object.keys(this.levelkeys);
      const len = keyFormats.length;
      if (len > 1 || (len === 1 && this.levelkeys[keyFormats[0]]?.encrypted)) {
        return true;
      }
    }
    return false;
  }

  get programDateTime(): number | null {
    if (this._programDateTime === null && this.rawProgramDateTime) {
      this.programDateTime = Date.parse(this.rawProgramDateTime);
    }
    return this._programDateTime;
  }

  set programDateTime(value: number | null) {
    if (!Number.isFinite(value)) {
      this._programDateTime = this.rawProgramDateTime = null;
      return;
    }
    this._programDateTime = value;
  }

  get ref(): MediaFragmentRef | null {
    if (!isMediaFragment(this)) {
      return null;
    }
    if (!this._ref) {
      this._ref = {
        base: this.base,
        start: this.start,
        duration: this.duration,
        sn: this.sn,
        programDateTime: this.programDateTime,
      };
    }
    return this._ref;
  }

  addStart(value: number) {
    this.setStart(this.start + value);
  }

  setStart(value: number) {
    this.start = value;
    if (this._ref) {
      this._ref.start = value;
    }
  }

  setDuration(value: number) {
    this.duration = value;
    if (this._ref) {
      this._ref.duration = value;
    }
  }

  setKeyFormat(keyFormat: KeySystemFormats) {
    const levelkeys = this.levelkeys;
    if (levelkeys) {
      const key = levelkeys[keyFormat];
      if (key && !this._decryptdata?.keyId) {
        this._decryptdata = key.getDecryptData(this.sn, levelkeys);
      }
    }
  }

  abortRequests(): void {
    this.loader?.abort();
    this.keyLoader?.abort();
  }

  setElementaryStreamInfo(
    type: ElementaryStreamTypes,
    startPTS: number,
    endPTS: number,
    startDTS: number,
    endDTS: number,
    partial: boolean = false,
  ) {
    const { elementaryStreams } = this;
    const info = elementaryStreams[type];
    if (!info) {
      elementaryStreams[type] = {
        startPTS,
        endPTS,
        startDTS,
        endDTS,
        partial,
      };
      return;
    }

    info.startPTS = Math.min(info.startPTS, startPTS);
    info.endPTS = Math.max(info.endPTS, endPTS);
    info.startDTS = Math.min(info.startDTS, startDTS);
    info.endDTS = Math.max(info.endDTS, endDTS);
  }
}

/**
 * Object representing parsed data from an HLS Partial Segment. Found in {@link hls.js#LevelDetails.partList}.
 */
export class Part extends BaseSegment {
  public readonly fragOffset: number = 0;
  public readonly duration: number = 0;
  public readonly gap: boolean = false;
  public readonly independent: boolean = false;
  public readonly relurl: string;
  public readonly fragment: MediaFragment;
  public readonly index: number;

  constructor(
    partAttrs: AttrList,
    frag: MediaFragment,
    base: Base | string,
    index: number,
    previous?: Part,
  ) {
    super(base);
    this.duration = partAttrs.decimalFloatingPoint('DURATION');
    this.gap = partAttrs.bool('GAP');
    this.independent = partAttrs.bool('INDEPENDENT');
    this.relurl = partAttrs.enumeratedString('URI') as string;
    this.fragment = frag;
    this.index = index;
    const byteRange = partAttrs.enumeratedString('BYTERANGE');
    if (byteRange) {
      this.setByteRange(byteRange, previous);
    }
    if (previous) {
      this.fragOffset = previous.fragOffset + previous.duration;
    }
  }

  get start(): number {
    return this.fragment.start + this.fragOffset;
  }

  get end(): number {
    return this.start + this.duration;
  }

  get loaded(): boolean {
    const { elementaryStreams } = this;
    return !!(
      elementaryStreams.audio ||
      elementaryStreams.video ||
      elementaryStreams.audiovideo
    );
  }
}

function getOwnPropertyDescriptorFromPrototypeChain(
  object: Object | undefined,
  property: string,
) {
  const prototype = Object.getPrototypeOf(object);
  if (prototype) {
    const propertyDescriptor = Object.getOwnPropertyDescriptor(
      prototype,
      property,
    );
    if (propertyDescriptor) {
      return propertyDescriptor;
    }
    return getOwnPropertyDescriptorFromPrototypeChain(prototype, property);
  }
}

function makeEnumerable(object: Object, property: string) {
  const d = getOwnPropertyDescriptorFromPrototypeChain(object, property);
  if (d) {
    d.enumerable = true;
    Object.defineProperty(object, property, d);
  }
}
