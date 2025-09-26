import { mimeTypeForCodec } from './utils/codecs';
import { getMediaSource } from './utils/mediasource-helper';
import type { ExtendedSourceBuffer } from './types/buffer';

function getSourceBuffer(): typeof self.SourceBuffer {
  return self.SourceBuffer || (self as any).WebKitSourceBuffer;
}

export function isMSESupported(): boolean {
  const mediaSource = getMediaSource();
  if (!mediaSource) {
    return false;
  }

  // if SourceBuffer is exposed ensure its API is valid
  // Older browsers do not expose SourceBuffer globally so checking SourceBuffer.prototype is impossible
  const sourceBuffer = getSourceBuffer();
  return (
    !sourceBuffer ||
    (sourceBuffer.prototype &&
      typeof sourceBuffer.prototype.appendBuffer === 'function' &&
      typeof sourceBuffer.prototype.remove === 'function')
  );
}

export function isSupported(): boolean {
  if (!isMSESupported()) {
    return false;
  }

  const mediaSource = getMediaSource();
  return (
    typeof mediaSource?.isTypeSupported === 'function' &&
    (['avc1.42E01E,mp4a.40.2', 'av01.0.01M.08', 'vp09.00.50.08'].some(
      (codecsForVideoContainer) =>
        mediaSource.isTypeSupported(
          mimeTypeForCodec(codecsForVideoContainer, 'video'),
        ),
    ) ||
      ['mp4a.40.2', 'fLaC'].some((codecForAudioContainer) =>
        mediaSource.isTypeSupported(
          mimeTypeForCodec(codecForAudioContainer, 'audio'),
        ),
      ))
  );
}

export function changeTypeSupported(): boolean {
  const sourceBuffer = getSourceBuffer();
  return (
    typeof (sourceBuffer?.prototype as ExtendedSourceBuffer)?.changeType ===
    'function'
  );
}
