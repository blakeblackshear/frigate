import { getMediaSource } from './mediasource-helper';
import { isHEVC } from './mp4-tools';

export const userAgentHevcSupportIsInaccurate = () => {
  return /\(Windows.+Firefox\//i.test(navigator.userAgent);
};

// from http://mp4ra.org/codecs.html
// values indicate codec selection preference (lower is higher priority)
export const sampleEntryCodesISO = {
  audio: {
    a3ds: 1,
    'ac-3': 0.95,
    'ac-4': 1,
    alac: 0.9,
    alaw: 1,
    dra1: 1,
    'dts+': 1,
    'dts-': 1,
    dtsc: 1,
    dtse: 1,
    dtsh: 1,
    'ec-3': 0.9,
    enca: 1,
    fLaC: 0.9, // MP4-RA listed codec entry for FLAC
    flac: 0.9, // legacy browser codec name for FLAC
    FLAC: 0.9, // some manifests may list "FLAC" with Apple's tools
    g719: 1,
    g726: 1,
    m4ae: 1,
    mha1: 1,
    mha2: 1,
    mhm1: 1,
    mhm2: 1,
    mlpa: 1,
    mp4a: 1,
    'raw ': 1,
    Opus: 1,
    opus: 1, // browsers expect this to be lowercase despite MP4RA says 'Opus'
    samr: 1,
    sawb: 1,
    sawp: 1,
    sevc: 1,
    sqcp: 1,
    ssmv: 1,
    twos: 1,
    ulaw: 1,
  },
  video: {
    avc1: 1,
    avc2: 1,
    avc3: 1,
    avc4: 1,
    avcp: 1,
    av01: 0.8,
    dav1: 0.8,
    drac: 1,
    dva1: 1,
    dvav: 1,
    dvh1: 0.7,
    dvhe: 0.7,
    encv: 1,
    hev1: 0.75,
    hvc1: 0.75,
    mjp2: 1,
    mp4v: 1,
    mvc1: 1,
    mvc2: 1,
    mvc3: 1,
    mvc4: 1,
    resv: 1,
    rv60: 1,
    s263: 1,
    svc1: 1,
    svc2: 1,
    'vc-1': 1,
    vp08: 1,
    vp09: 0.9,
  },
  text: {
    stpp: 1,
    wvtt: 1,
  },
} as const;

export type CodecType = 'audio' | 'video';

export function isCodecType(codec: string, type: CodecType): boolean {
  const typeCodes = sampleEntryCodesISO[type];
  return !!typeCodes && !!typeCodes[codec.slice(0, 4)];
}

export function areCodecsMediaSourceSupported(
  codecs: string,
  type: CodecType,
  preferManagedMediaSource = true,
): boolean {
  return !codecs
    .split(',')
    .some(
      (codec) =>
        !isCodecMediaSourceSupported(codec, type, preferManagedMediaSource),
    );
}

function isCodecMediaSourceSupported(
  codec: string,
  type: CodecType,
  preferManagedMediaSource = true,
): boolean {
  const MediaSource = getMediaSource(preferManagedMediaSource);
  return MediaSource?.isTypeSupported(mimeTypeForCodec(codec, type)) ?? false;
}

export function mimeTypeForCodec(codec: string, type: CodecType): string {
  return `${type}/mp4;codecs=${codec}`;
}

export function videoCodecPreferenceValue(
  videoCodec: string | undefined,
): number {
  if (videoCodec) {
    const fourCC = videoCodec.substring(0, 4);
    return sampleEntryCodesISO.video[fourCC];
  }
  return 2;
}

export function codecsSetSelectionPreferenceValue(codecSet: string): number {
  const limitedHevcSupport = userAgentHevcSupportIsInaccurate();
  return codecSet.split(',').reduce((num, fourCC) => {
    const lowerPriority = limitedHevcSupport && isHEVC(fourCC);
    const preferenceValue = lowerPriority
      ? 9
      : sampleEntryCodesISO.video[fourCC];
    if (preferenceValue) {
      return (preferenceValue * 2 + num) / (num ? 3 : 2);
    }
    return (sampleEntryCodesISO.audio[fourCC] + num) / (num ? 2 : 1);
  }, 0);
}

interface CodecNameCache {
  flac?: string;
  opus?: string;
}

const CODEC_COMPATIBLE_NAMES: CodecNameCache = {};

type LowerCaseCodecType = 'flac' | 'opus';

function getCodecCompatibleNameLower(
  lowerCaseCodec: LowerCaseCodecType,
  preferManagedMediaSource = true,
): string {
  if (CODEC_COMPATIBLE_NAMES[lowerCaseCodec]) {
    return CODEC_COMPATIBLE_NAMES[lowerCaseCodec]!;
  }

  const codecsToCheck = {
    // Idealy fLaC and Opus would be first (spec-compliant) but
    // some browsers will report that fLaC is supported then fail.
    // see: https://bugs.chromium.org/p/chromium/issues/detail?id=1422728
    flac: ['flac', 'fLaC', 'FLAC'],
    opus: ['opus', 'Opus'],
    // Replace audio codec info if browser does not support mp4a.40.34,
    // and demuxer can fallback to 'audio/mpeg' or 'audio/mp4;codecs="mp3"'
    'mp4a.40.34': ['mp3'],
  }[lowerCaseCodec];

  for (let i = 0; i < codecsToCheck.length; i++) {
    if (
      isCodecMediaSourceSupported(
        codecsToCheck[i],
        'audio',
        preferManagedMediaSource,
      )
    ) {
      CODEC_COMPATIBLE_NAMES[lowerCaseCodec] = codecsToCheck[i];
      return codecsToCheck[i];
    } else if (
      codecsToCheck[i] === 'mp3' &&
      getMediaSource(preferManagedMediaSource)?.isTypeSupported('audio/mpeg')
    ) {
      return '';
    }
  }

  return lowerCaseCodec;
}

const AUDIO_CODEC_REGEXP = /flac|opus|mp4a\.40\.34/i;
export function getCodecCompatibleName(
  codec: string,
  preferManagedMediaSource = true,
): string {
  return codec.replace(AUDIO_CODEC_REGEXP, (m) =>
    getCodecCompatibleNameLower(
      m.toLowerCase() as LowerCaseCodecType,
      preferManagedMediaSource,
    ),
  );
}

export function replaceVideoCodec(
  originalCodecs: string | undefined,
  newVideoCodec: string | undefined,
): string | undefined {
  const codecs: string[] = [];
  if (originalCodecs) {
    const allCodecs = originalCodecs.split(',');
    for (let i = 0; i < allCodecs.length; i++) {
      if (!isCodecType(allCodecs[i], 'video')) {
        codecs.push(allCodecs[i]);
      }
    }
  }
  if (newVideoCodec) {
    codecs.push(newVideoCodec);
  }
  return codecs.join(',');
}

export function pickMostCompleteCodecName(
  parsedCodec: string | undefined,
  levelCodec: string | undefined,
): string | undefined {
  // Parsing of mp4a codecs strings in mp4-tools from media is incomplete as of d8c6c7a
  // so use level codec is parsed codec is unavailable or incomplete
  if (
    parsedCodec &&
    (parsedCodec.length > 4 ||
      ['ac-3', 'ec-3', 'alac', 'fLaC', 'Opus'].indexOf(parsedCodec) !== -1)
  ) {
    if (
      isCodecSupportedAsType(parsedCodec, 'audio') ||
      isCodecSupportedAsType(parsedCodec, 'video')
    ) {
      return parsedCodec;
    }
  }
  if (levelCodec) {
    const levelCodecs = levelCodec.split(',');
    if (levelCodecs.length > 1) {
      if (parsedCodec) {
        for (let i = levelCodecs.length; i--; ) {
          if (levelCodecs[i].substring(0, 4) === parsedCodec.substring(0, 4)) {
            return levelCodecs[i];
          }
        }
      }
      return levelCodecs[0];
    }
  }
  return levelCodec || parsedCodec;
}

function isCodecSupportedAsType(codec: string, type: CodecType): boolean {
  return isCodecType(codec, type) && isCodecMediaSourceSupported(codec, type);
}

export function convertAVC1ToAVCOTI(videoCodecs: string): string {
  // Convert avc1 codec string from RFC-4281 to RFC-6381 for MediaSource.isTypeSupported
  // Examples: avc1.66.30 to avc1.42001e and avc1.77.30,avc1.66.30 to avc1.4d001e,avc1.42001e.
  const codecs = videoCodecs.split(',');
  for (let i = 0; i < codecs.length; i++) {
    const avcdata = codecs[i].split('.');
    // only convert codec strings starting with avc1 (Examples: avc1.64001f,dvh1.05.07)
    if (avcdata.length > 2 && avcdata[0] === 'avc1') {
      codecs[i] = `avc1.${parseInt(avcdata[1]).toString(16)}${(
        '000' + parseInt(avcdata[2]).toString(16)
      ).slice(-4)}`;
    }
  }
  return codecs.join(',');
}

export function fillInMissingAV01Params(videoCodec: string): string {
  // Used to fill in incomplete AV1 playlist CODECS strings for mediaCapabilities.decodingInfo queries
  if (videoCodec.startsWith('av01.')) {
    const av1params = videoCodec.split('.');
    const placeholders = ['0', '111', '01', '01', '01', '0'];
    for (let i = av1params.length; i > 4 && i < 10; i++) {
      av1params[i] = placeholders[i - 4];
    }
    return av1params.join('.');
  }
  return videoCodec;
}

export interface TypeSupported {
  mpeg: boolean;
  mp3: boolean;
  ac3: boolean;
}

export function getM2TSSupportedAudioTypes(
  preferManagedMediaSource: boolean,
): TypeSupported {
  const MediaSource = getMediaSource(preferManagedMediaSource) || {
    isTypeSupported: () => false,
  };
  return {
    mpeg: MediaSource.isTypeSupported('audio/mpeg'),
    mp3: MediaSource.isTypeSupported('audio/mp4; codecs="mp3"'),
    ac3: __USE_M2TS_ADVANCED_CODECS__
      ? MediaSource.isTypeSupported('audio/mp4; codecs="ac-3"')
      : false,
  };
}

export function getCodecsForMimeType(mimeType: string): string {
  return mimeType.replace(/^.+codecs=["']?([^"']+).*$/, '$1');
}
