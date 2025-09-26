// PKCS7
export function removePadding(array: Uint8Array<ArrayBuffer>) {
  const outputBytes = array.byteLength;
  const paddingBytes =
    outputBytes && new DataView(array.buffer).getUint8(outputBytes - 1);
  if (paddingBytes) {
    return array.slice(0, outputBytes - paddingBytes);
  }
  return array;
}

export default class AESDecryptor {
  private rcon: Array<number> = [
    0x0, 0x1, 0x2, 0x4, 0x8, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36,
  ];
  private subMix: Array<Uint32Array> = [
    new Uint32Array(256),
    new Uint32Array(256),
    new Uint32Array(256),
    new Uint32Array(256),
  ];
  private invSubMix: Array<Uint32Array> = [
    new Uint32Array(256),
    new Uint32Array(256),
    new Uint32Array(256),
    new Uint32Array(256),
  ];
  private sBox: Uint32Array = new Uint32Array(256);
  private invSBox: Uint32Array = new Uint32Array(256);
  private key: Uint32Array = new Uint32Array(0);

  private ksRows: number = 0;
  private keySize: number = 0;
  private keySchedule!: Uint32Array;
  private invKeySchedule!: Uint32Array;

  constructor() {
    this.initTable();
  }

  // Using view.getUint32() also swaps the byte order.
  uint8ArrayToUint32Array_(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const newArray = new Uint32Array(4);
    for (let i = 0; i < 4; i++) {
      newArray[i] = view.getUint32(i * 4);
    }

    return newArray;
  }

  initTable() {
    const sBox = this.sBox;
    const invSBox = this.invSBox;
    const subMix = this.subMix;
    const subMix0 = subMix[0];
    const subMix1 = subMix[1];
    const subMix2 = subMix[2];
    const subMix3 = subMix[3];
    const invSubMix = this.invSubMix;
    const invSubMix0 = invSubMix[0];
    const invSubMix1 = invSubMix[1];
    const invSubMix2 = invSubMix[2];
    const invSubMix3 = invSubMix[3];

    const d = new Uint32Array(256);
    let x = 0;
    let xi = 0;
    let i = 0;
    for (i = 0; i < 256; i++) {
      if (i < 128) {
        d[i] = i << 1;
      } else {
        d[i] = (i << 1) ^ 0x11b;
      }
    }

    for (i = 0; i < 256; i++) {
      let sx = xi ^ (xi << 1) ^ (xi << 2) ^ (xi << 3) ^ (xi << 4);
      sx = (sx >>> 8) ^ (sx & 0xff) ^ 0x63;
      sBox[x] = sx;
      invSBox[sx] = x;

      // Compute multiplication
      const x2 = d[x];
      const x4 = d[x2];
      const x8 = d[x4];

      // Compute sub/invSub bytes, mix columns tables
      let t = (d[sx] * 0x101) ^ (sx * 0x1010100);
      subMix0[x] = (t << 24) | (t >>> 8);
      subMix1[x] = (t << 16) | (t >>> 16);
      subMix2[x] = (t << 8) | (t >>> 24);
      subMix3[x] = t;

      // Compute inv sub bytes, inv mix columns tables
      t = (x8 * 0x1010101) ^ (x4 * 0x10001) ^ (x2 * 0x101) ^ (x * 0x1010100);
      invSubMix0[sx] = (t << 24) | (t >>> 8);
      invSubMix1[sx] = (t << 16) | (t >>> 16);
      invSubMix2[sx] = (t << 8) | (t >>> 24);
      invSubMix3[sx] = t;

      // Compute next counter
      if (!x) {
        x = xi = 1;
      } else {
        x = x2 ^ d[d[d[x8 ^ x2]]];
        xi ^= d[d[xi]];
      }
    }
  }

