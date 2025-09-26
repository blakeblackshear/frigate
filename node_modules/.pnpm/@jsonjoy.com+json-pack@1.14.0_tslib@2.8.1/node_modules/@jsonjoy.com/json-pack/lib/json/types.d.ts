export type JsonUint8Array<T> = Uint8Array & {
    __BRAND__: 'json';
    __TYPE__: T;
};
