export declare class Uid {
    private static count;
    id: string;
    href: string;
    static next(name: string): Uid;
    constructor(id: string);
    toString(): string;
}
