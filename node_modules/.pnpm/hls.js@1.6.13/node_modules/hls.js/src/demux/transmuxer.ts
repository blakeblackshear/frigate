import AACDemuxer from './audio/aacdemuxer';
import { AC3Demuxer } from './audio/ac3-demuxer';
import MP3Demuxer from './audio/mp3demuxer';
import Decrypter from '../crypt/decrypter';
import MP4Demuxer from '../demux/mp4demuxer';
import TSDemuxer from '../demux/tsdemuxer';
import { ErrorDetails, ErrorTypes } from '../errors';
import { Events } from '../events';
import MP4Remuxer from '../remux/mp4-remuxer';
import PassThroughRemuxer from '../remux/passthrough-remuxer';
import { PlaylistLevelType } from '../types/loader';
import {
  getAesModeFromFullSegmentMethod,
  isFullSegmentEncryption,
} from '../utils/encryption-methods-util';
import type { HlsConfig } from '../config';
import type { HlsEventEmitter } from '../events';
import type { DecryptData } from '../loader/level-key';
import type { Demuxer, DemuxerResult, KeyData } from '../types/demuxer';
import type { Remuxer } from '../types/remuxer';
import type { ChunkMetadata, TransmuxerResult } from '../types/transmuxer';
import type { TypeSupported } from '../utils/codecs';
import type { ILogger } from '../utils/logger';
import type { TimestampOffset } from '../utils/timescale-conversion';

let now: () => number;
// performance.now() not available on WebWorker, at least on Safari Desktop
try {
  now = self.performance.now.bind(self.performance);
} catch (err) {
  now = Date.now;
}

type MuxConfig =
  | { demux: typeof MP4Demuxer; remux: typeof PassThroughRemuxer }
  | { demux: typeof TSDemuxer; remux: typeof MP4Remuxer }
  | { demux: typeof AC3Demuxer; remux: typeof MP4Remuxer }
  | { demux: typeof AACDemuxer; remux: typeof MP4Remuxer }
  | { demux: typeof MP3Demuxer; remux: typeof MP4Remuxer };

const muxConfig: MuxConfig[] = [
  { demux: MP4Demuxer, remux: PassThroughRemuxer },
  { demux: TSDemuxer, remux: MP4Remuxer },
  { demux: AACDemuxer, remux: MP4Remuxer },
  { demux: MP3Demuxer, remux: MP4Remuxer },
];

if (__USE_M2TS_ADVANCED_CODECS__) {
  muxConfig.splice(2, 0, { demux: AC3Demuxer, remux: MP4Remuxer });
}

export default class Transmuxer {
  private asyncResult: boolean = false;
  private logger: ILogger;
  private observer: HlsEventEmitter;
  private typeSupported: TypeSupported;
  private config: HlsConfig;
  private id: PlaylistLevelType;
  private demuxer?: Demuxer;
  private remuxer?: Remuxer;
  private decrypter?: Decrypter;
  private probe!: Function;
  private decryptionPromise: Promise<TransmuxerResult> | null = null;
  private transmuxConfig!: TransmuxConfig;
  private currentTransmuxState!: TransmuxState;

  constructor(
    observer: HlsEventEmitter,
    typeSupported: TypeSupported,
    config: HlsConfig,
    vendor: string,
    id: PlaylistLevelType,
    logger: ILogger,
  ) {
    this.observer = observer;
    this.typeSupported = typeSupported;
    this.config = config;
    this.id = id;
    this.logger = logger;
  }

  configure(transmuxConfig: TransmuxConfig) {
    this.transmuxConfig = transmuxConfig;
    if (this.decrypter) {
      this.decrypter.reset();
    }
  }

