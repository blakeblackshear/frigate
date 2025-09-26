import { AttrList } from '../utils/attr-list';
import { logger } from '../utils/logger';
import type { MediaFragmentRef } from './fragment';

// Avoid exporting const enum so that these values can be inlined
const enum DateRangeAttribute {
  ID = 'ID',
  CLASS = 'CLASS',
  CUE = 'CUE',
  START_DATE = 'START-DATE',
  DURATION = 'DURATION',
  END_DATE = 'END-DATE',
  END_ON_NEXT = 'END-ON-NEXT',
  PLANNED_DURATION = 'PLANNED-DURATION',
  SCTE35_OUT = 'SCTE35-OUT',
  SCTE35_IN = 'SCTE35-IN',
  SCTE35_CMD = 'SCTE35-CMD',
}

export type DateRangeCue = {
  pre: boolean;
  post: boolean;
  once: boolean;
};

const CLASS_INTERSTITIAL = 'com.apple.hls.interstitial';

export function isDateRangeCueAttribute(attrName: string): boolean {
  return (
    attrName !== DateRangeAttribute.ID &&
    attrName !== DateRangeAttribute.CLASS &&
    attrName !== DateRangeAttribute.CUE &&
    attrName !== DateRangeAttribute.START_DATE &&
    attrName !== DateRangeAttribute.DURATION &&
    attrName !== DateRangeAttribute.END_DATE &&
    attrName !== DateRangeAttribute.END_ON_NEXT
  );
}

export function isSCTE35Attribute(attrName: string): boolean {
  return (
    attrName === DateRangeAttribute.SCTE35_OUT ||
    attrName === DateRangeAttribute.SCTE35_IN ||
    attrName === DateRangeAttribute.SCTE35_CMD
  );
}

export class DateRange {
  public attr: AttrList;
  public tagAnchor: MediaFragmentRef | null;
  public tagOrder: number;
  private _startDate: Date;
  private _endDate?: Date;
  private _dateAtEnd?: Date;
  private _cue?: DateRangeCue;
  private _badValueForSameId?: string;

  constructor(
    dateRangeAttr: AttrList,
    dateRangeWithSameId?: DateRange | undefined,
    tagCount: number = 0,
  ) {
    this.tagAnchor = dateRangeWithSameId?.tagAnchor || null;
    this.tagOrder = dateRangeWithSameId?.tagOrder ?? tagCount;
    if (dateRangeWithSameId) {
      const previousAttr = dateRangeWithSameId.attr;
      for (const key in previousAttr) {
        if (
          Object.prototype.hasOwnProperty.call(dateRangeAttr, key) &&
          dateRangeAttr[key] !== previousAttr[key]
        ) {
          logger.warn(
            `DATERANGE tag attribute: "${key}" does not match for tags with ID: "${dateRangeAttr.ID}"`,
          );
          this._badValueForSameId = key;
          break;
        }
      }
      // Merge DateRange tags with the same ID
      dateRangeAttr = Object.assign(
        new AttrList({}),
        previousAttr,
        dateRangeAttr,
      );
    }
    this.attr = dateRangeAttr;
    if (dateRangeWithSameId) {
      this._startDate = dateRangeWithSameId._startDate;
      this._cue = dateRangeWithSameId._cue;
      this._endDate = dateRangeWithSameId._endDate;
      this._dateAtEnd = dateRangeWithSameId._dateAtEnd;
    } else {
      this._startDate = new Date(dateRangeAttr[DateRangeAttribute.START_DATE]);
    }
    if (DateRangeAttribute.END_DATE in this.attr) {
      const endDate =
        dateRangeWithSameId?.endDate ||
        new Date(this.attr[DateRangeAttribute.END_DATE]);
      if (Number.isFinite(endDate.getTime())) {
        this._endDate = endDate;
      }
    }
  }

  get id(): string {
    return this.attr.ID;
  }

  get class(): string {
    return this.attr.CLASS;
  }

  get cue(): DateRangeCue {
    const _cue = this._cue;
    if (_cue === undefined) {
      return (this._cue = this.attr.enumeratedStringList(
        this.attr.CUE ? 'CUE' : 'X-CUE',
        {
          pre: false,
          post: false,
          once: false,
        },
      ));
    }
    return _cue;
  }

  get startTime(): number {
    const { tagAnchor } = this;
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if (tagAnchor === null || tagAnchor.programDateTime === null) {
      logger.warn(
        `Expected tagAnchor Fragment with PDT set for DateRange "${this.id}": ${tagAnchor}`,
      );
      return NaN;
    }
    return (
      tagAnchor.start +
      (this.startDate.getTime() - tagAnchor.programDateTime) / 1000
    );
  }

  get startDate(): Date {
    return this._startDate;
  }

  get endDate(): Date | null {
    const dateAtEnd = this._endDate || this._dateAtEnd;
    if (dateAtEnd) {
      return dateAtEnd;
    }
    const duration = this.duration;
    if (duration !== null) {
      return (this._dateAtEnd = new Date(
        this._startDate.getTime() + duration * 1000,
      ));
    }
    return null;
  }

  get duration(): number | null {
    if (DateRangeAttribute.DURATION in this.attr) {
      const duration = this.attr.decimalFloatingPoint(
        DateRangeAttribute.DURATION,
      );
      if (Number.isFinite(duration)) {
        return duration;
      }
    } else if (this._endDate) {
      return (this._endDate.getTime() - this._startDate.getTime()) / 1000;
    }
    return null;
  }

  get plannedDuration(): number | null {
    if (DateRangeAttribute.PLANNED_DURATION in this.attr) {
      return this.attr.decimalFloatingPoint(
        DateRangeAttribute.PLANNED_DURATION,
      );
    }
    return null;
  }

  get endOnNext(): boolean {
    return this.attr.bool(DateRangeAttribute.END_ON_NEXT);
  }

  get isInterstitial(): boolean {
    return this.class === CLASS_INTERSTITIAL;
  }

  get isValid(): boolean {
    return (
      !!this.id &&
      !this._badValueForSameId &&
      Number.isFinite(this.startDate.getTime()) &&
      (this.duration === null || this.duration >= 0) &&
      (!this.endOnNext || !!this.class) &&
      (!this.attr.CUE ||
        (!this.cue.pre && !this.cue.post) ||
        this.cue.pre !== this.cue.post) &&
      (!this.isInterstitial ||
        'X-ASSET-URI' in this.attr ||
        'X-ASSET-LIST' in this.attr)
    );
  }
}
