export interface IRange {
  start: number;
  end: number;

  contains(num: number): boolean;

  containsRange(other: IRange): boolean;

  isContainedInRange(other: IRange): boolean;

  strictlyContainsRange(other: IRange): boolean;

  isStrictlyContainedInRange(other: IRange): boolean;
}

export class Range implements IRange {
  constructor(
    public start: number,
    public end: number,
  ) {
    if (!isValidRange(start, end)) {
      throw new Error("INVALID RANGE");
    }
  }

  contains(num: number): boolean {
    return this.start <= num && this.end >= num;
  }

  containsRange(other: IRange): boolean {
    return this.start <= other.start && this.end >= other.end;
  }

  isContainedInRange(other: IRange): boolean {
    return other.containsRange(this);
  }

  strictlyContainsRange(other: IRange): boolean {
    return this.start < other.start && this.end > other.end;
  }

  isStrictlyContainedInRange(other: IRange): boolean {
    return other.strictlyContainsRange(this);
  }
}

export function isValidRange(start: number, end: number): boolean {
  return !(start < 0 || end < start);
}
