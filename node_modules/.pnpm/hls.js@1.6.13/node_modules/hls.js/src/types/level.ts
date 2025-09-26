import type { MediaPlaylist } from './media-playlist';
import type { LevelDetails } from '../loader/level-details';
import type { AttrList } from '../utils/attr-list';
import type { MediaDecodingInfo } from '../utils/mediacapabilities-helper';

export interface LevelParsed extends CodecsParsed {
  attrs: LevelAttributes;
  bitrate: number;
  details?: LevelDetails;
  height?: number;
  id?: number;
  name: string;
  supplemental?: CodecsParsed;
  url: string;
  width?: number;
}

export interface CodecsParsed {
  audioCodec?: string;
  videoCodec?: string;
  textCodec?: string;
  unknownCodecs?: string[];
}

export interface LevelAttributes extends AttrList {
  'ALLOWED-CPC'?: string;
  AUDIO?: string;
  'AVERAGE-BANDWIDTH'?: string;
  BANDWIDTH?: string;
  'CLOSED-CAPTIONS'?: string;
  CODECS?: string;
  'FRAME-RATE'?: string;
  'HDCP-LEVEL'?: 'TYPE-0' | 'TYPE-1' | 'NONE';
  'PATHWAY-ID'?: string;
  RESOLUTION?: string;
  SCORE?: string;
  'STABLE-VARIANT-ID'?: string;
  SUBTITLES?: string;
  'SUPPLEMENTAL-CODECS'?: string;
  VIDEO?: string;
  'VIDEO-RANGE'?: VideoRange;
}

export const HdcpLevels = ['NONE', 'TYPE-0', 'TYPE-1', null] as const;
export type HdcpLevel = (typeof HdcpLevels)[number];

export function isHdcpLevel(value: any): value is HdcpLevel {
  return HdcpLevels.indexOf(value) > -1;
}

export const VideoRangeValues = ['SDR', 'PQ', 'HLG'] as const;
export type VideoRange = (typeof VideoRangeValues)[number];

export function isVideoRange(value: any): value is VideoRange {
  return !!value && VideoRangeValues.indexOf(value) > -1;
}

export type VariableMap = Record<string, string>;

export const enum HlsSkip {
  No = '',
  Yes = 'YES',
  v2 = 'v2',
}

export function getSkipValue(details: LevelDetails): HlsSkip {
  const { canSkipUntil, canSkipDateRanges, age } = details;
  // A Client SHOULD NOT request a Playlist Delta Update unless it already
  // has a version of the Playlist that is no older than one-half of the Skip Boundary.
  // @see: https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-6.3.7
  const playlistRecentEnough = age < canSkipUntil / 2;
  if (canSkipUntil && playlistRecentEnough) {
    if (canSkipDateRanges) {
      return HlsSkip.v2;
    }
    return HlsSkip.Yes;
  }
  return HlsSkip.No;
}

export class HlsUrlParameters {
  msn?: number;
  part?: number;
  skip?: HlsSkip;

  constructor(msn?: number, part?: number, skip?: HlsSkip) {
    this.msn = msn;
    this.part = part;
    this.skip = skip;
  }

  addDirectives(uri: string): string | never {
    const url: URL = new self.URL(uri);
    if (this.msn !== undefined) {
      url.searchParams.set('_HLS_msn', this.msn.toString());
    }
    if (this.part !== undefined) {
      url.searchParams.set('_HLS_part', this.part.toString());
    }
    if (this.skip) {
      url.searchParams.set('_HLS_skip', this.skip);
    }
    return url.href;
  }
}

export class Level {
  public readonly _attrs: LevelAttributes[];
  public readonly audioCodec: string | undefined;
  public readonly bitrate: number;
  public readonly codecSet: string;
  public readonly url: string[];
  public readonly frameRate: number;
  public readonly height: number;
  public readonly id: number;
  public readonly name: string;
  public readonly supplemental: CodecsParsed | undefined;
  public readonly videoCodec: string | undefined;
  public readonly width: number;
  public details?: LevelDetails;
  public fragmentError: number = 0;
  public loadError: number = 0;
  public loaded?: { bytes: number; duration: number };
  public realBitrate: number = 0;
  public supportedPromise?: Promise<MediaDecodingInfo>;
  public supportedResult?: MediaDecodingInfo;
  private _avgBitrate: number = 0;
  private _audioGroups?: (string | undefined)[];
  private _subtitleGroups?: (string | undefined)[];
  // Deprecated (retained for backwards compatibility)
  private readonly _urlId: number = 0;

