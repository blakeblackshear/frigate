import { Buffer } from '../buffer';
declare const bufferAllocUnsafe: (size: number) => Buffer<ArrayBuffer>;
declare const bufferFrom: {
    (array: import("buffer").WithImplicitCoercion<ArrayLike<number>>): Buffer<ArrayBuffer>;
    <TArrayBuffer extends import("buffer").WithImplicitCoercion<ArrayBufferLike>>(arrayBuffer: TArrayBuffer, byteOffset?: number, length?: number): Buffer<import("buffer").ImplicitArrayBuffer<TArrayBuffer>>;
    (string: import("buffer").WithImplicitCoercion<string>, encoding?: BufferEncoding): Buffer<ArrayBuffer>;
    (arrayOrString: import("buffer").WithImplicitCoercion<ArrayLike<number> | string>): Buffer<ArrayBuffer>;
};
export { Buffer, bufferAllocUnsafe, bufferFrom };
