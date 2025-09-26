"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FsaNodeSyncAdapterWorker = void 0;
const Defer_1 = require("thingies/lib/Defer");
const SyncMessenger_1 = require("./SyncMessenger");
const json_1 = require("../json");
let rootId = 0;
class FsaNodeSyncAdapterWorker {
    static async start(url, dir) {
        const worker = new Worker(url);
        const future = new Defer_1.Defer();
        let id = rootId++;
        let messenger = undefined;
        const _dir = await dir;
        worker.onmessage = e => {
            const data = e.data;
            if (!Array.isArray(data))
                return;
            const msg = data;
            const code = msg[0];
            switch (code) {
                case 0 /* FsaNodeWorkerMessageCode.Init */: {
                    const [, sab] = msg;
                    messenger = new SyncMessenger_1.SyncMessenger(sab);
                    const setRootMessage = [1 /* FsaNodeWorkerMessageCode.SetRoot */, id, _dir];
                    worker.postMessage(setRootMessage);
                    break;
                }
                case 2 /* FsaNodeWorkerMessageCode.RootSet */: {
                    const [, rootId] = msg;
                    if (id !== rootId)
                        return;
                    const adapter = new FsaNodeSyncAdapterWorker(messenger, _dir);
                    future.resolve(adapter);
                    break;
                }
            }
        };
        return await future.promise;
    }
    constructor(messenger, root) {
        this.messenger = messenger;
        this.root = root;
    }
    call(method, payload) {
        const request = [3 /* FsaNodeWorkerMessageCode.Request */, method, payload];
        const encoded = json_1.encoder.encode(request);
        const encodedResponse = this.messenger.callSync(encoded);
        const [code, data] = json_1.decoder.decode(encodedResponse);
        switch (code) {
            case 4 /* FsaNodeWorkerMessageCode.Response */:
                return data;
            case 5 /* FsaNodeWorkerMessageCode.ResponseError */:
                throw data;
            default: {
                throw new Error('Invalid response message code');
            }
        }
    }
}
exports.FsaNodeSyncAdapterWorker = FsaNodeSyncAdapterWorker;
//# sourceMappingURL=FsaNodeSyncAdapterWorker.js.map