import { EventEmitter } from 'eventemitter3';
import {
  hasUMDWorker,
  injectWorker,
  loadWorker,
  removeWorkerFromStore as removeWorkerClient,
} from './inject-worker';
import Transmuxer, {
  isPromise,
  TransmuxConfig,
  TransmuxState,
} from '../demux/transmuxer';
import { ErrorDetails, ErrorTypes } from '../errors';
import { Events } from '../events';
import { PlaylistLevelType } from '../types/loader';
import { getM2TSSupportedAudioTypes } from '../utils/codecs';
import { stringify } from '../utils/safe-json-stringify';
import type { WorkerContext } from './inject-worker';
import type { HlsEventEmitter, HlsListeners } from '../events';
import type Hls from '../hls';
import type { MediaFragment, Part } from '../loader/fragment';
import type { ErrorData, FragDecryptedData } from '../types/events';
import type { ChunkMetadata, TransmuxerResult } from '../types/transmuxer';
import type { TimestampOffset } from '../utils/timescale-conversion';

let transmuxerInstanceCount: number = 0;

export default class TransmuxerInterface {
  public error: Error | null = null;
  private hls: Hls;
  private id: PlaylistLevelType;
  private instanceNo: number = transmuxerInstanceCount++;
  private observer: HlsEventEmitter;
  private frag: MediaFragment | null = null;
  private part: Part | null = null;
  private useWorker: boolean;
  private workerContext: WorkerContext | null = null;
  private transmuxer: Transmuxer | null = null;
  private onTransmuxComplete: (transmuxResult: TransmuxerResult) => void;
  private onFlush: (chunkMeta: ChunkMetadata) => void;

  constructor(
    hls: Hls,
    id: PlaylistLevelType,
    onTransmuxComplete: (transmuxResult: TransmuxerResult) => void,
    onFlush: (chunkMeta: ChunkMetadata) => void,
  ) {
    const config = hls.config;
    this.hls = hls;
    this.id = id;
    this.useWorker = !!config.enableWorker;
    this.onTransmuxComplete = onTransmuxComplete;
    this.onFlush = onFlush;

    const forwardMessage = (
      ev: Events.ERROR | Events.FRAG_DECRYPTED,
      data: ErrorData | FragDecryptedData,
    ) => {
      data = data || {};
      data.frag = this.frag || undefined;
      if (ev === Events.ERROR) {
        data = data as ErrorData;
        data.parent = this.id;
        data.part = this.part;
        this.error = data.error;
      }
      this.hls.trigger(ev, data);
    };

    // forward events to main thread
    this.observer = new EventEmitter() as HlsEventEmitter;
    this.observer.on(Events.FRAG_DECRYPTED, forwardMessage);
    this.observer.on(Events.ERROR, forwardMessage);

    const m2tsTypeSupported = getM2TSSupportedAudioTypes(
      config.preferManagedMediaSource,
    );

    if (this.useWorker && typeof Worker !== 'undefined') {
      const logger = this.hls.logger;
      const canCreateWorker = config.workerPath || hasUMDWorker();
      if (canCreateWorker) {
        try {
          if (config.workerPath) {
            logger.log(`loading Web Worker ${config.workerPath} for "${id}"`);
            this.workerContext = loadWorker(config.workerPath);
          } else {
            logger.log(`injecting Web Worker for "${id}"`);
            this.workerContext = injectWorker();
          }
          const { worker } = this.workerContext;
          worker.addEventListener('message', this.onWorkerMessage);
          worker.addEventListener('error', this.onWorkerError);
          worker.postMessage({
            instanceNo: this.instanceNo,
            cmd: 'init',
            typeSupported: m2tsTypeSupported,
            id,
            config: stringify(config),
          });
        } catch (err) {
          logger.warn(
            `Error setting up "${id}" Web Worker, fallback to inline`,
            err,
          );
          this.terminateWorker();
          this.error = null;
          this.transmuxer = new Transmuxer(
            this.observer,
            m2tsTypeSupported,
            config,
            '',
            id,
            hls.logger,
          );
        }
        return;
      }
    }

    this.transmuxer = new Transmuxer(
      this.observer,
      m2tsTypeSupported,
      config,
      '',
      id,
      hls.logger,
    );
  }

