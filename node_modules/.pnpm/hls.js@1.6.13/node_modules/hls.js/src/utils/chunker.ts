import { appendUint8Array } from './mp4-tools';

export default class Chunker {
  private chunkSize: number;
  public cache: Uint8Array | null = null;
  constructor(chunkSize = Math.pow(2, 19)) {
    this.chunkSize = chunkSize;
  }

  public push(data: Uint8Array): Array<Uint8Array> {
    const { cache, chunkSize } = this;
    const result: Array<Uint8Array> = [];

    let temp: Uint8Array | null = null;
    if (cache?.length) {
      temp = appendUint8Array(cache, data);
      this.cache = null;
    } else {
      temp = data;
    }

    if (temp.length < chunkSize) {
      this.cache = temp;
      return result;
    }

    if (temp.length > chunkSize) {
      let offset = 0;
      const len = temp.length;
      while (offset < len - chunkSize) {
        result.push(temp.slice(offset, offset + chunkSize));
        offset += chunkSize;
      }
      this.cache = temp.slice(offset);
    } else {
      result.push(temp);
    }

    return result;
  }
}
