import { RAL } from '../common/api';
interface RIL extends RAL {
    readonly stream: {
        readonly asReadableStream: (stream: WebSocket) => RAL.ReadableStream;
        readonly asWritableStream: (stream: WebSocket) => RAL.WritableStream;
    };
}
declare function RIL(): RIL;
declare namespace RIL {
    function install(): void;
}
export default RIL;
