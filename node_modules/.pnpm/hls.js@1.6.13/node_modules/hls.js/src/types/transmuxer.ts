import type { SourceBufferName } from './buffer';
import type { HlsChunkPerformanceTiming } from './loader';
import type { RemuxerResult } from './remuxer';

export interface TransmuxerResult {
  remuxResult: RemuxerResult;
  chunkMeta: ChunkMetadata;
}

export class ChunkMetadata {
  public readonly level: number;
  public readonly sn: number;
  public readonly part: number;
  public readonly id: number;
  public readonly size: number;
  public readonly partial: boolean;
  public readonly transmuxing: HlsChunkPerformanceTiming =
    getNewPerformanceTiming();
  public readonly buffering: {
    [key in SourceBufferName]: HlsChunkPerformanceTiming;
  } = {
    audio: getNewPerformanceTiming(),
    video: getNewPerformanceTiming(),
    audiovideo: getNewPerformanceTiming(),
  };

  constructor(
    level: number,
    sn: number,
    id: number,
    size = 0,
    part = -1,
    partial = false,
  ) {
    this.level = level;
    this.sn = sn;
    this.id = id;
    this.size = size;
    this.part = part;
    this.partial = partial;
  }
}

function getNewPerformanceTiming(): HlsChunkPerformanceTiming {
  return { start: 0, executeStart: 0, executeEnd: 0, end: 0 };
}
