export default class Queue<ItemT> {
  pendingItems: Array<ItemT> = [];
  nextItemResolver!: () => void;
  nextItem: Promise<void> = new Promise(
    (done) => (this.nextItemResolver = done)
  );

  put(item: ItemT): void {
    this.pendingItems.push(item);
    this.nextItemResolver();
    this.nextItem = new Promise((done) => (this.nextItemResolver = done));
  }

  get(): Promise<ItemT> {
    const item = this.pendingItems.shift();
    if (item) {
      // return the next queued item immediately
      return Promise.resolve(item);
    }
    let resolver: (item: ItemT) => void;
    const nextItemPromise: Promise<ItemT> = new Promise(
      (done) => (resolver = done)
    );
    this.nextItem.then(() => {
      resolver(this.pendingItems.shift() as ItemT);
    });
    return nextItemPromise;
  }
}
