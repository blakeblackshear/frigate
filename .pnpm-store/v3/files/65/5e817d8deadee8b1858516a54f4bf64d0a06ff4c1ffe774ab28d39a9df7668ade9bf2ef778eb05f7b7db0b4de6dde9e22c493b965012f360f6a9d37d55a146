/** This class helps read Uint8Array bit-by-bit */
declare class BitReader {
    private readonly input;
    private readonly endianness;
    private byteOffset;
    private bitOffset;
    constructor(input: Uint8Array, endianness: 'big-endian' | 'little-endian');
    /** Reads a specified number of bits, and move the offset */
    getBits(length?: number): number;
}

export { BitReader };
