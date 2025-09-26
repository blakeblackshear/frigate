export interface Segment {
    key: string;
    data: number[];
}
export declare function parsePath(d: string): Segment[];
export declare function serialize(segments: Segment[]): string;
