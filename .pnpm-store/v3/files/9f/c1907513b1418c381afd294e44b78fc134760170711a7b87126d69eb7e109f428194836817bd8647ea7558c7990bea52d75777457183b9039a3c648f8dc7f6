import {
  fillInMissingAV01Params,
  getCodecsForMimeType,
  mimeTypeForCodec,
  userAgentHevcSupportIsInaccurate,
} from './codecs';
import { isHEVC } from './mp4-tools';
import type { AudioTracksByGroup } from './rendition-helper';
import type { Level, VideoRange } from '../types/level';
import type { AudioSelectionOption } from '../types/media-playlist';

export type MediaDecodingInfo = {
  supported: boolean;
  configurations: readonly MediaDecodingConfiguration[];
  decodingInfoResults: readonly MediaCapabilitiesDecodingInfo[];
  error?: Error;
};

// @ts-ignore
const supportedResult: MediaCapabilitiesDecodingInfo = {
  supported: true,
  powerEfficient: true,
  smooth: true,
  // keySystemAccess: null,
};

// @ts-ignore
const unsupportedResult: MediaCapabilitiesDecodingInfo = {
  supported: false,
  smooth: false,
  powerEfficient: false,
  // keySystemAccess: null,
};

export const SUPPORTED_INFO_DEFAULT: MediaDecodingInfo = {
  supported: true,
  configurations: [] as MediaDecodingConfiguration[],
  decodingInfoResults: [supportedResult],
} as const;

export function getUnsupportedResult(
  error: Error,
  configurations: MediaDecodingConfiguration[],
): MediaDecodingInfo {
  return {
    supported: false,
    configurations,
    decodingInfoResults: [unsupportedResult],
    error,
  };
}

export function requiresMediaCapabilitiesDecodingInfo(
  level: Level,
  audioTracksByGroup: AudioTracksByGroup,
  currentVideoRange: VideoRange | undefined,
  currentFrameRate: number,
  currentBw: number,
  audioPreference: AudioSelectionOption | undefined,
): boolean {
  // Only test support when configuration is exceeds minimum options
  const videoCodecs = level.videoCodec;
  const audioGroups = level.audioCodec ? level.audioGroups : null;
  const audioCodecPreference = audioPreference?.audioCodec;
  const channelsPreference = audioPreference?.channels;
  const maxChannels = channelsPreference
    ? parseInt(channelsPreference)
    : audioCodecPreference
      ? Infinity
      : 2;
  let audioChannels: Record<string, number> | null = null;
  if (audioGroups?.length) {
    try {
      if (audioGroups.length === 1 && audioGroups[0]) {
        audioChannels = audioTracksByGroup.groups[audioGroups[0]].channels;
      } else {
        audioChannels = audioGroups.reduce(
          (acc, groupId) => {
            if (groupId) {
              const audioTrackGroup = audioTracksByGroup.groups[groupId];
              if (!audioTrackGroup) {
                throw new Error(`Audio track group ${groupId} not found`);
              }
              // Sum all channel key values
              Object.keys(audioTrackGroup.channels).forEach((key) => {
                acc[key] = (acc[key] || 0) + audioTrackGroup.channels[key];
              });
            }
            return acc;
          },
          { 2: 0 },
        );
      }
    } catch (error) {
      return true;
    }
  }
  return (
    (videoCodecs !== undefined &&
      // Force media capabilities check for HEVC to avoid failure on Windows
      (videoCodecs.split(',').some((videoCodec) => isHEVC(videoCodec)) ||
        (level.width > 1920 && level.height > 1088) ||
        (level.height > 1920 && level.width > 1088) ||
        level.frameRate > Math.max(currentFrameRate, 30) ||
        (level.videoRange !== 'SDR' &&
          level.videoRange !== currentVideoRange) ||
        level.bitrate > Math.max(currentBw, 8e6))) ||
    (!!audioChannels &&
      Number.isFinite(maxChannels) &&
      Object.keys(audioChannels).some(
        (channels) => parseInt(channels) > maxChannels,
      ))
  );
}