  push(
    data: ArrayBuffer,
    decryptdata: DecryptData | null,
    chunkMeta: ChunkMetadata,
    state?: TransmuxState,
  ): TransmuxerResult | Promise<TransmuxerResult> {
    const stats = chunkMeta.transmuxing;
    stats.executeStart = now();

    let uintData: Uint8Array<ArrayBuffer> = new Uint8Array(data);
    const { currentTransmuxState, transmuxConfig } = this;
    if (state) {
      this.currentTransmuxState = state;
    }

    const {
      contiguous,
      discontinuity,
      trackSwitch,
      accurateTimeOffset,
      timeOffset,
      initSegmentChange,
    } = state || currentTransmuxState;
    const {
      audioCodec,
      videoCodec,
      defaultInitPts,
      duration,
      initSegmentData,
    } = transmuxConfig;

    const keyData = getEncryptionType(uintData, decryptdata);
    if (keyData && isFullSegmentEncryption(keyData.method)) {
      const decrypter = this.getDecrypter();
      const aesMode = getAesModeFromFullSegmentMethod(keyData.method);

      // Software decryption is synchronous; webCrypto is not
      if (decrypter.isSync()) {
        // Software decryption is progressive. Progressive decryption may not return a result on each call. Any cached
        // data is handled in the flush() call
        let decryptedData = decrypter.softwareDecrypt(
          uintData,
          keyData.key.buffer,
          keyData.iv.buffer,
          aesMode,
        );
        // For Low-Latency HLS Parts, decrypt in place, since part parsing is expected on push progress
        const loadingParts = chunkMeta.part > -1;
        if (loadingParts) {
          const data = decrypter.flush();
          decryptedData = data ? data.buffer : data;
        }
        if (!decryptedData) {
          stats.executeEnd = now();
          return emptyResult(chunkMeta);
        }
        uintData = new Uint8Array(decryptedData);
      } else {
        this.asyncResult = true;
        this.decryptionPromise = decrypter
          .webCryptoDecrypt(
            uintData,
            keyData.key.buffer,
            keyData.iv.buffer,
            aesMode,
          )
          .then((decryptedData): TransmuxerResult => {
            // Calling push here is important; if flush() is called while this is still resolving, this ensures that
            // the decrypted data has been transmuxed
            const result = this.push(
              decryptedData,
              null,
              chunkMeta,
            ) as TransmuxerResult;
            this.decryptionPromise = null;
            return result;
          });
        return this.decryptionPromise;
      }
    }

    const resetMuxers = this.needsProbing(discontinuity, trackSwitch);
    if (resetMuxers) {
      const error = this.configureTransmuxer(uintData);
      if (error) {
        this.logger.warn(`[transmuxer] ${error.message}`);
        this.observer.emit(Events.ERROR, Events.ERROR, {
          type: ErrorTypes.MEDIA_ERROR,
          details: ErrorDetails.FRAG_PARSING_ERROR,
          fatal: false,
          error,
          reason: error.message,
        });
        stats.executeEnd = now();
        return emptyResult(chunkMeta);
      }
    }

    if (discontinuity || trackSwitch || initSegmentChange || resetMuxers) {
      this.resetInitSegment(
        initSegmentData,
        audioCodec,
        videoCodec,
        duration,
        decryptdata,
      );
    }

    if (discontinuity || initSegmentChange || resetMuxers) {
      this.resetInitialTimestamp(defaultInitPts);
    }

    if (!contiguous) {
      this.resetContiguity();
    }

    const result = this.transmux(
      uintData,
      keyData,
      timeOffset,
      accurateTimeOffset,
      chunkMeta,
    );
    this.asyncResult = isPromise(result);

    const currentState = this.currentTransmuxState;

    currentState.contiguous = true;
    currentState.discontinuity = false;
    currentState.trackSwitch = false;

    stats.executeEnd = now();
    return result;
  }

  // Due to data caching, flush calls can produce more than one TransmuxerResult (hence the Array type)
  flush(
    chunkMeta: ChunkMetadata,
  ): TransmuxerResult[] | Promise<TransmuxerResult[]> {
    const stats = chunkMeta.transmuxing;
    stats.executeStart = now();

    const { decrypter, currentTransmuxState, decryptionPromise } = this;

    if (decryptionPromise) {
      this.asyncResult = true;
      // Upon resolution, the decryption promise calls push() and returns its TransmuxerResult up the stack. Therefore
      // only flushing is required for async decryption
      return decryptionPromise.then(() => {
        return this.flush(chunkMeta);
      });
    }

    const transmuxResults: TransmuxerResult[] = [];
    const { timeOffset } = currentTransmuxState;
    if (decrypter) {
      // The decrypter may have data cached, which needs to be demuxed. In this case we'll have two TransmuxResults
      // This happens in the case that we receive only 1 push call for a segment (either for non-progressive downloads,
      // or for progressive downloads with small segments)
      const decryptedData = decrypter.flush();
      if (decryptedData) {
        // Push always returns a TransmuxerResult if decryptdata is null
        transmuxResults.push(
          this.push(decryptedData.buffer, null, chunkMeta) as TransmuxerResult,
        );
      }
    }

    const { demuxer, remuxer } = this;
    if (!demuxer || !remuxer) {
      // If probing failed, then Hls.js has been given content its not able to handle
      stats.executeEnd = now();
      const emptyResults = [emptyResult(chunkMeta)];
      if (this.asyncResult) {
        return Promise.resolve(emptyResults);
      }
      return emptyResults;
    }

    const demuxResultOrPromise = demuxer.flush(timeOffset);
    if (isPromise(demuxResultOrPromise)) {
      this.asyncResult = true;
      // Decrypt final SAMPLE-AES samples
      return demuxResultOrPromise.then((demuxResult) => {
        this.flushRemux(transmuxResults, demuxResult, chunkMeta);
        return transmuxResults;
      });
    }

    this.flushRemux(transmuxResults, demuxResultOrPromise, chunkMeta);
    if (this.asyncResult) {
      return Promise.resolve(transmuxResults);
    }
    return transmuxResults;
  }

