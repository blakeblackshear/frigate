import { DecrypterAesMode } from './decrypter-aes-mode';

export default class FastAESKey {
  private subtle: SubtleCrypto;
  private key: ArrayBuffer;
  private aesMode: DecrypterAesMode;

  constructor(
    subtle: SubtleCrypto,
    key: ArrayBuffer,
    aesMode: DecrypterAesMode,
  ) {
    this.subtle = subtle;
    this.key = key;
    this.aesMode = aesMode;
  }

  expandKey() {
    const subtleAlgoName = getSubtleAlgoName(this.aesMode);
    return this.subtle.importKey(
      'raw',
      this.key,
      { name: subtleAlgoName },
      false,
      ['encrypt', 'decrypt'],
    );
  }
}

function getSubtleAlgoName(aesMode: DecrypterAesMode) {
  switch (aesMode) {
    case DecrypterAesMode.cbc:
      return 'AES-CBC';
    case DecrypterAesMode.ctr:
      return 'AES-CTR';
    default:
      throw new Error(`[FastAESKey] invalid aes mode ${aesMode}`);
  }
}
