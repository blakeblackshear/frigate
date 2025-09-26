import { DecrypterAesMode } from '../crypt/decrypter-aes-mode';

export function isFullSegmentEncryption(method: string): boolean {
  return (
    method === 'AES-128' || method === 'AES-256' || method === 'AES-256-CTR'
  );
}

export function getAesModeFromFullSegmentMethod(
  method: string,
): DecrypterAesMode {
  switch (method) {
    case 'AES-128':
    case 'AES-256':
      return DecrypterAesMode.cbc;
    case 'AES-256-CTR':
      return DecrypterAesMode.ctr;
    default:
      throw new Error(`invalid full segment method ${method}`);
  }
}