  private flushRemux(
    transmuxResults: TransmuxerResult[],
    demuxResult: DemuxerResult,
    chunkMeta: ChunkMetadata,
  ) {
    const { audioTrack, videoTrack, id3Track, textTrack } = demuxResult;
    const { accurateTimeOffset, timeOffset } = this.currentTransmuxState;
    this.logger.log(
      `[transmuxer.ts]: Flushed ${this.id} sn: ${chunkMeta.sn}${
        chunkMeta.part > -1 ? ' part: ' + chunkMeta.part : ''
      } of ${this.id === PlaylistLevelType.MAIN ? 'level' : 'track'} ${chunkMeta.level}`,
    );
    const remuxResult = this.remuxer!.remux(
      audioTrack,
      videoTrack,
      id3Track,
      textTrack,
      timeOffset,
      accurateTimeOffset,
      true,
      this.id,
    );
    transmuxResults.push({
      remuxResult,
      chunkMeta,
    });

    chunkMeta.transmuxing.executeEnd = now();
  }

  resetInitialTimestamp(defaultInitPts: TimestampOffset | null) {
    const { demuxer, remuxer } = this;
    if (!demuxer || !remuxer) {
      return;
    }
    demuxer.resetTimeStamp(defaultInitPts);
    remuxer.resetTimeStamp(defaultInitPts);
  }

  resetContiguity() {
    const { demuxer, remuxer } = this;
    if (!demuxer || !remuxer) {
      return;
    }
    demuxer.resetContiguity();
    remuxer.resetNextTimestamp();
  }

  resetInitSegment(
    initSegmentData: Uint8Array | undefined,
    audioCodec: string | undefined,
    videoCodec: string | undefined,
    trackDuration: number,
    decryptdata: DecryptData | null,
  ) {
    const { demuxer, remuxer } = this;
    if (!demuxer || !remuxer) {
      return;
    }
    demuxer.resetInitSegment(
      initSegmentData,
      audioCodec,
      videoCodec,
      trackDuration,
    );
    remuxer.resetInitSegment(
      initSegmentData,
      audioCodec,
      videoCodec,
      decryptdata,
    );
  }

  destroy(): void {
    if (this.demuxer) {
      this.demuxer.destroy();
      this.demuxer = undefined;
    }
    if (this.remuxer) {
      this.remuxer.destroy();
      this.remuxer = undefined;
    }
  }

  private transmux(
    data: Uint8Array,
    keyData: KeyData | null,
    timeOffset: number,
    accurateTimeOffset: boolean,
    chunkMeta: ChunkMetadata,
  ): TransmuxerResult | Promise<TransmuxerResult> {
    let result: TransmuxerResult | Promise<TransmuxerResult>;
    if (keyData && keyData.method === 'SAMPLE-AES') {
      result = this.transmuxSampleAes(
        data,
        keyData,
        timeOffset,
        accurateTimeOffset,
        chunkMeta,
      );
    } else {
      result = this.transmuxUnencrypted(
        data,
        timeOffset,
        accurateTimeOffset,
        chunkMeta,
      );
    }
    return result;
  }

  private transmuxUnencrypted(
    data: Uint8Array,
    timeOffset: number,
    accurateTimeOffset: boolean,
    chunkMeta: ChunkMetadata,
  ): TransmuxerResult {
    const { audioTrack, videoTrack, id3Track, textTrack } = (
      this.demuxer as Demuxer
    ).demux(data, timeOffset, false, !this.config.progressive);
    const remuxResult = this.remuxer!.remux(
      audioTrack,
      videoTrack,
      id3Track,
      textTrack,
      timeOffset,
      accurateTimeOffset,
      false,
      this.id,
    );
    return {
      remuxResult,
      chunkMeta,
    };
  }

