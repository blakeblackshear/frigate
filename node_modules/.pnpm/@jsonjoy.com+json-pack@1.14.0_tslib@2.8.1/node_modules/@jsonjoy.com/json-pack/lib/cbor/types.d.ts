export type CborUint8Array<T> = Uint8Array & {
    __BRAND__: 'cbor';
    __TYPE__: T;
};