  reset() {
    this.frag = null;
    this.part = null;
    if (this.workerContext) {
      const instanceNo = this.instanceNo;
      this.instanceNo = transmuxerInstanceCount++;
      const config = this.hls.config;
      const m2tsTypeSupported = getM2TSSupportedAudioTypes(
        config.preferManagedMediaSource,
      );
      this.workerContext.worker.postMessage({
        instanceNo: this.instanceNo,
        cmd: 'reset',
        resetNo: instanceNo,
        typeSupported: m2tsTypeSupported,
        id: this.id,
        config: stringify(config),
      });
    }
  }

  private terminateWorker() {
    if (this.workerContext) {
      const { worker } = this.workerContext;
      this.workerContext = null;
      worker.removeEventListener('message', this.onWorkerMessage);
      worker.removeEventListener('error', this.onWorkerError);
      removeWorkerClient(this.hls.config.workerPath);
    }
  }

  destroy() {
    if (this.workerContext) {
      this.terminateWorker();
      // @ts-ignore
      this.onWorkerMessage = this.onWorkerError = null;
    } else {
      const transmuxer = this.transmuxer;
      if (transmuxer) {
        transmuxer.destroy();
        this.transmuxer = null;
      }
    }
    const observer = this.observer;
    if (observer) {
      observer.removeAllListeners();
    }
    this.frag = null;
    this.part = null;
    // @ts-ignore
    this.observer = null;
    // @ts-ignore
    this.hls = null;
  }

  push(
    data: ArrayBuffer,
    initSegmentData: Uint8Array | undefined,
    audioCodec: string | undefined,
    videoCodec: string | undefined,
    frag: MediaFragment,
    part: Part | null,
    duration: number,
    accurateTimeOffset: boolean,
    chunkMeta: ChunkMetadata,
    defaultInitPTS?: TimestampOffset,
  ) {
    chunkMeta.transmuxing.start = self.performance.now();
    const { instanceNo, transmuxer } = this;
    const timeOffset = part ? part.start : frag.start;
    // TODO: push "clear-lead" decrypt data for unencrypted fragments in streams with encrypted ones
    const decryptdata = frag.decryptdata;
    const lastFrag = this.frag;

    const discontinuity = !(lastFrag && frag.cc === lastFrag.cc);
    const trackSwitch = !(lastFrag && chunkMeta.level === lastFrag.level);
    const snDiff = lastFrag ? chunkMeta.sn - lastFrag.sn : -1;
    const partDiff = this.part ? chunkMeta.part - this.part.index : -1;
    const progressive =
      snDiff === 0 &&
      chunkMeta.id > 1 &&
      chunkMeta.id === lastFrag?.stats.chunkCount;
    const contiguous =
      !trackSwitch &&
      (snDiff === 1 ||
        (snDiff === 0 && (partDiff === 1 || (progressive && partDiff <= 0))));
    const now = self.performance.now();

    if (trackSwitch || snDiff || frag.stats.parsing.start === 0) {
      frag.stats.parsing.start = now;
    }
    if (part && (partDiff || !contiguous)) {
      part.stats.parsing.start = now;
    }
    const initSegmentChange = !(
      lastFrag && frag.initSegment?.url === lastFrag.initSegment?.url
    );
    const state = new TransmuxState(
      discontinuity,
      contiguous,
      accurateTimeOffset,
      trackSwitch,
      timeOffset,
      initSegmentChange,
    );
    if (!contiguous || discontinuity || initSegmentChange) {
      this.hls.logger
        .log(`[transmuxer-interface]: Starting new transmux session for ${frag.type} sn: ${chunkMeta.sn}${
        chunkMeta.part > -1 ? ' part: ' + chunkMeta.part : ''
      } ${this.id === PlaylistLevelType.MAIN ? 'level' : 'track'}: ${chunkMeta.level} id: ${chunkMeta.id}
        discontinuity: ${discontinuity}
        trackSwitch: ${trackSwitch}
        contiguous: ${contiguous}
        accurateTimeOffset: ${accurateTimeOffset}
        timeOffset: ${timeOffset}
        initSegmentChange: ${initSegmentChange}`);
      const config = new TransmuxConfig(
        audioCodec,
        videoCodec,
        initSegmentData,
        duration,
        defaultInitPTS,
      );
      this.configureTransmuxer(config);
    }

    this.frag = frag;
    this.part = part;

    // Frags with sn of 'initSegment' are not transmuxed
    if (this.workerContext) {
      // post fragment payload as transferable objects for ArrayBuffer (no copy)
      this.workerContext.worker.postMessage(
        {
          instanceNo,
          cmd: 'demux',
          data,
          decryptdata,
          chunkMeta,
          state,
        },
        data instanceof ArrayBuffer ? [data] : [],
      );
    } else if (transmuxer) {
      const transmuxResult = transmuxer.push(
        data,
        decryptdata,
        chunkMeta,
        state,
      );
      if (isPromise(transmuxResult)) {
        transmuxResult
          .then((data) => {
            this.handleTransmuxComplete(data);
          })
          .catch((error) => {
            this.transmuxerError(
              error,
              chunkMeta,
              'transmuxer-interface push error',
            );
          });
      } else {
        this.handleTransmuxComplete(transmuxResult as TransmuxerResult);
      }
    }
  }

