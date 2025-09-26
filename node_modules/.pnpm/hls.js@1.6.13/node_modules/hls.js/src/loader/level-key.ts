import { arrayValuesMatch, optionalArrayValuesMatch } from '../utils/arrays';
import { isFullSegmentEncryption } from '../utils/encryption-methods-util';
import { hexToArrayBuffer } from '../utils/hex';
import { convertDataUriToArrayBytes } from '../utils/keysystem-util';
import { logger } from '../utils/logger';
import { KeySystemFormats, parsePlayReadyWRM } from '../utils/mediakeys-helper';
import { mp4pssh, parseMultiPssh } from '../utils/mp4-tools';

let keyUriToKeyIdMap: { [uri: string]: Uint8Array<ArrayBuffer> } = {};

export interface DecryptData {
  uri: string;
  method: string;
  keyFormat: string;
  keyFormatVersions: number[];
  iv: Uint8Array<ArrayBuffer> | null;
  key: Uint8Array<ArrayBuffer> | null;
  keyId: Uint8Array<ArrayBuffer> | null;
  pssh: Uint8Array<ArrayBuffer> | null;
  encrypted: boolean;
  isCommonEncryption: boolean;
}

export class LevelKey implements DecryptData {
  public readonly uri: string;
  public readonly method: string;
  public readonly keyFormat: string;
  public readonly keyFormatVersions: number[];
  public readonly encrypted: boolean;
  public readonly isCommonEncryption: boolean;
  public iv: Uint8Array<ArrayBuffer> | null = null;
  public key: Uint8Array<ArrayBuffer> | null = null;
  public keyId: Uint8Array<ArrayBuffer> | null = null;
  public pssh: Uint8Array<ArrayBuffer> | null = null;

  static clearKeyUriToKeyIdMap() {
    keyUriToKeyIdMap = {};
  }

  static setKeyIdForUri(uri: string, keyId: Uint8Array<ArrayBuffer>) {
    keyUriToKeyIdMap[uri] = keyId;
  }

  constructor(
    method: string,
    uri: string,
    format: string,
    formatversions: number[] = [1],
    iv: Uint8Array<ArrayBuffer> | null = null,
    keyId?: string,
  ) {
    this.method = method;
    this.uri = uri;
    this.keyFormat = format;
    this.keyFormatVersions = formatversions;
    this.iv = iv;
    this.encrypted = method ? method !== 'NONE' : false;
    this.isCommonEncryption =
      this.encrypted && !isFullSegmentEncryption(method);
    if (keyId?.startsWith('0x')) {
      this.keyId = new Uint8Array(hexToArrayBuffer(keyId));
    }
  }

  public matches(key: LevelKey): boolean {
    return (
      key.uri === this.uri &&
      key.method === this.method &&
      key.encrypted === this.encrypted &&
      key.keyFormat === this.keyFormat &&
      arrayValuesMatch(key.keyFormatVersions, this.keyFormatVersions) &&
      optionalArrayValuesMatch(key.iv, this.iv) &&
      optionalArrayValuesMatch(key.keyId, this.keyId)
    );
  }

  public isSupported(): boolean {
    // If it's Segment encryption or No encryption, just select that key system
    if (this.method) {
      if (isFullSegmentEncryption(this.method) || this.method === 'NONE') {
        return true;
      }
      if (this.keyFormat === 'identity') {
        // Maintain support for clear SAMPLE-AES with MPEG-3 TS
        return this.method === 'SAMPLE-AES';
      } else if (__USE_EME_DRM__) {
        switch (this.keyFormat) {
          case KeySystemFormats.FAIRPLAY:
          case KeySystemFormats.WIDEVINE:
          case KeySystemFormats.PLAYREADY:
          case KeySystemFormats.CLEARKEY:
            return (
              ['SAMPLE-AES', 'SAMPLE-AES-CENC', 'SAMPLE-AES-CTR'].indexOf(
                this.method,
              ) !== -1
            );
        }
      }
    }
    return false;
  }

