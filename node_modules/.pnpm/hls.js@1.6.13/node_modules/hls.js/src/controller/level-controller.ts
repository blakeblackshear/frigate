import BasePlaylistController from './base-playlist-controller';
import { ErrorDetails, ErrorTypes } from '../errors';
import { Events } from '../events';
import { isVideoRange, Level, VideoRangeValues } from '../types/level';
import { PlaylistContextType, PlaylistLevelType } from '../types/loader';
import {
  areCodecsMediaSourceSupported,
  codecsSetSelectionPreferenceValue,
  convertAVC1ToAVCOTI,
  getCodecCompatibleName,
  videoCodecPreferenceValue,
} from '../utils/codecs';
import { reassignFragmentLevelIndexes } from '../utils/level-helper';
import { getUnsupportedResult } from '../utils/mediacapabilities-helper';
import { stringify } from '../utils/safe-json-stringify';
import type ContentSteeringController from './content-steering-controller';
import type Hls from '../hls';
import type {
  ErrorData,
  FragBufferedData,
  LevelLoadedData,
  LevelsUpdatedData,
  LevelSwitchingData,
  ManifestLoadedData,
  ManifestLoadingData,
  ManifestParsedData,
} from '../types/events';
import type { HlsUrlParameters, LevelParsed } from '../types/level';
import type { MediaPlaylist } from '../types/media-playlist';

export default class LevelController extends BasePlaylistController {
  private _levels: Level[] = [];
  private _firstLevel: number = -1;
  private _maxAutoLevel: number = -1;
  private _startLevel?: number;
  private currentLevel: Level | null = null;
  private currentLevelIndex: number = -1;
  private manualLevelIndex: number = -1;
  private steering: ContentSteeringController | null;

  public onParsedComplete!: Function;

  constructor(
    hls: Hls,
    contentSteeringController: ContentSteeringController | null,
  ) {
    super(hls, 'level-controller');
    this.steering = contentSteeringController;
    this._registerListeners();
  }

