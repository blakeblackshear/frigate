import BasePlaylistController from './base-playlist-controller';
import { Events } from '../events';
import { PlaylistContextType } from '../types/loader';
import {
  mediaAttributesIdentical,
  subtitleTrackMatchesTextTrack,
} from '../utils/media-option-attributes';
import { findMatchingOption, matchesOption } from '../utils/rendition-helper';
import {
  clearCurrentCues,
  filterSubtitleTracks,
} from '../utils/texttrack-utils';
import type Hls from '../hls';
import type {
  ErrorData,
  LevelLoadingData,
  LevelSwitchingData,
  ManifestParsedData,
  MediaAttachedData,
  MediaDetachingData,
  SubtitleTracksUpdatedData,
  TrackLoadedData,
} from '../types/events';
import type { HlsUrlParameters } from '../types/level';
import type {
  MediaPlaylist,
  SubtitleSelectionOption,
} from '../types/media-playlist';

class SubtitleTrackController extends BasePlaylistController {
  private media: HTMLMediaElement | null = null;
  private tracks: MediaPlaylist[] = [];
  private groupIds: (string | undefined)[] | null = null;
  private tracksInGroup: MediaPlaylist[] = [];
  private trackId: number = -1;
  private currentTrack: MediaPlaylist | null = null;
  private selectDefaultTrack: boolean = true;
  private queuedDefaultTrack: number = -1;
  private useTextTrackPolling: boolean = false;
  private subtitlePollingInterval: number = -1;
  private _subtitleDisplay: boolean = true;

  private asyncPollTrackChange = () => this.pollTrackChange(0);

  constructor(hls: Hls) {
    super(hls, 'subtitle-track-controller');
    this.registerListeners();
  }

  public destroy() {
    this.unregisterListeners();
    this.tracks.length = 0;
    this.tracksInGroup.length = 0;
    this.currentTrack = null;
    // @ts-ignore
    this.onTextTracksChanged = this.asyncPollTrackChange = null;
    super.destroy();
  }

  public get subtitleDisplay(): boolean {
    return this._subtitleDisplay;
  }

  public set subtitleDisplay(value: boolean) {
    this._subtitleDisplay = value;
    if (this.trackId > -1) {
      this.toggleTrackModes();
    }
  }

  private registerListeners() {
    const { hls } = this;
    hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.on(Events.MANIFEST_PARSED, this.onManifestParsed, this);
    hls.on(Events.LEVEL_LOADING, this.onLevelLoading, this);
    hls.on(Events.LEVEL_SWITCHING, this.onLevelSwitching, this);
    hls.on(Events.SUBTITLE_TRACK_LOADED, this.onSubtitleTrackLoaded, this);
    hls.on(Events.ERROR, this.onError, this);
  }

  private unregisterListeners() {
    const { hls } = this;
    hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.off(Events.MANIFEST_PARSED, this.onManifestParsed, this);
    hls.off(Events.LEVEL_LOADING, this.onLevelLoading, this);
    hls.off(Events.LEVEL_SWITCHING, this.onLevelSwitching, this);
    hls.off(Events.SUBTITLE_TRACK_LOADED, this.onSubtitleTrackLoaded, this);
    hls.off(Events.ERROR, this.onError, this);
  }

  // Listen for subtitle track change, then extract the current track ID.
  protected onMediaAttached(
    event: Events.MEDIA_ATTACHED,
    data: MediaAttachedData,
  ): void {
    this.media = data.media;
    if (!this.media) {
      return;
    }

    if (this.queuedDefaultTrack > -1) {
      this.subtitleTrack = this.queuedDefaultTrack;
      this.queuedDefaultTrack = -1;
    }

    this.useTextTrackPolling = !(
      this.media.textTracks && 'onchange' in this.media.textTracks
    );
    if (this.useTextTrackPolling) {
      this.pollTrackChange(500);
    } else {
      this.media.textTracks.addEventListener(
        'change',
        this.asyncPollTrackChange,
      );
    }
  }

  private pollTrackChange(timeout: number) {
    self.clearInterval(this.subtitlePollingInterval);
    this.subtitlePollingInterval = self.setInterval(
      this.onTextTracksChanged,
      timeout,
    );
  }

