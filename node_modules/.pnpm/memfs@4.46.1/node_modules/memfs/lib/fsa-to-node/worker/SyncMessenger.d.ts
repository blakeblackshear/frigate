export type AsyncCallback = (request: Uint8Array) => Promise<Uint8Array>;
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
export declare class SyncMessenger {
    protected readonly sab: SharedArrayBuffer;
    protected readonly int32: Int32Array;
    protected readonly uint8: Uint8Array;
    protected readonly headerSize: any;
    protected readonly dataSize: any;
    constructor(sab: SharedArrayBuffer);
    callSync(data: Uint8Array): Uint8Array;
    serveAsync(callback: AsyncCallback): void;
}
