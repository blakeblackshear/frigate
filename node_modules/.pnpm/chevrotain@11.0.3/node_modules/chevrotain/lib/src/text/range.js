export class Range {
    constructor(start, end) {
        this.start = start;
        this.end = end;
        if (!isValidRange(start, end)) {
            throw new Error("INVALID RANGE");
        }
    }
    contains(num) {
        return this.start <= num && this.end >= num;
    }
    containsRange(other) {
        return this.start <= other.start && this.end >= other.end;
    }
    isContainedInRange(other) {
        return other.containsRange(this);
    }
    strictlyContainsRange(other) {
        return this.start < other.start && this.end > other.end;
    }
    isStrictlyContainedInRange(other) {
        return other.strictlyContainsRange(this);
    }
}
export function isValidRange(start, end) {
    return !(start < 0 || end < start);
}
//# sourceMappingURL=range.js.map