  protected onMediaDetaching(
    event: Events.MEDIA_DETACHING,
    data: MediaDetachingData,
  ) {
    const media = this.media;
    if (!media) {
      return;
    }

    const transferringMedia = !!data.transferMedia;
    self.clearInterval(this.subtitlePollingInterval);
    if (!this.useTextTrackPolling) {
      media.textTracks.removeEventListener('change', this.asyncPollTrackChange);
    }

    if (this.trackId > -1) {
      this.queuedDefaultTrack = this.trackId;
    }

    // Disable all subtitle tracks before detachment so when reattached only tracks in that content are enabled.
    this.subtitleTrack = -1;
    this.media = null;
    if (transferringMedia) {
      return;
    }

    const textTracks = filterSubtitleTracks(media.textTracks);
    // Clear loaded cues on media detachment from tracks
    textTracks.forEach((track) => {
      clearCurrentCues(track);
    });
  }

  protected onManifestLoading(): void {
    this.tracks = [];
    this.groupIds = null;
    this.tracksInGroup = [];
    this.trackId = -1;
    this.currentTrack = null;
    this.selectDefaultTrack = true;
  }

  // Fired whenever a new manifest is loaded.
  protected onManifestParsed(
    event: Events.MANIFEST_PARSED,
    data: ManifestParsedData,
  ): void {
    this.tracks = data.subtitleTracks;
  }

  protected onSubtitleTrackLoaded(
    event: Events.SUBTITLE_TRACK_LOADED,
    data: TrackLoadedData,
  ): void {
    const { id, groupId, details } = data;
    const trackInActiveGroup = this.tracksInGroup[id];

    if (!trackInActiveGroup || trackInActiveGroup.groupId !== groupId) {
      this.warn(
        `Subtitle track with id:${id} and group:${groupId} not found in active group ${trackInActiveGroup?.groupId}`,
      );
      return;
    }

    const curDetails = trackInActiveGroup.details;
    trackInActiveGroup.details = data.details;
    this.log(
      `Subtitle track ${id} "${trackInActiveGroup.name}" lang:${trackInActiveGroup.lang} group:${groupId} loaded [${details.startSN}-${details.endSN}]`,
    );

    if (id === this.trackId) {
      this.playlistLoaded(id, data, curDetails);
    }
  }

  protected onLevelLoading(
    event: Events.LEVEL_LOADING,
    data: LevelLoadingData,
  ): void {
    this.switchLevel(data.level);
  }

  protected onLevelSwitching(
    event: Events.LEVEL_SWITCHING,
    data: LevelSwitchingData,
  ): void {
    this.switchLevel(data.level);
  }

  private switchLevel(levelIndex: number) {
    const levelInfo = this.hls.levels[levelIndex];
    if (!levelInfo) {
      return;
    }
    const subtitleGroups = levelInfo.subtitleGroups || null;
    const currentGroups = this.groupIds;
    let currentTrack = this.currentTrack;
    if (
      !subtitleGroups ||
      currentGroups?.length !== subtitleGroups?.length ||
      subtitleGroups?.some((groupId) => currentGroups?.indexOf(groupId) === -1)
    ) {
      this.groupIds = subtitleGroups;
      this.trackId = -1;
      this.currentTrack = null;

      const subtitleTracks = this.tracks.filter(
        (track): boolean =>
          !subtitleGroups || subtitleGroups.indexOf(track.groupId) !== -1,
      );
      if (subtitleTracks.length) {
        // Disable selectDefaultTrack if there are no default tracks
        if (
          this.selectDefaultTrack &&
          !subtitleTracks.some((track) => track.default)
        ) {
          this.selectDefaultTrack = false;
        }
        // track.id should match hls.audioTracks index
        subtitleTracks.forEach((track, i) => {
          track.id = i;
        });
      } else if (!currentTrack && !this.tracksInGroup.length) {
        // Do not dispatch SUBTITLE_TRACKS_UPDATED when there were and are no tracks
        return;
      }
      this.tracksInGroup = subtitleTracks;

      // Find preferred track
      const subtitlePreference = this.hls.config.subtitlePreference;
      if (!currentTrack && subtitlePreference) {
        this.selectDefaultTrack = false;
        const groupIndex = findMatchingOption(
          subtitlePreference,
          subtitleTracks,
        );
        if (groupIndex > -1) {
          currentTrack = subtitleTracks[groupIndex];
        } else {
          const allIndex = findMatchingOption(subtitlePreference, this.tracks);
          currentTrack = this.tracks[allIndex];
        }
      }

      // Select initial track
      let trackId = this.findTrackId(currentTrack);
      if (trackId === -1 && currentTrack) {
        trackId = this.findTrackId(null);
      }

      // Dispatch events and load track if needed
      const subtitleTracksUpdated: SubtitleTracksUpdatedData = {
        subtitleTracks,
      };
      this.log(
        `Updating subtitle tracks, ${
          subtitleTracks.length
        } track(s) found in "${subtitleGroups?.join(',')}" group-id`,
      );
      this.hls.trigger(Events.SUBTITLE_TRACKS_UPDATED, subtitleTracksUpdated);

      if (trackId !== -1 && this.trackId === -1) {
        this.setSubtitleTrack(trackId);
      }
    }
  }

