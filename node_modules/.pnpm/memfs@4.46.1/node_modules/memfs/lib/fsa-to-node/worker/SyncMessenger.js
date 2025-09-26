"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncMessenger = void 0;
/**
 * @param condition Condition to wait for, when true, the function returns.
 * @param ms Maximum time to wait in milliseconds.
 */
const sleepUntil = (condition, ms = 100) => {
    const start = Date.now();
    while (!condition()) {
        const now = Date.now();
        if (now - start > ms)
            throw new Error('Timeout');
    }
};
/**
 * `SyncMessenger` allows to execute asynchronous code synchronously. The
 * asynchronous code is executed in a Worker thread, while the main thread is
 * blocked until the asynchronous code is finished.
 *
 * First four 4-byte words is the header, where the first word is used for Atomics
 * notifications. The second word is used for spin-locking the main thread until
 * the asynchronous code is finished. The third word is used to specify payload
 * length. The fourth word is currently unused.
 *
 * The maximum payload size is the size of the SharedArrayBuffer minus the
 * header size.
 */
class SyncMessenger {
    constructor(sab) {
        this.sab = sab;
        this.int32 = new Int32Array(sab);
        this.uint8 = new Uint8Array(sab);
        this.headerSize = 4 * 4;
        this.dataSize = sab.byteLength - this.headerSize;
    }
    callSync(data) {
        const requestLength = data.length;
        const headerSize = this.headerSize;
        const int32 = this.int32;
        int32[1] = 0;
        int32[2] = requestLength;
        this.uint8.set(data, headerSize);
        Atomics.notify(int32, 0);
        sleepUntil(() => int32[1] === 1);
        const responseLength = int32[2];
        const response = this.uint8.slice(headerSize, headerSize + responseLength);
        return response;
    }
    serveAsync(callback) {
        const headerSize = this.headerSize;
        (async () => {
            try {
                const int32 = this.int32;
                const res = Atomics.wait(int32, 0, 0);
                if (res !== 'ok')
                    throw new Error(`Unexpected Atomics.wait result: ${res}`);
                const requestLength = this.int32[2];
                const request = this.uint8.slice(headerSize, headerSize + requestLength);
                const response = await callback(request);
                const responseLength = response.length;
                int32[2] = responseLength;
                this.uint8.set(response, headerSize);
                int32[1] = 1;
            }
            catch { }
            this.serveAsync(callback);
        })().catch(() => { });
    }
}
exports.SyncMessenger = SyncMessenger;
//# sourceMappingURL=SyncMessenger.js.map