  flush(chunkMeta: ChunkMetadata) {
    chunkMeta.transmuxing.start = self.performance.now();
    const { instanceNo, transmuxer } = this;
    if (this.workerContext) {
      1;
      this.workerContext.worker.postMessage({
        instanceNo,
        cmd: 'flush',
        chunkMeta,
      });
    } else if (transmuxer) {
      const transmuxResult = transmuxer.flush(chunkMeta);
      if (isPromise(transmuxResult)) {
        transmuxResult
          .then((data) => {
            this.handleFlushResult(data, chunkMeta);
          })
          .catch((error) => {
            this.transmuxerError(
              error,
              chunkMeta,
              'transmuxer-interface flush error',
            );
          });
      } else {
        this.handleFlushResult(transmuxResult, chunkMeta);
      }
    }
  }

  private transmuxerError(
    error: Error,
    chunkMeta: ChunkMetadata,
    reason: string,
  ) {
    if (!this.hls) {
      return;
    }
    this.error = error;
    this.hls.trigger(Events.ERROR, {
      type: ErrorTypes.MEDIA_ERROR,
      details: ErrorDetails.FRAG_PARSING_ERROR,
      chunkMeta,
      frag: this.frag || undefined,
      part: this.part || undefined,
      fatal: false,
      error,
      err: error,
      reason,
    });
  }

  private handleFlushResult(
    results: Array<TransmuxerResult>,
    chunkMeta: ChunkMetadata,
  ) {
    results.forEach((result) => {
      this.handleTransmuxComplete(result);
    });
    this.onFlush(chunkMeta);
  }

  private onWorkerMessage = (
    event: MessageEvent<{
      event: string;
      data?: any;
      instanceNo?: number;
    } | null>,
  ) => {
    const data = event.data;
    const hls = this.hls;
    if (!hls || !data?.event || data.instanceNo !== this.instanceNo) {
      return;
    }
    switch (data.event) {
      case 'init': {
        const objectURL = this.workerContext?.objectURL;
        if (objectURL) {
          // revoke the Object URL that was used to create transmuxer worker, so as not to leak it
          self.URL.revokeObjectURL(objectURL);
        }
        break;
      }

      case 'transmuxComplete': {
        this.handleTransmuxComplete(data.data);
        break;
      }

      case 'flush': {
        this.onFlush(data.data);
        break;
      }

      // pass logs from the worker thread to the main logger
      case 'workerLog': {
        if (hls.logger[data.data.logType]) {
          hls.logger[data.data.logType](data.data.message);
        }
        break;
      }

      default: {
        data.data = data.data || {};
        data.data.frag = this.frag;
        data.data.part = this.part;
        data.data.id = this.id;
        hls.trigger(data.event as keyof HlsListeners, data.data);
        break;
      }
    }
  };

  private onWorkerError = (event) => {
    if (!this.hls) {
      return;
    }
    const error = new Error(
      `${event.message}  (${event.filename}:${event.lineno})`,
    );
    this.hls.config.enableWorker = false;
    this.hls.logger.warn(
      `Error in "${this.id}" Web Worker, fallback to inline`,
    );
    this.hls.trigger(Events.ERROR, {
      type: ErrorTypes.OTHER_ERROR,
      details: ErrorDetails.INTERNAL_EXCEPTION,
      fatal: false,
      event: 'demuxerWorker',
      error,
    });
  };

  private configureTransmuxer(config: TransmuxConfig) {
    const { instanceNo, transmuxer } = this;
    if (this.workerContext) {
      this.workerContext.worker.postMessage({
        instanceNo,
        cmd: 'configure',
        config,
      });
    } else if (transmuxer) {
      transmuxer.configure(config);
    }
  }

  private handleTransmuxComplete(result: TransmuxerResult) {
    result.chunkMeta.transmuxing.end = self.performance.now();
    this.onTransmuxComplete(result);
  }
}