  expandKey(keyBuffer: ArrayBuffer) {
    // convert keyBuffer to Uint32Array
    const key = this.uint8ArrayToUint32Array_(keyBuffer);
    let sameKey = true;
    let offset = 0;

    while (offset < key.length && sameKey) {
      sameKey = key[offset] === this.key[offset];
      offset++;
    }

    if (sameKey) {
      return;
    }

    this.key = key;
    const keySize = (this.keySize = key.length);

    if (keySize !== 4 && keySize !== 6 && keySize !== 8) {
      throw new Error('Invalid aes key size=' + keySize);
    }

    const ksRows = (this.ksRows = (keySize + 6 + 1) * 4);
    let ksRow;
    let invKsRow;

    const keySchedule = (this.keySchedule = new Uint32Array(ksRows));
    const invKeySchedule = (this.invKeySchedule = new Uint32Array(ksRows));
    const sbox = this.sBox;
    const rcon = this.rcon;

    const invSubMix = this.invSubMix;
    const invSubMix0 = invSubMix[0];
    const invSubMix1 = invSubMix[1];
    const invSubMix2 = invSubMix[2];
    const invSubMix3 = invSubMix[3];

    let prev;
    let t;

    for (ksRow = 0; ksRow < ksRows; ksRow++) {
      if (ksRow < keySize) {
        prev = keySchedule[ksRow] = key[ksRow];
        continue;
      }
      t = prev;

      if (ksRow % keySize === 0) {
        // Rot word
        t = (t << 8) | (t >>> 24);

        // Sub word
        t =
          (sbox[t >>> 24] << 24) |
          (sbox[(t >>> 16) & 0xff] << 16) |
          (sbox[(t >>> 8) & 0xff] << 8) |
          sbox[t & 0xff];

        // Mix Rcon
        t ^= rcon[(ksRow / keySize) | 0] << 24;
      } else if (keySize > 6 && ksRow % keySize === 4) {
        // Sub word
        t =
          (sbox[t >>> 24] << 24) |
          (sbox[(t >>> 16) & 0xff] << 16) |
          (sbox[(t >>> 8) & 0xff] << 8) |
          sbox[t & 0xff];
      }

      keySchedule[ksRow] = prev = (keySchedule[ksRow - keySize] ^ t) >>> 0;
    }

    for (invKsRow = 0; invKsRow < ksRows; invKsRow++) {
      ksRow = ksRows - invKsRow;
      if (invKsRow & 3) {
        t = keySchedule[ksRow];
      } else {
        t = keySchedule[ksRow - 4];
      }

      if (invKsRow < 4 || ksRow <= 4) {
        invKeySchedule[invKsRow] = t;
      } else {
        invKeySchedule[invKsRow] =
          invSubMix0[sbox[t >>> 24]] ^
          invSubMix1[sbox[(t >>> 16) & 0xff]] ^
          invSubMix2[sbox[(t >>> 8) & 0xff]] ^
          invSubMix3[sbox[t & 0xff]];
      }

      invKeySchedule[invKsRow] = invKeySchedule[invKsRow] >>> 0;
    }
  }

  // Adding this as a method greatly improves performance.
  networkToHostOrderSwap(word) {
    return (
      (word << 24) |
      ((word & 0xff00) << 8) |
      ((word & 0xff0000) >> 8) |
      (word >>> 24)
    );
  }

