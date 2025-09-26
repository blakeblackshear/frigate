"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.concurrency = void 0;
const go_1 = require("./go");
/* tslint:disable */
class Task {
    constructor(code) {
        this.code = code;
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}
/** Limits concurrency of async code. */
const concurrency = (limit) => {
    let workers = 0;
    const queue = new Set();
    const work = async () => {
        const task = queue.values().next().value;
        if (task)
            queue.delete(task);
        else
            return;
        workers++;
        try {
            task.resolve(await task.code());
        }
        catch (error) {
            task.reject(error);
        }
        finally {
            workers--, queue.size && (0, go_1.go)(work);
        }
    };
    return async (code) => {
        const task = new Task(code);
        queue.add(task);
        return workers < limit && (0, go_1.go)(work), task.promise;
    };
};
exports.concurrency = concurrency;
