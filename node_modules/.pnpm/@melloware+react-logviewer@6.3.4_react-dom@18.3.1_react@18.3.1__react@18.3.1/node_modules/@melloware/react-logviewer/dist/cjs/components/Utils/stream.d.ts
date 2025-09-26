import { Emitter, EventType } from "mitt";
export declare const recurseReaderAsEvent: any;
declare const _default: (url: RequestInfo | URL, options: any) => Emitter<Record<EventType, unknown>>;
export default _default;