  public getDecryptData(
    sn: number | 'initSegment',
    levelKeys?: { [key: string]: LevelKey | undefined },
  ): LevelKey | null {
    if (!this.encrypted || !this.uri) {
      return null;
    }

    if (isFullSegmentEncryption(this.method)) {
      let iv = this.iv;
      if (!iv) {
        if (typeof sn !== 'number') {
          // We are fetching decryption data for a initialization segment
          // If the segment was encrypted with AES-128/256
          // It must have an IV defined. We cannot substitute the Segment Number in.
          logger.warn(
            `missing IV for initialization segment with method="${this.method}" - compliance issue`,
          );

          // Explicitly set sn to resulting value from implicit conversions 'initSegment' values for IV generation.
          sn = 0;
        }
        iv = createInitializationVector(sn);
      }
      const decryptdata = new LevelKey(
        this.method,
        this.uri,
        'identity',
        this.keyFormatVersions,
        iv,
      );
      return decryptdata;
    }

    if (!__USE_EME_DRM__) {
      return this;
    }

    if (this.keyId) {
      // Handle case where key id is changed in KEY_LOADING event handler #7542#issuecomment-3305203929
      const assignedKeyId = keyUriToKeyIdMap[this.uri];
      if (assignedKeyId && !arrayValuesMatch(this.keyId, assignedKeyId)) {
        LevelKey.setKeyIdForUri(this.uri, this.keyId);
      }

      if (this.pssh) {
        return this;
      }
    }

    // Key bytes are signalled the KEYID attribute, typically only found on WideVine KEY tags
    // Initialize keyId if possible
    const keyBytes = convertDataUriToArrayBytes(this.uri);
    if (keyBytes) {
      switch (this.keyFormat) {
        case KeySystemFormats.WIDEVINE:
          // Setting `pssh` on this LevelKey/DecryptData allows HLS.js to generate a session using
          // the playlist-key before the "encrypted" event. (Comment out to only use "encrypted" path.)
          this.pssh = keyBytes;
          // In case of Widevine, if KEYID is not in the playlist, assume only two fields in the pssh KEY tag URI.
          if (!this.keyId) {
            const results = parseMultiPssh(keyBytes.buffer);
            if (results.length) {
              const psshData = results[0];
              this.keyId = psshData.kids?.length ? psshData.kids[0] : null;
            }
          }
          if (!this.keyId) {
            this.keyId = getKeyIdFromPlayReadyKey(levelKeys);
          }
          break;
        case KeySystemFormats.PLAYREADY: {
          const PlayReadyKeySystemUUID = new Uint8Array([
            0x9a, 0x04, 0xf0, 0x79, 0x98, 0x40, 0x42, 0x86, 0xab, 0x92, 0xe6,
            0x5b, 0xe0, 0x88, 0x5f, 0x95,
          ]);

          // Setting `pssh` on this LevelKey/DecryptData allows HLS.js to generate a session using
          // the playlist-key before the "encrypted" event. (Comment out to only use "encrypted" path.)
          this.pssh = mp4pssh(PlayReadyKeySystemUUID, null, keyBytes);

          this.keyId = parsePlayReadyWRM(keyBytes);

          break;
        }
        default: {
          let keydata = keyBytes.subarray(0, 16);
          if (keydata.length !== 16) {
            const padded = new Uint8Array(16);
            padded.set(keydata, 16 - keydata.length);
            keydata = padded;
          }
          this.keyId = keydata;
          break;
        }
      }
    }

    // Default behavior: get keyId from other KEY tag or URI lookup
    if (!this.keyId || this.keyId.byteLength !== 16) {
      let keyId: Uint8Array<ArrayBuffer> | null | undefined;
      keyId = getKeyIdFromWidevineKey(levelKeys);
      if (!keyId) {
        keyId = getKeyIdFromPlayReadyKey(levelKeys);
        if (!keyId) {
          keyId = keyUriToKeyIdMap[this.uri];
        }
      }
      if (keyId) {
        this.keyId = keyId;
        LevelKey.setKeyIdForUri(this.uri, keyId);
      }
    }

    return this;
  }
}

function getKeyIdFromWidevineKey(
  levelKeys: { [key: string]: LevelKey | undefined } | undefined,
) {
  const widevineKey = levelKeys?.[KeySystemFormats.WIDEVINE];
  if (widevineKey) {
    return widevineKey.keyId;
  }
  return null;
}

function getKeyIdFromPlayReadyKey(
  levelKeys: { [key: string]: LevelKey | undefined } | undefined,
) {
  const playReadyKey = levelKeys?.[KeySystemFormats.PLAYREADY];
  if (playReadyKey) {
    const playReadyKeyBytes = convertDataUriToArrayBytes(playReadyKey.uri);
    if (playReadyKeyBytes) {
      return parsePlayReadyWRM(playReadyKeyBytes);
    }
  }
  return null;
}

function createInitializationVector(segmentNumber: number) {
  const uint8View = new Uint8Array(16);
  for (let i = 12; i < 16; i++) {
    uint8View[i] = (segmentNumber >> (8 * (15 - i))) & 0xff;
  }
  return uint8View;
}
