export default class ChunkCache {
  private chunks: Array<Uint8Array<ArrayBuffer>> = [];
  public dataLength: number = 0;

  push(chunk: Uint8Array<ArrayBuffer>) {
    this.chunks.push(chunk);
    this.dataLength += chunk.length;
  }

  flush(): Uint8Array<ArrayBuffer> {
    const { chunks, dataLength } = this;
    let result: Uint8Array<ArrayBuffer>;
    if (!chunks.length) {
      return new Uint8Array(0);
    } else if (chunks.length === 1) {
      result = chunks[0];
    } else {
      result = concatUint8Arrays(chunks, dataLength);
    }
    this.reset();
    return result;
  }

  reset() {
    this.chunks.length = 0;
    this.dataLength = 0;
  }
}

function concatUint8Arrays(
  chunks: Array<Uint8Array<ArrayBuffer>>,
  dataLength: number,
): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(dataLength);
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