  constructor(data: LevelParsed | MediaPlaylist) {
    this.url = [data.url];
    this._attrs = [data.attrs];
    this.bitrate = data.bitrate;
    if (data.details) {
      this.details = data.details;
    }
    this.id = data.id || 0;
    this.name = data.name;
    this.width = data.width || 0;
    this.height = data.height || 0;
    this.frameRate = data.attrs.optionalFloat('FRAME-RATE', 0);
    this._avgBitrate = data.attrs.decimalInteger('AVERAGE-BANDWIDTH');
    this.audioCodec = data.audioCodec;
    this.videoCodec = data.videoCodec;
    this.codecSet = [data.videoCodec, data.audioCodec]
      .filter((c) => !!c)
      .map((s: string) => s.substring(0, 4))
      .join(',');
    if ('supplemental' in data) {
      this.supplemental = data.supplemental;
      const supplementalVideo = data.supplemental?.videoCodec;
      if (supplementalVideo && supplementalVideo !== data.videoCodec) {
        this.codecSet += `,${supplementalVideo.substring(0, 4)}`;
      }
    }
    this.addGroupId('audio', data.attrs.AUDIO);
    this.addGroupId('text', data.attrs.SUBTITLES);
  }

  get maxBitrate(): number {
    return Math.max(this.realBitrate, this.bitrate);
  }

  get averageBitrate(): number {
    return this._avgBitrate || this.realBitrate || this.bitrate;
  }

  get attrs(): LevelAttributes {
    return this._attrs[0];
  }

  get codecs(): string {
    return this.attrs.CODECS || '';
  }

  get pathwayId(): string {
    return this.attrs['PATHWAY-ID'] || '.';
  }

  get videoRange(): VideoRange {
    return this.attrs['VIDEO-RANGE'] || 'SDR';
  }

  get score(): number {
    return this.attrs.optionalFloat('SCORE', 0);
  }

  get uri(): string {
    return this.url[0] || '';
  }

  hasAudioGroup(groupId: string | undefined): boolean {
    return hasGroup(this._audioGroups, groupId);
  }

  hasSubtitleGroup(groupId: string | undefined): boolean {
    return hasGroup(this._subtitleGroups, groupId);
  }

  get audioGroups(): (string | undefined)[] | undefined {
    return this._audioGroups;
  }

  get subtitleGroups(): (string | undefined)[] | undefined {
    return this._subtitleGroups;
  }

  addGroupId(type: string, groupId: string | undefined) {
    if (!groupId) {
      return;
    }
    if (type === 'audio') {
      let audioGroups = this._audioGroups;
      if (!audioGroups) {
        audioGroups = this._audioGroups = [];
      }
      if (audioGroups.indexOf(groupId) === -1) {
        audioGroups.push(groupId);
      }
    } else if (type === 'text') {
      let subtitleGroups = this._subtitleGroups;
      if (!subtitleGroups) {
        subtitleGroups = this._subtitleGroups = [];
      }
      if (subtitleGroups.indexOf(groupId) === -1) {
        subtitleGroups.push(groupId);
      }
    }
  }

  // Deprecated methods (retained for backwards compatibility)
  get urlId(): number {
    return 0;
  }

  set urlId(value: number) {}

  get audioGroupIds(): (string | undefined)[] | undefined {
    return this.audioGroups ? [this.audioGroupId] : undefined;
  }

  get textGroupIds(): (string | undefined)[] | undefined {
    return this.subtitleGroups ? [this.textGroupId] : undefined;
  }

  get audioGroupId(): string | undefined {
    return this.audioGroups?.[0];
  }

  get textGroupId(): string | undefined {
    return this.subtitleGroups?.[0];
  }

  addFallback() {}
}

function hasGroup(
  groups: (string | undefined)[] | undefined,
  groupId: string | undefined,
): boolean {
  if (!groupId || !groups) {
    return false;
  }
  return groups.indexOf(groupId) !== -1;
}