  private findTrackId(currentTrack: MediaPlaylist | null): number {
    const tracks = this.tracksInGroup;
    const selectDefault = this.selectDefaultTrack;
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (
        (selectDefault && !track.default) ||
        (!selectDefault && !currentTrack)
      ) {
        continue;
      }
      if (!currentTrack || matchesOption(track, currentTrack)) {
        return i;
      }
    }
    if (currentTrack) {
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        if (
          mediaAttributesIdentical(currentTrack.attrs, track.attrs, [
            'LANGUAGE',
            'ASSOC-LANGUAGE',
            'CHARACTERISTICS',
          ])
        ) {
          return i;
        }
      }
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        if (
          mediaAttributesIdentical(currentTrack.attrs, track.attrs, [
            'LANGUAGE',
          ])
        ) {
          return i;
        }
      }
    }
    return -1;
  }

  private findTrackForTextTrack(textTrack: TextTrack | null): number {
    if (textTrack) {
      const tracks = this.tracksInGroup;
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        if (subtitleTrackMatchesTextTrack(track, textTrack)) {
          return i;
        }
      }
    }
    return -1;
  }

  protected onError(event: Events.ERROR, data: ErrorData): void {
    if (data.fatal || !data.context) {
      return;
    }

    if (
      data.context.type === PlaylistContextType.SUBTITLE_TRACK &&
      data.context.id === this.trackId &&
      (!this.groupIds || this.groupIds.indexOf(data.context.groupId) !== -1)
    ) {
      this.checkRetry(data);
    }
  }

  get allSubtitleTracks(): MediaPlaylist[] {
    return this.tracks;
  }

  /** get alternate subtitle tracks list from playlist **/
  get subtitleTracks(): MediaPlaylist[] {
    return this.tracksInGroup;
  }

  /** get/set index of the selected subtitle track (based on index in subtitle track lists) **/
  get subtitleTrack(): number {
    return this.trackId;
  }

  set subtitleTrack(newId: number) {
    this.selectDefaultTrack = false;
    this.setSubtitleTrack(newId);
  }

  public setSubtitleOption(
    subtitleOption: MediaPlaylist | SubtitleSelectionOption | undefined,
  ): MediaPlaylist | null {
    this.hls.config.subtitlePreference = subtitleOption;
    if (subtitleOption) {
      if (subtitleOption.id === -1) {
        this.setSubtitleTrack(-1);
        return null;
      }
      const allSubtitleTracks = this.allSubtitleTracks;
      this.selectDefaultTrack = false;
      if (allSubtitleTracks.length) {
        // First see if current option matches (no switch op)
        const currentTrack = this.currentTrack;
        if (currentTrack && matchesOption(subtitleOption, currentTrack)) {
          return currentTrack;
        }
        // Find option in current group
        const groupIndex = findMatchingOption(
          subtitleOption,
          this.tracksInGroup,
        );
        if (groupIndex > -1) {
          const track = this.tracksInGroup[groupIndex];
          this.setSubtitleTrack(groupIndex);
          return track;
        } else if (currentTrack) {
          // If this is not the initial selection return null
          // option should have matched one in active group
          return null;
        } else {
          // Find the option in all tracks for initial selection
          const allIndex = findMatchingOption(
            subtitleOption,
            allSubtitleTracks,
          );
          if (allIndex > -1) {
            return allSubtitleTracks[allIndex];
          }
        }
      }
    }
    return null;
  }

  protected loadPlaylist(hlsUrlParameters?: HlsUrlParameters): void {
    super.loadPlaylist();
    if (this.shouldLoadPlaylist(this.currentTrack)) {
      this.scheduleLoading(this.currentTrack, hlsUrlParameters);
    }
  }

  protected loadingPlaylist(
    currentTrack: MediaPlaylist,
    hlsUrlParameters: HlsUrlParameters | undefined,
  ) {
    super.loadingPlaylist(currentTrack, hlsUrlParameters);
    const id = currentTrack.id;
    const groupId = currentTrack.groupId as string;
    const url = this.getUrlWithDirectives(currentTrack.url, hlsUrlParameters);
    const details = currentTrack.details;
    const age = details?.age;
    this.log(
      `Loading subtitle ${id} "${currentTrack.name}" lang:${currentTrack.lang} group:${groupId}${
        hlsUrlParameters?.msn !== undefined
          ? ' at sn ' + hlsUrlParameters.msn + ' part ' + hlsUrlParameters.part
          : ''
      }${age && details.live ? ' age ' + age.toFixed(1) + (details.type ? ' ' + details.type || '' : '') : ''} ${url}`,
    );
    this.hls.trigger(Events.SUBTITLE_TRACK_LOADING, {
      url,
      id,
      groupId,
      deliveryDirectives: hlsUrlParameters || null,
      track: currentTrack,
    });
  }

  /**
   * Disables the old subtitleTrack and sets current mode on the next subtitleTrack.
   * This operates on the DOM textTracks.
   * A value of -1 will disable all subtitle tracks.
   */
  private toggleTrackModes(): void {
    const { media } = this;
    if (!media) {
      return;
    }

    const textTracks = filterSubtitleTracks(media.textTracks);
    const currentTrack = this.currentTrack;
    let nextTrack;
    if (currentTrack) {
      nextTrack = textTracks.filter((textTrack) =>
        subtitleTrackMatchesTextTrack(currentTrack, textTrack),
      )[0];
      if (!nextTrack) {
        this.warn(
          `Unable to find subtitle TextTrack with name "${currentTrack.name}" and language "${currentTrack.lang}"`,
        );
      }
    }
    [].slice.call(textTracks).forEach((track) => {
      if (track.mode !== 'disabled' && track !== nextTrack) {
        track.mode = 'disabled';
      }
    });
    if (nextTrack) {
      const mode = this.subtitleDisplay ? 'showing' : 'hidden';
      if (nextTrack.mode !== mode) {
        nextTrack.mode = mode;
      }
    }
  }

  /**
   * This method is responsible for validating the subtitle index and periodically reloading if live.
   * Dispatches the SUBTITLE_TRACK_SWITCH event, which instructs the subtitle-stream-controller to load the selected track.
   */
  private setSubtitleTrack(newId: number): void {
    const tracks = this.tracksInGroup;

    // setting this.subtitleTrack will trigger internal logic
    // if media has not been attached yet, it will fail
    // we keep a reference to the default track id
    // and we'll set subtitleTrack when onMediaAttached is triggered
    if (!this.media) {
      this.queuedDefaultTrack = newId;
      return;
    }

    // exit if track id as already set or invalid
    if (newId < -1 || newId >= tracks.length || !Number.isFinite(newId)) {
      this.warn(`Invalid subtitle track id: ${newId}`);
      return;
    }

    this.selectDefaultTrack = false;
    const lastTrack = this.currentTrack;
    const track: MediaPlaylist | null = tracks[newId] || null;
    this.trackId = newId;
    this.currentTrack = track;
    this.toggleTrackModes();
    if (!track) {
      // switch to -1
      this.hls.trigger(Events.SUBTITLE_TRACK_SWITCH, { id: newId });
      return;
    }
    const trackLoaded = !!track.details && !track.details.live;
    if (newId === this.trackId && track === lastTrack && trackLoaded) {
      return;
    }
    this.log(
      `Switching to subtitle-track ${newId}` +
        (track
          ? ` "${track.name}" lang:${track.lang} group:${track.groupId}`
          : ''),
    );
    const { id, groupId = '', name, type, url } = track;
    this.hls.trigger(Events.SUBTITLE_TRACK_SWITCH, {
      id,
      groupId,
      name,
      type,
      url,
    });
    const hlsUrlParameters = this.switchParams(
      track.url,
      lastTrack?.details,
      track.details,
    );
    this.loadPlaylist(hlsUrlParameters);
  }

  private onTextTracksChanged = () => {
    if (!this.useTextTrackPolling) {
      self.clearInterval(this.subtitlePollingInterval);
    }
    // Media is undefined when switching streams via loadSource()
    if (!this.media || !this.hls.config.renderTextTracksNatively) {
      return;
    }

    let textTrack: TextTrack | null = null;
    const tracks = filterSubtitleTracks(this.media.textTracks);
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i].mode === 'hidden') {
        // Do not break in case there is a following track with showing.
        textTrack = tracks[i];
      } else if (tracks[i].mode === 'showing') {
        textTrack = tracks[i];
        break;
      }
    }

    // Find internal track index for TextTrack
    const trackId = this.findTrackForTextTrack(textTrack);
    if (this.subtitleTrack !== trackId) {
      this.setSubtitleTrack(trackId);
    }
  };
}

export default SubtitleTrackController;
