export const getAudioBSID = (data: Uint8Array, offset: number): number => {
  // check the bsid to confirm ac-3 | ec-3
  let bsid = 0;
  let numBits = 5;
  offset += numBits;
  const temp = new Uint32Array(1); // unsigned 32 bit for temporary storage
  const mask = new Uint32Array(1); // unsigned 32 bit mask value
  const byte = new Uint8Array(1); // unsigned 8 bit for temporary storage
  while (numBits > 0) {
    byte[0] = data[offset];
    // read remaining bits, upto 8 bits at a time
    const bits = Math.min(numBits, 8);
    const shift = 8 - bits;
    mask[0] = (0xff000000 >>> (24 + shift)) << shift;
    temp[0] = (byte[0] & mask[0]) >> shift;
    bsid = !bsid ? temp[0] : (bsid << bits) | temp[0];
    offset += 1;
    numBits -= bits;
  }
  return bsid;
};
