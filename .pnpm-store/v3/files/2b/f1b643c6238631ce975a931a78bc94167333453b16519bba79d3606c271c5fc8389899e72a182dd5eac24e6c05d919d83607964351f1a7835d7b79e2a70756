/**
 * SAMPLE-AES decrypter
 */

import Decrypter from '../crypt/decrypter';
import { DecrypterAesMode } from '../crypt/decrypter-aes-mode';
import { discardEPB } from '../utils/mp4-tools';
import type { HlsConfig } from '../config';
import type { HlsEventEmitter } from '../events';
import type {
  AACAudioSample,
  DemuxedVideoTrackBase,
  KeyData,
  VideoSample,
  VideoSampleUnit,
} from '../types/demuxer';

class SampleAesDecrypter {
  private keyData: KeyData;
  private decrypter: Decrypter;

  constructor(observer: HlsEventEmitter, config: HlsConfig, keyData: KeyData) {
    this.keyData = keyData;
    this.decrypter = new Decrypter(config, {
      removePKCS7Padding: false,
    });
  }

  decryptBuffer(encryptedData: Uint8Array | ArrayBuffer): Promise<ArrayBuffer> {
    return this.decrypter.decrypt(
      encryptedData,
      this.keyData.key.buffer,
      this.keyData.iv.buffer,
      DecrypterAesMode.cbc,
    );
  }

  // AAC - encrypt all full 16 bytes blocks starting from offset 16
  private decryptAacSample(
    samples: AACAudioSample[],
    sampleIndex: number,
    callback: () => void,
  ) {
    const curUnit = samples[sampleIndex].unit;
    if (curUnit.length <= 16) {
      // No encrypted portion in this sample (first 16 bytes is not
      // encrypted, see https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/HLS_Sample_Encryption/Encryption/Encryption.html),
      return;
    }
    const encryptedData = curUnit.subarray(
      16,
      curUnit.length - (curUnit.length % 16),
    );
    const encryptedBuffer = encryptedData.buffer.slice(
      encryptedData.byteOffset,
      encryptedData.byteOffset + encryptedData.length,
    );

    this.decryptBuffer(encryptedBuffer)
      .then((decryptedBuffer: ArrayBuffer) => {
        const decryptedData = new Uint8Array(decryptedBuffer);
        curUnit.set(decryptedData, 16);

        if (!this.decrypter.isSync()) {
          this.decryptAacSamples(samples, sampleIndex + 1, callback);
        }
      })
      .catch(callback);
  }

  decryptAacSamples(
    samples: AACAudioSample[],
    sampleIndex: number,
    callback: () => void,
  ) {
    for (; ; sampleIndex++) {
      if (sampleIndex >= samples.length) {
        callback();
        return;
      }

      if (samples[sampleIndex].unit.length < 32) {
        continue;
      }

      this.decryptAacSample(samples, sampleIndex, callback);

      if (!this.decrypter.isSync()) {
        return;
      }
    }
  }

  // AVC - encrypt one 16 bytes block out of ten, starting from offset 32
  getAvcEncryptedData(decodedData: Uint8Array) {
    const encryptedDataLen =
      Math.floor((decodedData.length - 48) / 160) * 16 + 16;
    const encryptedData = new Int8Array(encryptedDataLen);
    let outputPos = 0;
    for (
      let inputPos = 32;
      inputPos < decodedData.length - 16;
      inputPos += 160, outputPos += 16
    ) {
      encryptedData.set(
        decodedData.subarray(inputPos, inputPos + 16),
        outputPos,
      );
    }

    return encryptedData;
  }

  getAvcDecryptedUnit(decodedData: Uint8Array, decryptedData: ArrayBufferLike) {
    const uint8DecryptedData = new Uint8Array(decryptedData);
    let inputPos = 0;
    for (
      let outputPos = 32;
      outputPos < decodedData.length - 16;
      outputPos += 160, inputPos += 16
    ) {
      decodedData.set(
        uint8DecryptedData.subarray(inputPos, inputPos + 16),
        outputPos,
      );
    }

    return decodedData;
  }

  decryptAvcSample(
    samples: VideoSample[],
    sampleIndex: number,
    unitIndex: number,
    callback: () => void,
    curUnit: VideoSampleUnit,
  ) {
    const decodedData = discardEPB(curUnit.data);
    const encryptedData = this.getAvcEncryptedData(decodedData);

    this.decryptBuffer(encryptedData.buffer)
      .then((decryptedBuffer) => {
        curUnit.data = this.getAvcDecryptedUnit(decodedData, decryptedBuffer);

        if (!this.decrypter.isSync()) {
          this.decryptAvcSamples(samples, sampleIndex, unitIndex + 1, callback);
        }
      })
      .catch(callback);
  }

  decryptAvcSamples(
    samples: DemuxedVideoTrackBase['samples'],
    sampleIndex: number,
    unitIndex: number,
    callback: () => void,
  ) {
    if (samples instanceof Uint8Array) {
      throw new Error('Cannot decrypt samples of type Uint8Array');
    }

    for (; ; sampleIndex++, unitIndex = 0) {
      if (sampleIndex >= samples.length) {
        callback();
        return;
      }

      const curUnits = samples[sampleIndex].units;
      for (; ; unitIndex++) {
        if (unitIndex >= curUnits.length) {
          break;
        }

        const curUnit = curUnits[unitIndex];
        if (
          curUnit.data.length <= 48 ||
          (curUnit.type !== 1 && curUnit.type !== 5)
        ) {
          continue;
        }

        this.decryptAvcSample(
          samples,
          sampleIndex,
          unitIndex,
          callback,
          curUnit,
        );

        if (!this.decrypter.isSync()) {
          return;
        }
      }
    }
  }
}

export default SampleAesDecrypter;