  decrypt(
    inputArrayBuffer: ArrayBufferLike,
    offset: number,
    aesIV: ArrayBuffer,
  ) {
    const nRounds = this.keySize + 6;
    const invKeySchedule = this.invKeySchedule;
    const invSBOX = this.invSBox;

    const invSubMix = this.invSubMix;
    const invSubMix0 = invSubMix[0];
    const invSubMix1 = invSubMix[1];
    const invSubMix2 = invSubMix[2];
    const invSubMix3 = invSubMix[3];

    const initVector = this.uint8ArrayToUint32Array_(aesIV);
    let initVector0 = initVector[0];
    let initVector1 = initVector[1];
    let initVector2 = initVector[2];
    let initVector3 = initVector[3];

    const inputInt32 = new Int32Array(inputArrayBuffer);
    const outputInt32 = new Int32Array(inputInt32.length);

    let t0, t1, t2, t3;
    let s0, s1, s2, s3;
    let inputWords0, inputWords1, inputWords2, inputWords3;

    let ksRow, i;
    const swapWord = this.networkToHostOrderSwap;

    while (offset < inputInt32.length) {
      inputWords0 = swapWord(inputInt32[offset]);
      inputWords1 = swapWord(inputInt32[offset + 1]);
      inputWords2 = swapWord(inputInt32[offset + 2]);
      inputWords3 = swapWord(inputInt32[offset + 3]);

      s0 = inputWords0 ^ invKeySchedule[0];
      s1 = inputWords3 ^ invKeySchedule[1];
      s2 = inputWords2 ^ invKeySchedule[2];
      s3 = inputWords1 ^ invKeySchedule[3];

      ksRow = 4;

      // Iterate through the rounds of decryption
      for (i = 1; i < nRounds; i++) {
        t0 =
          invSubMix0[s0 >>> 24] ^
          invSubMix1[(s1 >> 16) & 0xff] ^
          invSubMix2[(s2 >> 8) & 0xff] ^
          invSubMix3[s3 & 0xff] ^
          invKeySchedule[ksRow];
        t1 =
          invSubMix0[s1 >>> 24] ^
          invSubMix1[(s2 >> 16) & 0xff] ^
          invSubMix2[(s3 >> 8) & 0xff] ^
          invSubMix3[s0 & 0xff] ^
          invKeySchedule[ksRow + 1];
        t2 =
          invSubMix0[s2 >>> 24] ^
          invSubMix1[(s3 >> 16) & 0xff] ^
          invSubMix2[(s0 >> 8) & 0xff] ^
          invSubMix3[s1 & 0xff] ^
          invKeySchedule[ksRow + 2];
        t3 =
          invSubMix0[s3 >>> 24] ^
          invSubMix1[(s0 >> 16) & 0xff] ^
          invSubMix2[(s1 >> 8) & 0xff] ^
          invSubMix3[s2 & 0xff] ^
          invKeySchedule[ksRow + 3];
        // Update state
        s0 = t0;
        s1 = t1;
        s2 = t2;
        s3 = t3;

        ksRow = ksRow + 4;
      }

      // Shift rows, sub bytes, add round key
      t0 =
        (invSBOX[s0 >>> 24] << 24) ^
        (invSBOX[(s1 >> 16) & 0xff] << 16) ^
        (invSBOX[(s2 >> 8) & 0xff] << 8) ^
        invSBOX[s3 & 0xff] ^
        invKeySchedule[ksRow];
      t1 =
        (invSBOX[s1 >>> 24] << 24) ^
        (invSBOX[(s2 >> 16) & 0xff] << 16) ^
        (invSBOX[(s3 >> 8) & 0xff] << 8) ^
        invSBOX[s0 & 0xff] ^
        invKeySchedule[ksRow + 1];
      t2 =
        (invSBOX[s2 >>> 24] << 24) ^
        (invSBOX[(s3 >> 16) & 0xff] << 16) ^
        (invSBOX[(s0 >> 8) & 0xff] << 8) ^
        invSBOX[s1 & 0xff] ^
        invKeySchedule[ksRow + 2];
      t3 =
        (invSBOX[s3 >>> 24] << 24) ^
        (invSBOX[(s0 >> 16) & 0xff] << 16) ^
        (invSBOX[(s1 >> 8) & 0xff] << 8) ^
        invSBOX[s2 & 0xff] ^
        invKeySchedule[ksRow + 3];

      // Write
      outputInt32[offset] = swapWord(t0 ^ initVector0);
      outputInt32[offset + 1] = swapWord(t3 ^ initVector1);
      outputInt32[offset + 2] = swapWord(t2 ^ initVector2);
      outputInt32[offset + 3] = swapWord(t1 ^ initVector3);

      // reset initVector to last 4 unsigned int
      initVector0 = inputWords0;
      initVector1 = inputWords1;
      initVector2 = inputWords2;
      initVector3 = inputWords3;

      offset = offset + 4;
    }

    return outputInt32.buffer;
  }
}
