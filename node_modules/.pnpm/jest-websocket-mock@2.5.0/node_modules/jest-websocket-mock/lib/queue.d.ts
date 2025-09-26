export default class Queue<ItemT> {
    pendingItems: Array<ItemT>;
    nextItemResolver: () => void;
    nextItem: Promise<void>;
    put(item: ItemT): void;
    get(): Promise<ItemT>;
}