export function getMediaDecodingInfoPromise(
  level: Level,
  audioTracksByGroup: AudioTracksByGroup,
  mediaCapabilities: MediaCapabilities | undefined,
  cache: Record<
    string,
    Promise<MediaCapabilitiesDecodingInfo> | undefined
  > = {},
): Promise<MediaDecodingInfo> {
  const videoCodecs = level.videoCodec;
  if ((!videoCodecs && !level.audioCodec) || !mediaCapabilities) {
    return Promise.resolve(SUPPORTED_INFO_DEFAULT);
  }

  const configurations: MediaDecodingConfiguration[] = [];

  const videoDecodeList = makeVideoConfigurations(level);
  const videoCount = videoDecodeList.length;
  const audioDecodeList = makeAudioConfigurations(
    level,
    audioTracksByGroup,
    videoCount > 0,
  );
  const audioCount = audioDecodeList.length;
  for (let i = videoCount || 1 * audioCount || 1; i--; ) {
    const configuration: MediaDecodingConfiguration = {
      type: 'media-source',
    };
    if (videoCount) {
      configuration.video = videoDecodeList[i % videoCount];
    }
    if (audioCount) {
      configuration.audio = audioDecodeList[i % audioCount];
      const audioBitrate = configuration.audio.bitrate;
      if (configuration.video && audioBitrate) {
        configuration.video.bitrate -= audioBitrate;
      }
    }
    configurations.push(configuration);
  }

  if (videoCodecs) {
    // Override Windows Firefox HEVC MediaCapabilities result (https://github.com/video-dev/hls.js/issues/7046)
    const ua = navigator.userAgent;
    if (
      videoCodecs.split(',').some((videoCodec) => isHEVC(videoCodec)) &&
      userAgentHevcSupportIsInaccurate()
    ) {
      return Promise.resolve(
        getUnsupportedResult(
          new Error(
            `Overriding Windows Firefox HEVC MediaCapabilities result based on user-agent string: (${ua})`,
          ),
          configurations,
        ),
      );
    }
  }

  return Promise.all(
    configurations.map((configuration) => {
      // Cache MediaCapabilities promises
      const decodingInfoKey = getMediaDecodingInfoKey(configuration);
      return (
        cache[decodingInfoKey] ||
        (cache[decodingInfoKey] = mediaCapabilities.decodingInfo(configuration))
      );
    }),
  )
    .then((decodingInfoResults) => ({
      supported: !decodingInfoResults.some((info) => !info.supported),
      configurations,
      decodingInfoResults,
    }))
    .catch((error) => ({
      supported: false,
      configurations,
      decodingInfoResults: [] as MediaCapabilitiesDecodingInfo[],
      error,
    }));
}

function makeVideoConfigurations(level: Level): VideoConfiguration[] {
  const videoCodecs = level.videoCodec?.split(',');
  const bitrate = getVariantDecodingBitrate(level);
  const width = level.width || 640;
  const height = level.height || 480;
  // Assume a framerate of 30fps since MediaCapabilities will not accept Level default of 0.
  const framerate = level.frameRate || 30;
  const videoRange = level.videoRange.toLowerCase() as 'sdr' | 'pq' | 'hlg';
  return videoCodecs
    ? videoCodecs.map((videoCodec: string) => {
        const videoConfiguration: VideoConfiguration = {
          contentType: mimeTypeForCodec(
            fillInMissingAV01Params(videoCodec),
            'video',
          ),
          width,
          height,
          bitrate,
          framerate,
        };
        if (videoRange !== 'sdr') {
          videoConfiguration.transferFunction = videoRange as TransferFunction;
        }
        return videoConfiguration;
      })
    : [];
}

function makeAudioConfigurations(
  level: Level,
  audioTracksByGroup: AudioTracksByGroup,
  hasVideo: boolean,
): AudioConfiguration[] {
  const audioCodecs = level.audioCodec?.split(',');
  const combinedBitrate = getVariantDecodingBitrate(level);
  if (audioCodecs && level.audioGroups) {
    return level.audioGroups.reduce((configurations, audioGroupId) => {
      const tracks = audioGroupId
        ? audioTracksByGroup.groups[audioGroupId]?.tracks
        : null;
      if (tracks) {
        return tracks.reduce((configs, audioTrack) => {
          if (audioTrack.groupId === audioGroupId) {
            const channelsNumber = parseFloat(audioTrack.channels || '');
            audioCodecs.forEach((audioCodec) => {
              const audioConfiguration: AudioConfiguration = {
                contentType: mimeTypeForCodec(audioCodec, 'audio'),
                bitrate: hasVideo
                  ? estimatedAudioBitrate(audioCodec, combinedBitrate)
                  : combinedBitrate,
              };
              if (channelsNumber) {
                audioConfiguration.channels = '' + channelsNumber;
              }
              configs.push(audioConfiguration);
            });
          }
          return configs;
        }, configurations);
      }
      return configurations;
    }, [] as AudioConfiguration[]);
  }
  return [];
}

function estimatedAudioBitrate(
  audioCodec: string,
  levelBitrate: number,
): number {
  if (levelBitrate <= 1) {
    return 1;
  }
  let audioBitrate = 128000;
  if (audioCodec === 'ec-3') {
    audioBitrate = 768000;
  } else if (audioCodec === 'ac-3') {
    audioBitrate = 640000;
  }
  return Math.min(levelBitrate / 2, audioBitrate); // Don't exceed some % of level bitrate
}

function getVariantDecodingBitrate(level: Level): number {
  return (
    Math.ceil(Math.max(level.bitrate * 0.9, level.averageBitrate) / 1000) *
      1000 || 1
  );
}

function getMediaDecodingInfoKey(config: MediaDecodingConfiguration): string {
  let key = '';
  const { audio, video } = config;
  if (video) {
    const codec = getCodecsForMimeType(video.contentType);
    key += `${codec}_r${video.height}x${video.width}f${Math.ceil(video.framerate)}${
      video.transferFunction || 'sd'
    }_${Math.ceil(video.bitrate / 1e5)}`;
  }
  if (audio) {
    const codec = getCodecsForMimeType(audio.contentType);
    key += `${video ? '_' : ''}${codec}_c${audio.channels}`;
  }
  return key;
}
