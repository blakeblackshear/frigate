function getMessageLength(data) {
  if (data instanceof Blob) {
    return data.size;
  }
  if (data instanceof ArrayBuffer) {
    return data.byteLength;
  }
  return new Blob([data]).size;
}
export {
  getMessageLength
};
//# sourceMappingURL=getMessageLength.mjs.map