  private transmuxSampleAes(
    data: Uint8Array,
    decryptData: KeyData,
    timeOffset: number,
    accurateTimeOffset: boolean,
    chunkMeta: ChunkMetadata,
  ): Promise<TransmuxerResult> {
    return (this.demuxer as Demuxer)
      .demuxSampleAes(data, decryptData, timeOffset)
      .then((demuxResult) => {
        const remuxResult = this.remuxer!.remux(
          demuxResult.audioTrack,
          demuxResult.videoTrack,
          demuxResult.id3Track,
          demuxResult.textTrack,
          timeOffset,
          accurateTimeOffset,
          false,
          this.id,
        );
        return {
          remuxResult,
          chunkMeta,
        };
      });
  }

  private configureTransmuxer(data: Uint8Array): void | Error {
    const { config, observer, typeSupported } = this;
    // probe for content type
    let mux;
    for (let i = 0, len = muxConfig.length; i < len; i++) {
      if (muxConfig[i].demux?.probe(data, this.logger)) {
        mux = muxConfig[i];
        break;
      }
    }
    if (!mux) {
      return new Error('Failed to find demuxer by probing fragment data');
    }
    // so let's check that current remuxer and demuxer are still valid
    const demuxer = this.demuxer;
    const remuxer = this.remuxer;
    const Remuxer: MuxConfig['remux'] = mux.remux;
    const Demuxer: MuxConfig['demux'] = mux.demux;
    if (!remuxer || !(remuxer instanceof Remuxer)) {
      this.remuxer = new Remuxer(observer, config, typeSupported, this.logger);
    }
    if (!demuxer || !(demuxer instanceof Demuxer)) {
      this.demuxer = new Demuxer(observer, config, typeSupported, this.logger);
      this.probe = Demuxer.probe;
    }
  }

  private needsProbing(discontinuity: boolean, trackSwitch: boolean): boolean {
    // in case of continuity change, or track switch
    // we might switch from content type (AAC container to TS container, or TS to fmp4 for example)
    return !this.demuxer || !this.remuxer || discontinuity || trackSwitch;
  }

  private getDecrypter(): Decrypter {
    let decrypter = this.decrypter;
    if (!decrypter) {
      decrypter = this.decrypter = new Decrypter(this.config);
    }
    return decrypter;
  }
}

function getEncryptionType(
  data: Uint8Array,
  decryptData: DecryptData | null,
): KeyData | null {
  let encryptionType: KeyData | null = null;
  if (
    data.byteLength > 0 &&
    decryptData?.key != null &&
    decryptData.iv !== null &&
    decryptData.method != null
  ) {
    encryptionType = decryptData as KeyData;
  }
  return encryptionType;
}

const emptyResult = (chunkMeta): TransmuxerResult => ({
  remuxResult: {},
  chunkMeta,
});

export function isPromise<T>(p: Promise<T> | any): p is Promise<T> {
  return 'then' in p && p.then instanceof Function;
}

export class TransmuxConfig {
  public audioCodec?: string;
  public videoCodec?: string;
  public initSegmentData?: Uint8Array;
  public duration: number;
  public defaultInitPts: TimestampOffset | null;

  constructor(
    audioCodec: string | undefined,
    videoCodec: string | undefined,
    initSegmentData: Uint8Array | undefined,
    duration: number,
    defaultInitPts?: TimestampOffset,
  ) {
    this.audioCodec = audioCodec;
    this.videoCodec = videoCodec;
    this.initSegmentData = initSegmentData;
    this.duration = duration;
    this.defaultInitPts = defaultInitPts || null;
  }
}

export class TransmuxState {
  public discontinuity: boolean;
  public contiguous: boolean;
  public accurateTimeOffset: boolean;
  public trackSwitch: boolean;
  public timeOffset: number;
  public initSegmentChange: boolean;

  constructor(
    discontinuity: boolean,
    contiguous: boolean,
    accurateTimeOffset: boolean,
    trackSwitch: boolean,
    timeOffset: number,
    initSegmentChange: boolean,
  ) {
    this.discontinuity = discontinuity;
    this.contiguous = contiguous;
    this.accurateTimeOffset = accurateTimeOffset;
    this.trackSwitch = trackSwitch;
    this.timeOffset = timeOffset;
    this.initSegmentChange = initSegmentChange;
  }
}