  private _registerListeners() {
    const { hls } = this;
    hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.on(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
    hls.on(Events.LEVEL_LOADED, this.onLevelLoaded, this);
    hls.on(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
    hls.on(Events.FRAG_BUFFERED, this.onFragBuffered, this);
    hls.on(Events.ERROR, this.onError, this);
  }

  private _unregisterListeners() {
    const { hls } = this;
    hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.off(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
    hls.off(Events.LEVEL_LOADED, this.onLevelLoaded, this);
    hls.off(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
    hls.off(Events.FRAG_BUFFERED, this.onFragBuffered, this);
    hls.off(Events.ERROR, this.onError, this);
  }

  public destroy() {
    this._unregisterListeners();
    this.steering = null;
    this.resetLevels();
    super.destroy();
  }

  public stopLoad(): void {
    const levels = this._levels;

    // clean up live level details to force reload them, and reset load errors
    levels.forEach((level) => {
      level.loadError = 0;
      level.fragmentError = 0;
    });

    super.stopLoad();
  }

  private resetLevels() {
    this._startLevel = undefined;
    this.manualLevelIndex = -1;
    this.currentLevelIndex = -1;
    this.currentLevel = null;
    this._levels = [];
    this._maxAutoLevel = -1;
  }

  private onManifestLoading(
    event: Events.MANIFEST_LOADING,
    data: ManifestLoadingData,
  ) {
    this.resetLevels();
  }

  protected onManifestLoaded(
    event: Events.MANIFEST_LOADED,
    data: ManifestLoadedData,
  ) {
    const preferManagedMediaSource = this.hls.config.preferManagedMediaSource;
    const levels: Level[] = [];
    const redundantSet: { [key: string]: Level } = {};
    const generatePathwaySet: { [key: string]: number } = {};
    let resolutionFound = false;
    let videoCodecFound = false;
    let audioCodecFound = false;

    data.levels.forEach((levelParsed: LevelParsed) => {
      const attributes = levelParsed.attrs;
      let { audioCodec, videoCodec } = levelParsed;
      if (audioCodec) {
        // Returns empty and set to undefined for 'mp4a.40.34' with fallback to 'audio/mpeg' SourceBuffer
        levelParsed.audioCodec = audioCodec =
          getCodecCompatibleName(audioCodec, preferManagedMediaSource) ||
          undefined;
      }

      if (videoCodec) {
        videoCodec = levelParsed.videoCodec = convertAVC1ToAVCOTI(videoCodec);
      }

      // only keep levels with supported audio/video codecs
      const { width, height, unknownCodecs } = levelParsed;
      const unknownUnsupportedCodecCount = unknownCodecs?.length || 0;

      resolutionFound ||= !!(width && height);
      videoCodecFound ||= !!videoCodec;
      audioCodecFound ||= !!audioCodec;
      if (
        unknownUnsupportedCodecCount ||
        (audioCodec && !this.isAudioSupported(audioCodec)) ||
        (videoCodec && !this.isVideoSupported(videoCodec))
      ) {
        this.log(`Some or all CODECS not supported "${attributes.CODECS}"`);
        return;
      }

      const {
        CODECS,
        'FRAME-RATE': FRAMERATE,
        'HDCP-LEVEL': HDCP,
        'PATHWAY-ID': PATHWAY,
        RESOLUTION,
        'VIDEO-RANGE': VIDEO_RANGE,
      } = attributes;
      const contentSteeringPrefix = `${PATHWAY || '.'}-`;
      const levelKey = `${contentSteeringPrefix}${levelParsed.bitrate}-${RESOLUTION}-${FRAMERATE}-${CODECS}-${VIDEO_RANGE}-${HDCP}`;

      if (!redundantSet[levelKey]) {
        const level = this.createLevel(levelParsed);
        redundantSet[levelKey] = level;
        generatePathwaySet[levelKey] = 1;
        levels.push(level);
      } else if (
        redundantSet[levelKey].uri !== levelParsed.url &&
        !levelParsed.attrs['PATHWAY-ID']
      ) {
        // Assign Pathway IDs to Redundant Streams (default Pathways is ".". Redundant Streams "..", "...", and so on.)
        // Content Steering controller to handles Pathway fallback on error
        const pathwayCount = (generatePathwaySet[levelKey] += 1);
        levelParsed.attrs['PATHWAY-ID'] = new Array(pathwayCount + 1).join('.');
        const level = this.createLevel(levelParsed);
        redundantSet[levelKey] = level;
        levels.push(level);
      } else {
        redundantSet[levelKey].addGroupId('audio', attributes.AUDIO);
        redundantSet[levelKey].addGroupId('text', attributes.SUBTITLES);
      }
    });

    this.filterAndSortMediaOptions(
      levels,
      data,
      resolutionFound,
      videoCodecFound,
      audioCodecFound,
    );
  }

  private createLevel(levelParsed: LevelParsed): Level {
    const level = new Level(levelParsed);
    const supplemental = levelParsed.supplemental;
    if (
      supplemental?.videoCodec &&
      !this.isVideoSupported(supplemental.videoCodec)
    ) {
      const error = new Error(
        `SUPPLEMENTAL-CODECS not supported "${supplemental.videoCodec}"`,
      );
      this.log(error.message);
      level.supportedResult = getUnsupportedResult(error, []);
    }
    return level;
  }

  private isAudioSupported(codec: string): boolean {
    return areCodecsMediaSourceSupported(
      codec,
      'audio',
      this.hls.config.preferManagedMediaSource,
    );
  }

  private isVideoSupported(codec: string): boolean {
    return areCodecsMediaSourceSupported(
      codec,
      'video',
      this.hls.config.preferManagedMediaSource,
    );
  }

  private filterAndSortMediaOptions(
    filteredLevels: Level[],
    data: ManifestLoadedData,
    resolutionFound: boolean,
    videoCodecFound: boolean,
    audioCodecFound: boolean,
  ) {
    let audioTracks: MediaPlaylist[] = [];
    let subtitleTracks: MediaPlaylist[] = [];
    let levels = filteredLevels;
    const statsParsing = data.stats?.parsing || {};

    // remove audio-only and invalid video-range levels if we also have levels with video codecs or RESOLUTION signalled
    if ((resolutionFound || videoCodecFound) && audioCodecFound) {
      levels = levels.filter(
        ({ videoCodec, videoRange, width, height }) =>
          (!!videoCodec || !!(width && height)) && isVideoRange(videoRange),
      );
    }

    if (levels.length === 0) {
      // Dispatch error after MANIFEST_LOADED is done propagating
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      Promise.resolve().then(() => {
        if (this.hls) {
          let message = 'no level with compatible codecs found in manifest';
          let reason = message;
          if (data.levels.length) {
            reason = `one or more CODECS in variant not supported: ${stringify(
              data.levels
                .map((level) => level.attrs.CODECS)
                .filter(
                  (value, index, array) => array.indexOf(value) === index,
                ),
            )}`;
            this.warn(reason);
            message += ` (${reason})`;
          }
          const error = new Error(message);
          this.hls.trigger(Events.ERROR, {
            type: ErrorTypes.MEDIA_ERROR,
            details: ErrorDetails.MANIFEST_INCOMPATIBLE_CODECS_ERROR,
            fatal: true,
            url: data.url,
            error,
            reason,
          });
        }
      });
      statsParsing.end = performance.now();
      return;
    }

    if (data.audioTracks) {
      audioTracks = data.audioTracks.filter(
        (track) => !track.audioCodec || this.isAudioSupported(track.audioCodec),
      );
      // Assign ids after filtering as array indices by group-id
      assignTrackIdsByGroup(audioTracks);
    }

    if (data.subtitles) {
      subtitleTracks = data.subtitles;
      assignTrackIdsByGroup(subtitleTracks);
    }
    // start bitrate is the first bitrate of the manifest
    const unsortedLevels = levels.slice(0);
    // sort levels from lowest to highest
    levels.sort((a, b) => {
      if (a.attrs['HDCP-LEVEL'] !== b.attrs['HDCP-LEVEL']) {
        return (a.attrs['HDCP-LEVEL'] || '') > (b.attrs['HDCP-LEVEL'] || '')
          ? 1
          : -1;
      }
      // sort on height before bitrate for cap-level-controller
      if (resolutionFound && a.height !== b.height) {
        return a.height - b.height;
      }
      if (a.frameRate !== b.frameRate) {
        return a.frameRate - b.frameRate;
      }
      if (a.videoRange !== b.videoRange) {
        return (
          VideoRangeValues.indexOf(a.videoRange) -
          VideoRangeValues.indexOf(b.videoRange)
        );
      }
      if (a.videoCodec !== b.videoCodec) {
        const valueA = videoCodecPreferenceValue(a.videoCodec);
        const valueB = videoCodecPreferenceValue(b.videoCodec);
        if (valueA !== valueB) {
          return valueB - valueA;
        }
      }
      if (a.uri === b.uri && a.codecSet !== b.codecSet) {
        const valueA = codecsSetSelectionPreferenceValue(a.codecSet);
        const valueB = codecsSetSelectionPreferenceValue(b.codecSet);
        if (valueA !== valueB) {
          return valueB - valueA;
        }
      }
      if (a.averageBitrate !== b.averageBitrate) {
        return a.averageBitrate - b.averageBitrate;
      }
      return 0;
    });

    let firstLevelInPlaylist = unsortedLevels[0];
    if (this.steering) {
      levels = this.steering.filterParsedLevels(levels);
      if (levels.length !== unsortedLevels.length) {
        for (let i = 0; i < unsortedLevels.length; i++) {
          if (unsortedLevels[i].pathwayId === levels[0].pathwayId) {
            firstLevelInPlaylist = unsortedLevels[i];
            break;
          }
        }
      }
    }

    this._levels = levels;

    // find index of first level in sorted levels
    for (let i = 0; i < levels.length; i++) {
      if (levels[i] === firstLevelInPlaylist) {
        this._firstLevel = i;
        const firstLevelBitrate = firstLevelInPlaylist.bitrate;
        const bandwidthEstimate = this.hls.bandwidthEstimate;
        this.log(
          `manifest loaded, ${levels.length} level(s) found, first bitrate: ${firstLevelBitrate}`,
        );
        // Update default bwe to first variant bitrate as long it has not been configured or set
        if (this.hls.userConfig?.abrEwmaDefaultEstimate === undefined) {
          const startingBwEstimate = Math.min(
            firstLevelBitrate,
            this.hls.config.abrEwmaDefaultEstimateMax,
          );
          if (
            startingBwEstimate > bandwidthEstimate &&
            bandwidthEstimate === this.hls.abrEwmaDefaultEstimate
          ) {
            this.hls.bandwidthEstimate = startingBwEstimate;
          }
        }
        break;
      }
    }

    // Audio is only alternate if manifest include a URI along with the audio group tag,
    // and this is not an audio-only stream where levels contain audio-only
    const audioOnly = audioCodecFound && !videoCodecFound;
    const config = this.hls.config;
    const altAudioEnabled = !!(
      config.audioStreamController && config.audioTrackController
    );
    const edata: ManifestParsedData = {
      levels,
      audioTracks,
      subtitleTracks,
      sessionData: data.sessionData,
      sessionKeys: data.sessionKeys,
      firstLevel: this._firstLevel,
      stats: data.stats,
      audio: audioCodecFound,
      video: videoCodecFound,
      altAudio:
        altAudioEnabled && !audioOnly && audioTracks.some((t) => !!t.url),
    };
    statsParsing.end = performance.now();
    this.hls.trigger(Events.MANIFEST_PARSED, edata);
  }

  get levels(): Level[] | null {
    if (this._levels.length === 0) {
      return null;
    }
    return this._levels;
  }

  get loadLevelObj(): Level | null {
    return this.currentLevel;
  }

  get level(): number {
    return this.currentLevelIndex;
  }

  set level(newLevel: number) {
    const levels = this._levels;
    if (levels.length === 0) {
      return;
    }
    // check if level idx is valid
    if (newLevel < 0 || newLevel >= levels.length) {
      // invalid level id given, trigger error
      const error = new Error('invalid level idx');
      const fatal = newLevel < 0;
      this.hls.trigger(Events.ERROR, {
        type: ErrorTypes.OTHER_ERROR,
        details: ErrorDetails.LEVEL_SWITCH_ERROR,
        level: newLevel,
        fatal,
        error,
        reason: error.message,
      });
      if (fatal) {
        return;
      }
      newLevel = Math.min(newLevel, levels.length - 1);
    }

    const lastLevelIndex = this.currentLevelIndex;
    const lastLevel = this.currentLevel;
    const lastPathwayId = lastLevel ? lastLevel.attrs['PATHWAY-ID'] : undefined;
    const level = levels[newLevel];
    const pathwayId = level.attrs['PATHWAY-ID'];
    this.currentLevelIndex = newLevel;
    this.currentLevel = level;

    if (
      lastLevelIndex === newLevel &&
      lastLevel &&
      lastPathwayId === pathwayId
    ) {
      return;
    }

    this.log(
      `Switching to level ${newLevel} (${
        level.height ? level.height + 'p ' : ''
      }${level.videoRange ? level.videoRange + ' ' : ''}${
        level.codecSet ? level.codecSet + ' ' : ''
      }@${level.bitrate})${
        pathwayId ? ' with Pathway ' + pathwayId : ''
      } from level ${lastLevelIndex}${
        lastPathwayId ? ' with Pathway ' + lastPathwayId : ''
      }`,
    );

    const levelSwitchingData: LevelSwitchingData = {
      level: newLevel,
      attrs: level.attrs,
      details: level.details,
      bitrate: level.bitrate,
      averageBitrate: level.averageBitrate,
      maxBitrate: level.maxBitrate,
      realBitrate: level.realBitrate,
      width: level.width,
      height: level.height,
      codecSet: level.codecSet,
      audioCodec: level.audioCodec,
      videoCodec: level.videoCodec,
      audioGroups: level.audioGroups,
      subtitleGroups: level.subtitleGroups,
      loaded: level.loaded,
      loadError: level.loadError,
      fragmentError: level.fragmentError,
      name: level.name,
      id: level.id,
      uri: level.uri,
      url: level.url,
      urlId: 0,
      audioGroupIds: level.audioGroupIds,
      textGroupIds: level.textGroupIds,
    };

    this.hls.trigger(Events.LEVEL_SWITCHING, levelSwitchingData);
    // check if we need to load playlist for this level
    const levelDetails = level.details;
    if (!levelDetails || levelDetails.live) {
      // level not retrieved yet, or live playlist we need to (re)load it
      const hlsUrlParameters = this.switchParams(
        level.uri,
        lastLevel?.details,
        levelDetails,
      );
      this.loadPlaylist(hlsUrlParameters);
    }
  }

  get manualLevel(): number {
    return this.manualLevelIndex;
  }

  set manualLevel(newLevel) {
    this.manualLevelIndex = newLevel;
    if (this._startLevel === undefined) {
      this._startLevel = newLevel;
    }

    if (newLevel !== -1) {
      this.level = newLevel;
    }
  }

  get firstLevel(): number {
    return this._firstLevel;
  }

  set firstLevel(newLevel) {
    this._firstLevel = newLevel;
  }

  get startLevel(): number {
    // Setting hls.startLevel (this._startLevel) overrides config.startLevel
    if (this._startLevel === undefined) {
      const configStartLevel = this.hls.config.startLevel;
      if (configStartLevel !== undefined) {
        return configStartLevel;
      }
      return this.hls.firstAutoLevel;
    }
    return this._startLevel;
  }

  set startLevel(newLevel: number) {
    this._startLevel = newLevel;
  }

  get pathways(): string[] {
    if (this.steering) {
      return this.steering.pathways();
    }

    return [];
  }

  get pathwayPriority(): string[] | null {
    if (this.steering) {
      return this.steering.pathwayPriority;
    }

    return null;
  }

  set pathwayPriority(pathwayPriority: string[]) {
    if (this.steering) {
      const pathwaysList = this.steering.pathways();
      const filteredPathwayPriority = pathwayPriority.filter((pathwayId) => {
        return pathwaysList.indexOf(pathwayId) !== -1;
      });
      if (pathwayPriority.length < 1) {
        this.warn(
          `pathwayPriority ${pathwayPriority} should contain at least one pathway from list: ${pathwaysList}`,
        );
        return;
      }
      this.steering.pathwayPriority = filteredPathwayPriority;
    }
  }

  protected onError(event: Events.ERROR, data: ErrorData) {
    if (data.fatal || !data.context) {
      return;
    }

    if (
      data.context.type === PlaylistContextType.LEVEL &&
      data.context.level === this.level
    ) {
      this.checkRetry(data);
    }
  }

  // reset errors on the successful load of a fragment
  protected onFragBuffered(
    event: Events.FRAG_BUFFERED,
    { frag }: FragBufferedData,
  ) {
    if (frag !== undefined && frag.type === PlaylistLevelType.MAIN) {
      const el = frag.elementaryStreams;
      if (!Object.keys(el).some((type) => !!el[type])) {
        return;
      }
      const level = this._levels[frag.level];
      if (level?.loadError) {
        this.log(
          `Resetting level error count of ${level.loadError} on frag buffered`,
        );
        level.loadError = 0;
      }
    }
  }

  protected onLevelLoaded(event: Events.LEVEL_LOADED, data: LevelLoadedData) {
    const { level, details } = data;
    const curLevel = data.levelInfo;

    if (!curLevel) {
      this.warn(`Invalid level index ${level}`);
      if (data.deliveryDirectives?.skip) {
        details.deltaUpdateFailed = true;
      }
      return;
    }

    // only process level loaded events matching with expected level or prior to switch when media playlist is loaded directly
    if (curLevel === this.currentLevel || data.withoutMultiVariant) {
      // reset level load error counter on successful level loaded only if there is no issues with fragments
      if (curLevel.fragmentError === 0) {
        curLevel.loadError = 0;
      }
      // Ignore matching details populated by loading a Media Playlist directly
      let previousDetails = curLevel.details;
      if (previousDetails === data.details && previousDetails.advanced) {
        previousDetails = undefined;
      }

      this.playlistLoaded(level, data, previousDetails);
    } else if (data.deliveryDirectives?.skip) {
      // received a delta playlist update that cannot be merged
      details.deltaUpdateFailed = true;
    }
  }

  protected loadPlaylist(hlsUrlParameters?: HlsUrlParameters) {
    super.loadPlaylist();
    if (this.shouldLoadPlaylist(this.currentLevel)) {
      this.scheduleLoading(this.currentLevel, hlsUrlParameters);
    }
  }

  protected loadingPlaylist(
    currentLevel: Level,
    hlsUrlParameters: HlsUrlParameters | undefined,
  ) {
    super.loadingPlaylist(currentLevel, hlsUrlParameters);
    const url = this.getUrlWithDirectives(currentLevel.uri, hlsUrlParameters);
    const currentLevelIndex = this.currentLevelIndex;
    const pathwayId = currentLevel.attrs['PATHWAY-ID'];
    const details = currentLevel.details;
    const age = details?.age;
    this.log(
      `Loading level index ${currentLevelIndex}${
        hlsUrlParameters?.msn !== undefined
          ? ' at sn ' + hlsUrlParameters.msn + ' part ' + hlsUrlParameters.part
          : ''
      }${pathwayId ? ' Pathway ' + pathwayId : ''}${age && details.live ? ' age ' + age.toFixed(1) + (details.type ? ' ' + details.type || '' : '') : ''} ${url}`,
    );

    this.hls.trigger(Events.LEVEL_LOADING, {
      url,
      level: currentLevelIndex,
      levelInfo: currentLevel,
      pathwayId: currentLevel.attrs['PATHWAY-ID'],
      id: 0, // Deprecated Level urlId
      deliveryDirectives: hlsUrlParameters || null,
    });
  }

  get nextLoadLevel() {
    if (this.manualLevelIndex !== -1) {
      return this.manualLevelIndex;
    } else {
      return this.hls.nextAutoLevel;
    }
  }

  set nextLoadLevel(nextLevel) {
    this.level = nextLevel;
    if (this.manualLevelIndex === -1) {
      this.hls.nextAutoLevel = nextLevel;
    }
  }

  removeLevel(levelIndex: number) {
    if (this._levels.length === 1) {
      return;
    }
    const levels = this._levels.filter((level, index) => {
      if (index !== levelIndex) {
        return true;
      }
      if (this.steering) {
        this.steering.removeLevel(level);
      }
      if (level === this.currentLevel) {
        this.currentLevel = null;
        this.currentLevelIndex = -1;
        if (level.details) {
          level.details.fragments.forEach((f) => (f.level = -1));
        }
      }
      return false;
    });
    reassignFragmentLevelIndexes(levels);
    this._levels = levels;
    if (this.currentLevelIndex > -1 && this.currentLevel?.details) {
      this.currentLevelIndex = this.currentLevel.details.fragments[0].level;
    }
    if (this.manualLevelIndex > -1) {
      this.manualLevelIndex = this.currentLevelIndex;
    }
    const maxLevel = levels.length - 1;
    this._firstLevel = Math.min(this._firstLevel, maxLevel);
    if (this._startLevel) {
      this._startLevel = Math.min(this._startLevel, maxLevel);
    }
    this.hls.trigger(Events.LEVELS_UPDATED, { levels });
  }

  private onLevelsUpdated(
    event: Events.LEVELS_UPDATED,
    { levels }: LevelsUpdatedData,
  ) {
    this._levels = levels;
  }

  public checkMaxAutoUpdated() {
    const { autoLevelCapping, maxAutoLevel, maxHdcpLevel } = this.hls;
    if (this._maxAutoLevel !== maxAutoLevel) {
      this._maxAutoLevel = maxAutoLevel;
      this.hls.trigger(Events.MAX_AUTO_LEVEL_UPDATED, {
        autoLevelCapping,
        levels: this.levels,
        maxAutoLevel,
        minAutoLevel: this.hls.minAutoLevel,
        maxHdcpLevel,
      });
    }
  }
}

function assignTrackIdsByGroup(tracks: MediaPlaylist[]): void {
  const groups = {};
  tracks.forEach((track) => {
    const groupId = track.groupId || '';
    track.id = groups[groupId] = groups[groupId] || 0;
    groups[groupId]++;
  });
}
