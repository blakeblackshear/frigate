import { hash } from '../utils/hash';
import type { DateRange, DateRangeCue } from './date-range';
import type { MediaFragmentRef } from './fragment';
import type { Loader, LoaderContext } from '../types/loader';

export const ALIGNED_END_THRESHOLD_SECONDS = 0.025;

export type PlaybackRestrictions = {
  skip: boolean;
  jump: boolean;
};

export type SnapOptions = {
  out: boolean;
  in: boolean;
};

export enum TimelineOccupancy {
  Point,
  Range,
}

export type AssetListJSON = {
  ASSETS: Array<{ URI: string; DURATION: string }>;
};
export interface InterstitialEventWithAssetList extends InterstitialEvent {
  assetListUrl: string;
}

export type BaseData = {
  url: string;
};

export type InterstitialId = string;
export type InterstitialAssetId = string;

export type InterstitialAssetItem = {
  parentIdentifier: InterstitialId;
  identifier: InterstitialAssetId;
  duration: number | null;
  startOffset: number; // asset start offset from start of interstitial event
  timelineStart: number; // asset start on media element timeline
  uri: string;
  error?: Error;
};

export function generateAssetIdentifier(
  interstitial: InterstitialEvent,
  uri: string,
  assetListIndex: number,
): string {
  return `${interstitial.identifier}-${assetListIndex + 1}-${hash(uri)}`;
}

export class InterstitialEvent {
  private base: BaseData;
  private _duration: number | null = null;
  private _timelineStart: number | null = null;
  private appendInPlaceDisabled?: boolean;
  public appendInPlaceStarted?: boolean;
  public dateRange: DateRange;
  public hasPlayed: boolean = false;
  public cumulativeDuration: number = 0;
  public resumeOffset: number = NaN;
  public playoutLimit: number = NaN;
  public restrictions: PlaybackRestrictions = {
    skip: false,
    jump: false,
  };
  public snapOptions: SnapOptions = {
    out: false,
    in: false,
  };
  public assetList: InterstitialAssetItem[] = [];
  public assetListLoader?: Loader<LoaderContext>;
  public assetListResponse: AssetListJSON | null = null;
  public resumeAnchor?: MediaFragmentRef;
  public error?: Error;
  public resetOnResume?: boolean;

  constructor(dateRange: DateRange, base: BaseData) {
    this.base = base;
    this.dateRange = dateRange;
    this.setDateRange(dateRange);
  }

  public setDateRange(dateRange: DateRange) {
    this.dateRange = dateRange;
    this.resumeOffset = dateRange.attr.optionalFloat(
      'X-RESUME-OFFSET',
      this.resumeOffset,
    );
    this.playoutLimit = dateRange.attr.optionalFloat(
      'X-PLAYOUT-LIMIT',
      this.playoutLimit,
    );
    this.restrictions = dateRange.attr.enumeratedStringList(
      'X-RESTRICT',
      this.restrictions,
    );
    this.snapOptions = dateRange.attr.enumeratedStringList(
      'X-SNAP',
      this.snapOptions,
    );
  }

  public reset() {
    this.appendInPlaceStarted = false;
    this.assetListLoader?.destroy();
    this.assetListLoader = undefined;
    if (!this.supplementsPrimary) {
      this.assetListResponse = null;
      this.assetList = [];
      this._duration = null;
    }
    // `error?` is reset when seeking back over interstitial `startOffset`
    //  using `schedule.resetErrorsInRange(start, end)`.
  }

  public isAssetPastPlayoutLimit(assetIndex: number): boolean {
    if (assetIndex > 0 && assetIndex >= this.assetList.length) {
      return true;
    }
    const playoutLimit = this.playoutLimit;
    if (assetIndex <= 0 || isNaN(playoutLimit)) {
      return false;
    }
    if (playoutLimit === 0) {
      return true;
    }
    const assetOffset = this.assetList[assetIndex]?.startOffset || 0;
    return assetOffset > playoutLimit;
  }

  public findAssetIndex(asset: InterstitialAssetItem): number {
    const index = this.assetList.indexOf(asset);
    return index;
  }

  get identifier(): InterstitialId {
    return this.dateRange.id;
  }

  get startDate(): Date {
    return this.dateRange.startDate;
  }

  get startTime(): number {
    // Primary media timeline start time
    const startTime = this.dateRange.startTime;
    if (this.snapOptions.out) {
      const frag = this.dateRange.tagAnchor;
      if (frag) {
        return getSnapToFragmentTime(startTime, frag);
      }
    }
    return startTime;
  }

  get startOffset(): number {
    return this.cue.pre ? 0 : this.startTime;
  }

