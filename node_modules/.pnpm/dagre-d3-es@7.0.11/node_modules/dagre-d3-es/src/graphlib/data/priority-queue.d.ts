/**
 * A min-priority queue data structure. This algorithm is derived from Cormen,
 * et al., "Introduction to Algorithms". The basic idea of a min-priority
 * queue is that you can efficiently (in O(1) time) get the smallest key in
 * the queue. Adding and removing elements takes O(log n) time. A key can
 * have its priority decreased in O(log n) time.
 */
export class PriorityQueue {
    _arr: any[];
    _keyIndices: {};
    /**
     * Returns the number of elements in the queue. Takes `O(1)` time.
     */
    size(): number;
    /**
     * Returns the keys that are in the queue. Takes `O(n)` time.
     */
    keys(): any[];
    /**
     * Returns `true` if **key** is in the queue and `false` if not.
     */
    has(key: any): any;
    /**
     * Returns the priority for **key**. If **key** is not present in the queue
     * then this function returns `undefined`. Takes `O(1)` time.
     *
     * @param {Object} key
     */
    priority(key: any): any;
    /**
     * Returns the key for the minimum element in this queue. If the queue is
     * empty this function throws an Error. Takes `O(1)` time.
     */
    min(): any;
    /**
     * Inserts a new key into the priority queue. If the key already exists in
     * the queue this function returns `false`; otherwise it will return `true`.
     * Takes `O(n)` time.
     *
     * @param {Object} key the key to add
     * @param {Number} priority the initial priority for the key
     */
    add(key: any, priority: number): boolean;
    /**
     * Removes and returns the smallest key in the queue. Takes `O(log n)` time.
     */
    removeMin(): any;
    /**
     * Decreases the priority for **key** to **priority**. If the new priority is
     * greater than the previous priority, this function will throw an Error.
     *
     * @param {Object} key the key for which to raise priority
     * @param {Number} priority the new priority for the key
     */
    decrease(key: any, priority: number): void;
    _heapify(i: any): void;
    _decrease(index: any): void;
    _swap(i: any, j: any): void;
}
