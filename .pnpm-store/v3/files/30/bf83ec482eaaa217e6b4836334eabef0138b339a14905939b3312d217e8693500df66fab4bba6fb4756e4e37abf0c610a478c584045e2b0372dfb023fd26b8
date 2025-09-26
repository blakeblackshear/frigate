"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimedState = void 0;
/**
 * TimedState works similar to TimedQueue, but instead of saving
 * a list of all items pushed, it reduces the state on each push.
 */
class TimedState {
    constructor(initState, reducer) {
        this.initState = initState;
        this.reducer = reducer;
        /**
         * State will be flushed when it reaches this number of items.
         */
        this.itemLimit = 100;
        /**
         * State will be flushed after this many milliseconds.
         */
        this.timeLimit = 5000;
        /**
         * Method that will be called when state is flushed.
         */
        this.onFlush = () => { };
        this.length = 0;
        this.state = this.initState();
        this.timer = null;
    }
    push(item) {
        this.length++;
        this.state = this.reducer(this.state, item);
        if (this.length >= this.itemLimit) {
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
        const { state, length } = this;
        this.state = this.initState();
        this.length = 0;
        if (this.timer)
            clearTimeout(this.timer);
        if (length) {
            this.timer = null;
            try {
                this.onFlush(state);
            }
            catch (error) {
                // tslint:disable-next-line
                console.error('TimedState', error);
            }
        }
        return state;
    }
}
exports.TimedState = TimedState;
