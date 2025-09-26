import { CmcdObjectType } from '@svta/common-media-library/cmcd/CmcdObjectType';
import { CmcdStreamingFormat } from '@svta/common-media-library/cmcd/CmcdStreamingFormat';
import { appendCmcdHeaders } from '@svta/common-media-library/cmcd/appendCmcdHeaders';
import { appendCmcdQuery } from '@svta/common-media-library/cmcd/appendCmcdQuery';
import { Events } from '../events';
import { BufferHelper } from '../utils/buffer-helper';
import type {
  FragmentLoaderConstructor,
  HlsConfig,
  PlaylistLoaderConstructor,
} from '../config';
import type Hls from '../hls';
import type { Fragment, Part } from '../loader/fragment';
import type { ExtendedSourceBuffer } from '../types/buffer';
import type { ComponentAPI } from '../types/component-api';
import type { BufferCreatedData, MediaAttachedData } from '../types/events';
import type {
  FragmentLoaderContext,
  Loader,
  LoaderCallbacks,
  LoaderConfiguration,
  LoaderContext,
  PlaylistLoaderContext,
} from '../types/loader';
import type { Cmcd } from '@svta/common-media-library/cmcd/Cmcd';
import type { CmcdEncodeOptions } from '@svta/common-media-library/cmcd/CmcdEncodeOptions';

/**
 * Controller to deal with Common Media Client Data (CMCD)
 * @see https://cdn.cta.tech/cta/media/media/resources/standards/pdfs/cta-5004-final.pdf
 */
export default class CMCDController implements ComponentAPI {
  private hls: Hls;
  private config: HlsConfig;
  private media?: HTMLMediaElement;
  private sid?: string;
  private cid?: string;
  private useHeaders: boolean = false;
  private includeKeys?: string[];
  private initialized: boolean = false;
  private starved: boolean = false;
  private buffering: boolean = true;
  private audioBuffer?: ExtendedSourceBuffer;
  private videoBuffer?: ExtendedSourceBuffer;

  constructor(hls: Hls) {
    this.hls = hls;
    const config = (this.config = hls.config);
    const { cmcd } = config;

    if (cmcd != null) {
      config.pLoader = this.createPlaylistLoader();
      config.fLoader = this.createFragmentLoader();

      this.sid = cmcd.sessionId || hls.sessionId;
      this.cid = cmcd.contentId;
      this.useHeaders = cmcd.useHeaders === true;
      this.includeKeys = cmcd.includeKeys;
      this.registerListeners();
    }
  }

  private registerListeners() {
    const hls = this.hls;
    hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.on(Events.MEDIA_DETACHED, this.onMediaDetached, this);
    hls.on(Events.BUFFER_CREATED, this.onBufferCreated, this);
  }

  private unregisterListeners() {
    const hls = this.hls;
    hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.off(Events.MEDIA_DETACHED, this.onMediaDetached, this);
    hls.off(Events.BUFFER_CREATED, this.onBufferCreated, this);
  }

  destroy() {
    this.unregisterListeners();
    this.onMediaDetached();

    // @ts-ignore
    this.hls = this.config = this.audioBuffer = this.videoBuffer = null;
    // @ts-ignore
    this.onWaiting = this.onPlaying = this.media = null;
  }

  private onMediaAttached(
    event: Events.MEDIA_ATTACHED,
    data: MediaAttachedData,
  ) {
    this.media = data.media;
    this.media.addEventListener('waiting', this.onWaiting);
    this.media.addEventListener('playing', this.onPlaying);
  }

  private onMediaDetached() {
    if (!this.media) {
      return;
    }

    this.media.removeEventListener('waiting', this.onWaiting);
    this.media.removeEventListener('playing', this.onPlaying);

    // @ts-ignore
    this.media = null;
  }

  private onBufferCreated(
    event: Events.BUFFER_CREATED,
    data: BufferCreatedData,
  ) {
    this.audioBuffer = data.tracks.audio?.buffer;
    this.videoBuffer = data.tracks.video?.buffer;
  }

  private onWaiting = () => {
    if (this.initialized) {
      this.starved = true;
    }

    this.buffering = true;
  };

  private onPlaying = () => {
    if (!this.initialized) {
      this.initialized = true;
    }

    this.buffering = false;
  };

  /**
   * Create baseline CMCD data
   */
  private createData(): Cmcd {
    return {
      v: 1,
      sf: CmcdStreamingFormat.HLS,
      sid: this.sid,
      cid: this.cid,
      pr: this.media?.playbackRate,
      mtp: this.hls.bandwidthEstimate / 1000,
    };
  }

  /**
   * Apply CMCD data to a request.
   */
  private apply(context: LoaderContext, data: Cmcd = {}) {
    // apply baseline data
    Object.assign(data, this.createData());

    const isVideo =
      data.ot === CmcdObjectType.INIT ||
      data.ot === CmcdObjectType.VIDEO ||
      data.ot === CmcdObjectType.MUXED;

    if (this.starved && isVideo) {
      data.bs = true;
      data.su = true;
      this.starved = false;
    }

    if (data.su == null) {
      data.su = this.buffering;
    }

    // TODO: Implement rtp, nrr, dl

    const { includeKeys } = this;
    if (includeKeys) {
      data = Object.keys(data).reduce((acc, key) => {
        includeKeys.includes(key) && (acc[key] = data[key]);
        return acc;
      }, {});
    }

    const options: CmcdEncodeOptions = { baseUrl: context.url };

    if (this.useHeaders) {
      if (!context.headers) {
        context.headers = {};
      }

      appendCmcdHeaders(context.headers, data, options);
    } else {
      context.url = appendCmcdQuery(context.url, data, options);
    }
  }

