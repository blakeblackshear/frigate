/**
 * Parser for exponential Golomb codes, a variable-bitwidth number encoding scheme used by h264.
 */

import { logger } from '../../utils/logger';

class ExpGolomb {
  private data: Uint8Array;
  public bytesAvailable: number;
  private word: number;
  private bitsAvailable: number;

  constructor(data: Uint8Array) {
    this.data = data;
    // the number of bytes left to examine in this.data
    this.bytesAvailable = data.byteLength;
    // the current word being examined
    this.word = 0; // :uint
    // the number of bits left to examine in the current word
    this.bitsAvailable = 0; // :uint
  }

  // ():void
  loadWord(): void {
    const data = this.data;
    const bytesAvailable = this.bytesAvailable;
    const position = data.byteLength - bytesAvailable;
    const workingBytes = new Uint8Array(4);
    const availableBytes = Math.min(4, bytesAvailable);
    if (availableBytes === 0) {
      throw new Error('no bytes available');
    }

    workingBytes.set(data.subarray(position, position + availableBytes));
    this.word = new DataView(workingBytes.buffer).getUint32(0);
    // track the amount of this.data that has been processed
    this.bitsAvailable = availableBytes * 8;
    this.bytesAvailable -= availableBytes;
  }

  // (count:int):void
  skipBits(count: number): void {
    let skipBytes; // :int
    count = Math.min(count, this.bytesAvailable * 8 + this.bitsAvailable);
    if (this.bitsAvailable > count) {
      this.word <<= count;
      this.bitsAvailable -= count;
    } else {
      count -= this.bitsAvailable;
      skipBytes = count >> 3;
      count -= skipBytes << 3;
      this.bytesAvailable -= skipBytes;
      this.loadWord();
      this.word <<= count;
      this.bitsAvailable -= count;
    }
  }

  // (size:int):uint
  readBits(size: number): number {
    let bits = Math.min(this.bitsAvailable, size); // :uint
    const valu = this.word >>> (32 - bits); // :uint
    if (size > 32) {
      logger.error('Cannot read more than 32 bits at a time');
    }

    this.bitsAvailable -= bits;
    if (this.bitsAvailable > 0) {
      this.word <<= bits;
    } else if (this.bytesAvailable > 0) {
      this.loadWord();
    } else {
      throw new Error('no bits available');
    }

    bits = size - bits;
    if (bits > 0 && this.bitsAvailable) {
      return (valu << bits) | this.readBits(bits);
    } else {
      return valu;
    }
  }

  // ():uint
  skipLZ(): number {
    let leadingZeroCount; // :uint
    for (
      leadingZeroCount = 0;
      leadingZeroCount < this.bitsAvailable;
      ++leadingZeroCount
    ) {
      if ((this.word & (0x80000000 >>> leadingZeroCount)) !== 0) {
        // the first bit of working word is 1
        this.word <<= leadingZeroCount;
        this.bitsAvailable -= leadingZeroCount;
        return leadingZeroCount;
      }
    }
    // we exhausted word and still have not found a 1
    this.loadWord();
    return leadingZeroCount + this.skipLZ();
  }

  // ():void
  skipUEG(): void {
    this.skipBits(1 + this.skipLZ());
  }

  // ():void
  skipEG(): void {
    this.skipBits(1 + this.skipLZ());
  }

  // ():uint
  readUEG(): number {
    const clz = this.skipLZ(); // :uint
    return this.readBits(clz + 1) - 1;
  }

  // ():int
  readEG(): number {
    const valu = this.readUEG(); // :int
    if (0x01 & valu) {
      // the number is odd if the low order bit is set
      return (1 + valu) >>> 1; // add 1 to make it even, and divide by 2
    } else {
      return -1 * (valu >>> 1); // divide by two then make it negative
    }
  }

  // Some convenience functions
  // :Boolean
  readBoolean(): boolean {
    return this.readBits(1) === 1;
  }

  // ():int
  readUByte(): number {
    return this.readBits(8);
  }

  // ():int
  readUShort(): number {
    return this.readBits(16);
  }

  // ():int
  readUInt(): number {
    return this.readBits(32);
  }
}

export default ExpGolomb;
