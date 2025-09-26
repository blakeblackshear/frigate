import type {
  BufferOperation,
  BufferOperationQueues,
  SourceBufferName,
  SourceBufferTrackSet,
} from '../types/buffer';

export default class BufferOperationQueue {
  private tracks: SourceBufferTrackSet | null;
  private queues: BufferOperationQueues | null = {
    video: [],
    audio: [],
    audiovideo: [],
  };

  constructor(sourceBufferReference: SourceBufferTrackSet) {
    this.tracks = sourceBufferReference;
  }

  public destroy() {
    this.tracks = this.queues = null;
  }

  public append(
    operation: BufferOperation,
    type: SourceBufferName,
    pending?: boolean | undefined,
  ) {
    if (this.queues === null || this.tracks === null) {
      return;
    }
    const queue = this.queues[type];
    queue.push(operation);
    if (queue.length === 1 && !pending) {
      this.executeNext(type);
    }
  }

  public appendBlocker(type: SourceBufferName): Promise<void> {
    return new Promise((resolve) => {
      const operation: BufferOperation = {
        label: 'async-blocker',
        execute: resolve,
        onStart: () => {},
        onComplete: () => {},
        onError: () => {},
      };
      this.append(operation, type);
    });
  }

  public prependBlocker(type: SourceBufferName): Promise<void> {
    return new Promise((resolve) => {
      if (this.queues) {
        const operation: BufferOperation = {
          label: 'async-blocker-prepend',
          execute: resolve,
          onStart: () => {},
          onComplete: () => {},
          onError: () => {},
        };
        this.queues[type].unshift(operation);
      }
    });
  }

  public removeBlockers() {
    if (this.queues === null) {
      return;
    }
    [this.queues.video, this.queues.audio, this.queues.audiovideo].forEach(
      (queue) => {
        const label = queue[0]?.label;
        if (label === 'async-blocker' || label === 'async-blocker-prepend') {
          queue[0].execute();
          queue.splice(0, 1);
        }
      },
    );
  }

  public unblockAudio(op: BufferOperation) {
    if (this.queues === null) {
      return;
    }
    const queue = this.queues.audio;
    if (queue[0] === op) {
      this.shiftAndExecuteNext('audio');
    }
  }

  public executeNext(type: SourceBufferName) {
    if (this.queues === null || this.tracks === null) {
      return;
    }
    const queue = this.queues[type];
    if (queue.length) {
      const operation: BufferOperation = queue[0];
      try {
        // Operations are expected to result in an 'updateend' event being fired. If not, the queue will lock. Operations
        // which do not end with this event must call _onSBUpdateEnd manually
        operation.execute();
      } catch (error) {
        operation.onError(error);
        if (this.queues === null || this.tracks === null) {
          return;
        }

        // Only shift the current operation off, otherwise the updateend handler will do this for us
        const sb = this.tracks[type]?.buffer;
        if (!sb?.updating) {
          this.shiftAndExecuteNext(type);
        }
      }
    }
  }

  public shiftAndExecuteNext(type: SourceBufferName) {
    if (this.queues === null) {
      return;
    }
    this.queues[type].shift();
    this.executeNext(type);
  }

  public current(type: SourceBufferName): BufferOperation | null {
    return this.queues?.[type][0] || null;
  }

  public toString(): string {
    const { queues, tracks } = this;
    if (queues === null || tracks === null) {
      return `<destroyed>`;
    }
    return `
${this.list('video')}
${this.list('audio')}
${this.list('audiovideo')}}`;
  }

  public list(type: SourceBufferName): string {
    return this.queues?.[type] || this.tracks?.[type]
      ? `${type}: (${this.listSbInfo(type)}) ${this.listOps(type)}`
      : '';
  }

  private listSbInfo(type: SourceBufferName): string {
    const track = this.tracks?.[type];
    const sb = track?.buffer;
    if (!sb) {
      return 'none';
    }
    return `SourceBuffer${sb.updating ? ' updating' : ''}${track.ended ? ' ended' : ''}${track.ending ? ' ending' : ''}`;
  }

  private listOps(type: SourceBufferName): string {
    return this.queues?.[type].map((op) => op.label).join(', ') || '';
  }
}
