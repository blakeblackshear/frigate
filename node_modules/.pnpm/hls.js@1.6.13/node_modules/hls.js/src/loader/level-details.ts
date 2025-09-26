import type { DateRange } from './date-range';
import type { Fragment, MediaFragment, Part } from './fragment';
import type { LevelKey } from './level-key';
import type { VariableMap } from '../types/level';
import type { AttrList } from '../utils/attr-list';
import type { KeySystemFormats } from '../utils/mediakeys-helper';

const DEFAULT_TARGET_DURATION = 10;

/**
 * Object representing parsed data from an HLS Media Playlist. Found in {@link hls.js#Level.details}.
 */
export class LevelDetails {
  public PTSKnown: boolean = false;
  public alignedSliding: boolean = false;
  public averagetargetduration?: number;
  public endCC: number = 0;
  public endSN: number = 0;
  public fragments: MediaFragment[];
  public fragmentHint?: MediaFragment;
  public partList: Part[] | null = null;
  public dateRanges: Record<string, DateRange | undefined>;
  public dateRangeTagCount: number = 0;
  public live: boolean = true;
  public requestScheduled: number = -1;
  public ageHeader: number = 0;
  public advancedDateTime?: number;
  public updated: boolean = true;
  public advanced: boolean = true;
  public misses: number = 0;
  public startCC: number = 0;
  public startSN: number = 0;
  public startTimeOffset: number | null = null;
  public targetduration: number = 0;
  public totalduration: number = 0;
  public type: string | null = null;
  public url: string;
  public m3u8: string = '';
  public version: number | null = null;
  public canBlockReload: boolean = false;
  public canSkipUntil: number = 0;
  public canSkipDateRanges: boolean = false;
  public skippedSegments: number = 0;
  public recentlyRemovedDateranges?: string[];
  public partHoldBack: number = 0;
  public holdBack: number = 0;
  public partTarget: number = 0;
  public preloadHint?: AttrList;
  public renditionReports?: AttrList[];
  public tuneInGoal: number = 0;
  public deltaUpdateFailed?: boolean;
  public driftStartTime: number = 0;
  public driftEndTime: number = 0;
  public driftStart: number = 0;
  public driftEnd: number = 0;
  public encryptedFragments: Fragment[];
  public playlistParsingError: Error | null = null;
  public variableList: VariableMap | null = null;
  public hasVariableRefs = false;
  public appliedTimelineOffset?: number;

  constructor(baseUrl: string) {
    this.fragments = [];
    this.encryptedFragments = [];
    this.dateRanges = {};
    this.url = baseUrl;
  }

  reloaded(previous: LevelDetails | undefined) {
    if (!previous) {
      this.advanced = true;
      this.updated = true;
      return;
    }
    const partSnDiff = this.lastPartSn - previous.lastPartSn;
    const partIndexDiff = this.lastPartIndex - previous.lastPartIndex;
    this.updated =
      this.endSN !== previous.endSN ||
      !!partIndexDiff ||
      !!partSnDiff ||
      !this.live;
    this.advanced =
      this.endSN > previous.endSN ||
      partSnDiff > 0 ||
      (partSnDiff === 0 && partIndexDiff > 0);
    if (this.updated || this.advanced) {
      this.misses = Math.floor(previous.misses * 0.6);
    } else {
      this.misses = previous.misses + 1;
    }
  }

  hasKey(levelKey: LevelKey): boolean {
    return this.encryptedFragments.some((frag) => {
      let decryptdata = frag.decryptdata;
      if (!decryptdata) {
        frag.setKeyFormat(levelKey.keyFormat as KeySystemFormats);
        decryptdata = frag.decryptdata;
      }
      return !!decryptdata && levelKey.matches(decryptdata);
    });
  }

  get hasProgramDateTime(): boolean {
    if (this.fragments.length) {
      return Number.isFinite(
        this.fragments[this.fragments.length - 1].programDateTime,
      );
    }
    return false;
  }

  get levelTargetDuration(): number {
    return (
      this.averagetargetduration ||
      this.targetduration ||
      DEFAULT_TARGET_DURATION
    );
  }

  get drift(): number {
    const runTime = this.driftEndTime - this.driftStartTime;
    if (runTime > 0) {
      const runDuration = this.driftEnd - this.driftStart;
      return (runDuration * 1000) / runTime;
    }
    return 1;
  }

  get edge(): number {
    return this.partEnd || this.fragmentEnd;
  }

  get partEnd(): number {
    if (this.partList?.length) {
      return this.partList[this.partList.length - 1].end;
    }
    return this.fragmentEnd;
  }

  get fragmentEnd(): number {
    if (this.fragments.length) {
      return this.fragments[this.fragments.length - 1].end;
    }
    return 0;
  }

  get fragmentStart(): number {
    if (this.fragments.length) {
      return this.fragments[0].start;
    }
    return 0;
  }

  get age(): number {
    if (this.advancedDateTime) {
      return Math.max(Date.now() - this.advancedDateTime, 0) / 1000;
    }
    return 0;
  }

  get lastPartIndex(): number {
    if (this.partList?.length) {
      return this.partList[this.partList.length - 1].index;
    }
    return -1;
  }

  get maxPartIndex(): number {
    const partList = this.partList;
    if (partList) {
      const lastIndex = this.lastPartIndex;
      if (lastIndex !== -1) {
        for (let i = partList.length; i--; ) {
          if (partList[i].index > lastIndex) {
            return partList[i].index;
          }
        }
        return lastIndex;
      }
    }
    return 0;
  }

  get lastPartSn(): number {
    if (this.partList?.length) {
      return this.partList[this.partList.length - 1].fragment.sn;
    }
    return this.endSN;
  }

  get expired(): boolean {
    if (this.live && this.age && this.misses < 3) {
      const playlistWindowDuration = this.partEnd - this.fragmentStart;
      return (
        this.age >
        Math.max(playlistWindowDuration, this.totalduration) +
          this.levelTargetDuration
      );
    }
    return false;
  }
}
