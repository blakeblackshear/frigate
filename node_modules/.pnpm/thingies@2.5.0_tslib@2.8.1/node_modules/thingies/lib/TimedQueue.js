"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimedQueue = void 0;
/**
 * Queue that is flushed automatically when it reaches some item limit
 * or when timeout is reached.
 */
class TimedQueue {
    constructor() {
        /**
         * Queue will be flushed when it reaches this number of items.
         */
        this.itemLimit = 100;
        /**
         * Queue will be flushed after this many milliseconds.
         */
        this.timeLimit = 5000;
        /**
         * Method that will be called when queue is flushed.
         */
        this.onFlush = (list) => { };
        this.list = [];
        this.timer = null;
    }
    push(item) {
        this.list.push(item);
        if (this.list.length >= this.itemLimit) {
            this.flush();
            return;
        }
        if (!this.timer) {
            this.timer = setTimeout(() => {
                this.flush();
            }, this.timeLimit);
        }
    }
    flush() {
        const list = this.list;
        this.list = [];
        if (this.timer)
            clearTimeout(this.timer);
        this.timer = null;
        if (list.length) {
            try {
                this.onFlush(list);
            }
            catch (error) {
                // tslint:disable-next-line
                console.error('TimedQueue', error);
            }
        }
        return list;
    }
}
exports.TimedQueue = TimedQueue;
