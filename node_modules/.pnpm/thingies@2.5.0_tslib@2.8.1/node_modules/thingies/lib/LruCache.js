"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LruCache = void 0;
class LruCache {
    constructor(limit = 1000) {
        this.limit = limit;
        this.head = undefined;
        this.tail = undefined;
        this.map = Object.create(null);
        this.capacity = limit | 0;
    }
    get size() {
        return this.limit - this.capacity;
    }
    set(key, value) {
        const node = this.map[key];
        if (node) {
            this.pop(node);
            node.v = value;
            this.push(node);
        }
        else {
            if (!this.capacity) {
                const head = this.head;
                if (head) {
                    this.pop(head);
                    delete this.map[head.k];
                    this.capacity++;
                }
            }
            this.capacity--;
            const node = new LruNode(key, value);
            this.map[key] = node;
            this.push(node);
        }
    }
    get(key) {
        const node = this.map[key];
        if (!node)
            return;
        if (this.tail !== node) {
            this.pop(node);
            this.push(node);
        }
        return node.v;
    }
    peek(key) {
        const node = this.map[key];
        return node instanceof LruNode ? node.v : undefined;
    }
    has(key) {
        return key in this.map;
    }
    clear() {
        this.head = undefined;
        this.tail = undefined;
        this.map = Object.create(null);
        this.capacity = this.limit;
    }
    keys() {
        return Object.keys(this.map);
    }
    del(key) {
        const node = this.map[key];
        if (node instanceof LruNode) {
            this.pop(node);
            delete this.map[key];
            ++this.capacity;
            return true;
        }
        return false;
    }
    pop(node) {
        const l = node.l;
        const r = node.r;
        if (this.head === node)
            this.head = r;
        else
            l.r = r;
        if (this.tail === node)
            this.tail = l;
        else
            r.l = l;
        // node.l = undefined;
        // node.r = undefined;
    }
    push(node) {
        const tail = this.tail;
        if (tail) {
            tail.r = node;
            node.l = tail;
        }
        else
            this.head = node;
        this.tail = node;
    }
}
exports.LruCache = LruCache;
class LruNode {
    constructor(k, v) {
        this.k = k;
        this.v = v;
        this.l = undefined;
        this.r = undefined;
    }
}
