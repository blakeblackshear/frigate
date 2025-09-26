export class List {
    _sentinel: {
        _next: any;
        _prev: any;
    };
    dequeue(): {
        _next: any;
        _prev: any;
    };
    enqueue(entry: any): void;
    toString(): string;
}
