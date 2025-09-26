import { EventEmitter } from 'eventemitter3';
import Transmuxer, { isPromise } from '../demux/transmuxer';
import { ErrorDetails, ErrorTypes } from '../errors';
import { Events } from '../events';
import { enableLogs, type ILogger } from '../utils/logger';
import type { RemuxedTrack, RemuxerResult } from '../types/remuxer';
import type { ChunkMetadata, TransmuxerResult } from '../types/transmuxer';

const transmuxers: (Transmuxer | undefined)[] = [];

if (typeof __IN_WORKER__ !== 'undefined' && __IN_WORKER__) {
  startWorker();
}

function startWorker() {
  self.addEventListener('message', (ev) => {
    const data = ev.data;
    const instanceNo = data.instanceNo;
    if (instanceNo === undefined) {
      return;
    }
    const transmuxer = transmuxers[instanceNo];
    if (data.cmd === 'reset') {
      delete transmuxers[data.resetNo];
      if (transmuxer) {
        transmuxer.destroy();
      }
      data.cmd = 'init';
    }
    if (data.cmd === 'init') {
      const config = JSON.parse(data.config);
      const observer = new EventEmitter();
      observer.on(Events.FRAG_DECRYPTED, forwardMessage);
      observer.on(Events.ERROR, forwardMessage);
      const logger = enableLogs(config.debug, data.id);
      forwardWorkerLogs(logger, instanceNo);
      transmuxers[instanceNo] = new Transmuxer(
        observer,
        data.typeSupported,
        config,
        '',
        data.id,
        logger,
      );
      forwardMessage('init', null, instanceNo);
      return;
    }
    if (!transmuxer) {
      return;
    }
    switch (data.cmd) {
      case 'configure': {
        transmuxer.configure(data.config);
        break;
      }
      case 'demux': {
        const transmuxResult: TransmuxerResult | Promise<TransmuxerResult> =
          transmuxer.push(
            data.data,
            data.decryptdata,
            data.chunkMeta,
            data.state,
          );
        if (isPromise(transmuxResult)) {
          transmuxResult
            .then((data) => {
              emitTransmuxComplete(self, data, instanceNo);
            })
            .catch((error) => {
              forwardMessage(
                Events.ERROR,
                {
                  instanceNo,
                  type: ErrorTypes.MEDIA_ERROR,
                  details: ErrorDetails.FRAG_PARSING_ERROR,
                  chunkMeta: data.chunkMeta,
                  fatal: false,
                  error,
                  err: error,
                  reason: `transmuxer-worker push error`,
                },
                instanceNo,
              );
            });
        } else {
          emitTransmuxComplete(self, transmuxResult, instanceNo);
        }
        break;
      }
      case 'flush': {
        const chunkMeta = data.chunkMeta as ChunkMetadata;
        const transmuxResult = transmuxer.flush(chunkMeta);
        if (isPromise(transmuxResult)) {
          transmuxResult
            .then((results: Array<TransmuxerResult>) => {
              handleFlushResult(
                self,
                results as Array<TransmuxerResult>,
                chunkMeta,
                instanceNo,
              );
            })
            .catch((error) => {
              forwardMessage(
                Events.ERROR,
                {
                  type: ErrorTypes.MEDIA_ERROR,
                  details: ErrorDetails.FRAG_PARSING_ERROR,
                  chunkMeta: data.chunkMeta,
                  fatal: false,
                  error,
                  err: error,
                  reason: `transmuxer-worker flush error`,
                },
                instanceNo,
              );
            });
        } else {
          handleFlushResult(
            self,
            transmuxResult as Array<TransmuxerResult>,
            chunkMeta,
            instanceNo,
          );
        }
        break;
      }
      default:
        break;
    }
  });
}

function emitTransmuxComplete(
  self: any,
  transmuxResult: TransmuxerResult,
  instanceNo: number,
): boolean {
  if (isEmptyResult(transmuxResult.remuxResult)) {
    return false;
  }
  const transferable: Array<ArrayBuffer> = [];
  const { audio, video } = transmuxResult.remuxResult;
  if (audio) {
    addToTransferable(transferable, audio);
  }
  if (video) {
    addToTransferable(transferable, video);
  }
  self.postMessage(
    { event: 'transmuxComplete', data: transmuxResult, instanceNo },
    transferable,
  );
  return true;
}

// Converts data to a transferable object https://developers.google.com/web/updates/2011/12/Transferable-Objects-Lightning-Fast)
// in order to minimize message passing overhead
function addToTransferable(
  transferable: Array<ArrayBuffer>,
  track: RemuxedTrack,
) {
  if (track.data1) {
    transferable.push(track.data1.buffer);
  }
  if (track.data2) {
    transferable.push(track.data2.buffer);
  }
}

function handleFlushResult(
  self: any,
  results: Array<TransmuxerResult>,
  chunkMeta: ChunkMetadata,
  instanceNo: number,
) {
  const parsed = results.reduce(
    (parsed, result) =>
      emitTransmuxComplete(self, result, instanceNo) || parsed,
    false,
  );
  if (!parsed) {
    // Emit at least one "transmuxComplete" message even if media is not found to update stream-controller state to PARSING
    self.postMessage({
      event: 'transmuxComplete',
      data: results[0],
      instanceNo,
    });
  }
  self.postMessage({ event: 'flush', data: chunkMeta, instanceNo });
}

function forwardMessage(event, data, instanceNo) {
  self.postMessage({ event, data, instanceNo });
}

function forwardWorkerLogs(logger: ILogger, instanceNo: number) {
  for (const logFn in logger) {
    logger[logFn] = function () {
      const message = Array.prototype.join.call(arguments, ' ');
      forwardMessage(
        'workerLog',
        {
          logType: logFn,
          message,
        },
        instanceNo,
      );
    };
  }
}

function isEmptyResult(remuxResult: RemuxerResult) {
  return (
    !remuxResult.audio &&
    !remuxResult.video &&
    !remuxResult.text &&
    !remuxResult.id3 &&
    !remuxResult.initSegment
  );
}