  /**
   * Apply CMCD data to a manifest request.
   */
  private applyPlaylistData = (context: PlaylistLoaderContext) => {
    try {
      this.apply(context, {
        ot: CmcdObjectType.MANIFEST,
        su: !this.initialized,
      });
    } catch (error) {
      this.hls.logger.warn('Could not generate manifest CMCD data.', error);
    }
  };

  /**
   * Apply CMCD data to a segment request
   */
  private applyFragmentData = (context: FragmentLoaderContext) => {
    try {
      const { frag, part } = context;
      const level = this.hls.levels[frag.level];
      const ot = this.getObjectType(frag);
      const data: Cmcd = { d: (part || frag).duration * 1000, ot };

      if (
        ot === CmcdObjectType.VIDEO ||
        ot === CmcdObjectType.AUDIO ||
        ot == CmcdObjectType.MUXED
      ) {
        data.br = level.bitrate / 1000;
        data.tb = this.getTopBandwidth(ot) / 1000;
        data.bl = this.getBufferLength(ot);
      }

      const next = part ? this.getNextPart(part) : this.getNextFrag(frag);

      if (next?.url && next.url !== frag.url) {
        data.nor = next.url;
      }

      this.apply(context, data);
    } catch (error) {
      this.hls.logger.warn('Could not generate segment CMCD data.', error);
    }
  };

  private getNextFrag(fragment: Fragment): Fragment | undefined {
    const levelDetails = this.hls.levels[fragment.level]?.details;
    if (levelDetails) {
      const index = (fragment.sn as number) - levelDetails.startSN;
      return levelDetails.fragments[index + 1];
    }

    return undefined;
  }

  private getNextPart(part: Part): Part | undefined {
    const { index, fragment } = part;
    const partList = this.hls.levels[fragment.level]?.details?.partList;

    if (partList) {
      const { sn } = fragment;
      for (let i = partList.length - 1; i >= 0; i--) {
        const p = partList[i];
        if (p.index === index && p.fragment.sn === sn) {
          return partList[i + 1];
        }
      }
    }

    return undefined;
  }

  /**
   * The CMCD object type.
   */
  private getObjectType(fragment: Fragment): CmcdObjectType | undefined {
    const { type } = fragment;

    if (type === 'subtitle') {
      return CmcdObjectType.TIMED_TEXT;
    }

    if (fragment.sn === 'initSegment') {
      return CmcdObjectType.INIT;
    }

    if (type === 'audio') {
      return CmcdObjectType.AUDIO;
    }

    if (type === 'main') {
      if (!this.hls.audioTracks.length) {
        return CmcdObjectType.MUXED;
      }

      return CmcdObjectType.VIDEO;
    }

    return undefined;
  }

  /**
   * Get the highest bitrate.
   */
  private getTopBandwidth(type: CmcdObjectType) {
    let bitrate: number = 0;
    let levels;
    const hls = this.hls;

    if (type === CmcdObjectType.AUDIO) {
      levels = hls.audioTracks;
    } else {
      const max = hls.maxAutoLevel;
      const len = max > -1 ? max + 1 : hls.levels.length;
      levels = hls.levels.slice(0, len);
    }

    levels.forEach((level) => {
      if (level.bitrate > bitrate) {
        bitrate = level.bitrate;
      }
    });

    return bitrate > 0 ? bitrate : NaN;
  }

  /**
   * Get the buffer length for a media type in milliseconds
   */
  private getBufferLength(type: CmcdObjectType) {
    const media = this.media;
    const buffer =
      type === CmcdObjectType.AUDIO ? this.audioBuffer : this.videoBuffer;

    if (!buffer || !media) {
      return NaN;
    }

    const info = BufferHelper.bufferInfo(
      buffer,
      media.currentTime,
      this.config.maxBufferHole,
    );

    return info.len * 1000;
  }

  /**
   * Create a playlist loader
   */
  private createPlaylistLoader(): PlaylistLoaderConstructor | undefined {
    const { pLoader } = this.config;
    const apply = this.applyPlaylistData;
    const Ctor = pLoader || (this.config.loader as PlaylistLoaderConstructor);

    return class CmcdPlaylistLoader {
      private loader: Loader<PlaylistLoaderContext>;

      constructor(config: HlsConfig) {
        this.loader = new Ctor(config);
      }

      get stats() {
        return this.loader.stats;
      }

      get context() {
        return this.loader.context;
      }

      destroy() {
        this.loader.destroy();
      }

      abort() {
        this.loader.abort();
      }

      load(
        context: PlaylistLoaderContext,
        config: LoaderConfiguration,
        callbacks: LoaderCallbacks<PlaylistLoaderContext>,
      ) {
        apply(context);
        this.loader.load(context, config, callbacks);
      }
    };
  }

  /**
   * Create a playlist loader
   */
  private createFragmentLoader(): FragmentLoaderConstructor | undefined {
    const { fLoader } = this.config;
    const apply = this.applyFragmentData;
    const Ctor = fLoader || (this.config.loader as FragmentLoaderConstructor);

    return class CmcdFragmentLoader {
      private loader: Loader<FragmentLoaderContext>;

      constructor(config: HlsConfig) {
        this.loader = new Ctor(config);
      }

      get stats() {
        return this.loader.stats;
      }

      get context() {
        return this.loader.context;
      }

      destroy() {
        this.loader.destroy();
      }

      abort() {
        this.loader.abort();
      }

      load(
        context: FragmentLoaderContext,
        config: LoaderConfiguration,
        callbacks: LoaderCallbacks<FragmentLoaderContext>,
      ) {
        apply(context);
        this.loader.load(context, config, callbacks);
      }
    };
  }
}