  get startIsAligned(): boolean {
    if (this.startTime === 0 || this.snapOptions.out) {
      return true;
    }
    const frag = this.dateRange.tagAnchor;
    if (frag) {
      const startTime = this.dateRange.startTime;
      const snappedStart = getSnapToFragmentTime(startTime, frag);
      return startTime - snappedStart < 0.1;
    }
    return false;
  }

  get resumptionOffset(): number {
    const resumeOffset = this.resumeOffset;
    const offset = Number.isFinite(resumeOffset) ? resumeOffset : this.duration;
    return this.cumulativeDuration + offset;
  }

  get resumeTime(): number {
    // Primary media timeline resumption time
    const resumeTime = this.startOffset + this.resumptionOffset;
    if (this.snapOptions.in) {
      const frag = this.resumeAnchor;
      if (frag) {
        return getSnapToFragmentTime(resumeTime, frag);
      }
    }
    return resumeTime;
  }

  get appendInPlace(): boolean {
    if (this.appendInPlaceStarted) {
      return true;
    }
    if (this.appendInPlaceDisabled) {
      return false;
    }
    if (
      !this.cue.once &&
      !this.cue.pre && // preroll starts at startPosition before startPosition is known (live)
      this.startIsAligned &&
      ((isNaN(this.playoutLimit) && isNaN(this.resumeOffset)) ||
        (this.resumeOffset &&
          this.duration &&
          Math.abs(this.resumeOffset - this.duration) <
            ALIGNED_END_THRESHOLD_SECONDS))
    ) {
      return true;
    }
    return false;
  }

  set appendInPlace(value: boolean) {
    if (this.appendInPlaceStarted) {
      this.resetOnResume = !value;
      return;
    }
    this.appendInPlaceDisabled = !value;
  }

  // Extended timeline start time
  get timelineStart(): number {
    if (this._timelineStart !== null) {
      return this._timelineStart;
    }
    return this.startTime;
  }

  set timelineStart(value: number) {
    this._timelineStart = value;
  }

  get duration(): number {
    const playoutLimit = this.playoutLimit;
    let duration: number;
    if (this._duration !== null) {
      duration = this._duration;
    } else if (this.dateRange.duration) {
      duration = this.dateRange.duration;
    } else {
      duration = this.dateRange.plannedDuration || 0;
    }
    if (!isNaN(playoutLimit) && playoutLimit < duration) {
      duration = playoutLimit;
    }
    return duration;
  }

  set duration(value: number) {
    this._duration = value;
  }

  get cue(): DateRangeCue {
    return this.dateRange.cue;
  }

  get timelineOccupancy() {
    if (this.dateRange.attr['X-TIMELINE-OCCUPIES'] === 'RANGE') {
      return TimelineOccupancy.Range;
    }
    return TimelineOccupancy.Point;
  }

  get supplementsPrimary(): boolean {
    return this.dateRange.attr['X-TIMELINE-STYLE'] === 'PRIMARY';
  }

  get contentMayVary(): boolean {
    return this.dateRange.attr['X-CONTENT-MAY-VARY'] !== 'NO';
  }

  get assetUrl(): string | undefined {
    return this.dateRange.attr['X-ASSET-URI'];
  }

  get assetListUrl(): string | undefined {
    return this.dateRange.attr['X-ASSET-LIST'];
  }

  get baseUrl(): string {
    return this.base.url;
  }

  get assetListLoaded(): boolean {
    return this.assetList.length > 0 || this.assetListResponse !== null;
  }

  toString(): string {
    return eventToString(this);
  }
}

function getSnapToFragmentTime(time: number, frag: MediaFragmentRef) {
  return time - frag.start < frag.duration / 2 &&
    !(
      Math.abs(time - (frag.start + frag.duration)) <
      ALIGNED_END_THRESHOLD_SECONDS
    )
    ? frag.start
    : frag.start + frag.duration;
}

export function getInterstitialUrl(
  uri: string,
  sessionId: string,
  baseUrl?: string,
): URL | never {
  const url = new self.URL(uri, baseUrl);
  if (url.protocol !== 'data:') {
    url.searchParams.set('_HLS_primary_id', sessionId);
  }
  return url;
}

export function getNextAssetIndex(
  interstitial: InterstitialEvent,
  assetListIndex: number,
): number {
  while (interstitial.assetList[++assetListIndex]?.error) {
    /* no-op */
  }
  return assetListIndex;
}

function eventToString(interstitial: InterstitialEvent): string {
  return `["${interstitial.identifier}" ${interstitial.cue.pre ? '<pre>' : interstitial.cue.post ? '<post>' : ''}${interstitial.timelineStart.toFixed(2)}-${interstitial.resumeTime.toFixed(2)}]`;
}

export function eventAssetToString(asset: InterstitialAssetItem): string {
  const start = asset.timelineStart;
  const duration = asset.duration || 0;
  return `["${asset.identifier}" ${start.toFixed(2)}-${(start + duration).toFixed(2)}]`;
}
