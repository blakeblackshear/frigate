/**
 * Provides methods dealing with buffer length retrieval for example.
 *
 * In general, a helper around HTML5 MediaElement TimeRanges gathered from `buffered` property.
 *
 * Also @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/buffered
 */

import { logger } from './logger';

export type BufferTimeRange = {
  start: number;
  end: number;
};

export type Bufferable = {
  buffered: TimeRanges;
};

export type BufferInfo = {
  len: number;
  start: number;
  end: number;
  nextStart?: number;
  buffered?: BufferTimeRange[];
  bufferedIndex: number;
};

const noopBuffered: TimeRanges = {
  length: 0,
  start: () => 0,
  end: () => 0,
};

export class BufferHelper {
  /**
   * Return true if `media`'s buffered include `position`
   */
  static isBuffered(media: Bufferable, position: number): boolean {
    if (media) {
      const buffered = BufferHelper.getBuffered(media);
      for (let i = buffered.length; i--; ) {
        if (position >= buffered.start(i) && position <= buffered.end(i)) {
          return true;
        }
      }
    }
    return false;
  }

  static bufferedRanges(media: Bufferable | null): BufferTimeRange[] {
    if (media) {
      const timeRanges = BufferHelper.getBuffered(media);
      return BufferHelper.timeRangesToArray(timeRanges);
    }
    return [];
  }

  static timeRangesToArray(timeRanges: TimeRanges): BufferTimeRange[] {
    const buffered: BufferTimeRange[] = [];
    for (let i = 0; i < timeRanges.length; i++) {
      buffered.push({ start: timeRanges.start(i), end: timeRanges.end(i) });
    }
    return buffered;
  }

  static bufferInfo(
    media: Bufferable | null,
    pos: number,
    maxHoleDuration: number,
  ): BufferInfo {
    if (media) {
      const buffered = BufferHelper.bufferedRanges(media);
      if (buffered.length) {
        return BufferHelper.bufferedInfo(buffered, pos, maxHoleDuration);
      }
    }
    return { len: 0, start: pos, end: pos, bufferedIndex: -1 };
  }

  static bufferedInfo(
    buffered: BufferTimeRange[],
    pos: number,
    maxHoleDuration: number,
  ): BufferInfo {
    pos = Math.max(0, pos);
    // sort on buffer.start/smaller end (IE does not always return sorted buffered range)
    if (buffered.length > 1) {
      buffered.sort((a, b) => a.start - b.start || b.end - a.end);
    }

    let bufferedIndex: number = -1;
    let buffered2: BufferTimeRange[] = [];
    if (maxHoleDuration) {
      // there might be some small holes between buffer time range
      // consider that holes smaller than maxHoleDuration are irrelevant and build another
      // buffer time range representations that discards those holes
      for (let i = 0; i < buffered.length; i++) {
        if (pos >= buffered[i].start && pos <= buffered[i].end) {
          bufferedIndex = i;
        }
        const buf2len = buffered2.length;
        if (buf2len) {
          const buf2end = buffered2[buf2len - 1].end;
          // if small hole (value between 0 or maxHoleDuration ) or overlapping (negative)
          if (buffered[i].start - buf2end < maxHoleDuration) {
            // merge overlapping time ranges
            // update lastRange.end only if smaller than item.end
            // e.g.  [ 1, 15] with  [ 2,8] => [ 1,15] (no need to modify lastRange.end)
            // whereas [ 1, 8] with  [ 2,15] => [ 1,15] ( lastRange should switch from [1,8] to [1,15])
            if (buffered[i].end > buf2end) {
              buffered2[buf2len - 1].end = buffered[i].end;
            }
          } else {
            // big hole
            buffered2.push(buffered[i]);
          }
        } else {
          // first value
          buffered2.push(buffered[i]);
        }
      }
    } else {
      buffered2 = buffered;
    }

    let bufferLen = 0;

    let nextStart: number | undefined;

    // bufferStart and bufferEnd are buffer boundaries around current playback position (pos)
    let bufferStart: number = pos;
    let bufferEnd: number = pos;
    for (let i = 0; i < buffered2.length; i++) {
      const start = buffered2[i].start;
      const end = buffered2[i].end;
      // logger.log('buf start/end:' + buffered.start(i) + '/' + buffered.end(i));
      if (bufferedIndex === -1 && pos >= start && pos <= end) {
        bufferedIndex = i;
      }
      if (pos + maxHoleDuration >= start && pos < end) {
        // play position is inside this buffer TimeRange, retrieve end of buffer position and buffer length
        bufferStart = start;
        bufferEnd = end;
        bufferLen = bufferEnd - pos;
      } else if (pos + maxHoleDuration < start) {
        nextStart = start;
        break;
      }
    }
    return {
      len: bufferLen,
      start: bufferStart || 0,
      end: bufferEnd || 0,
      nextStart,
      buffered,
      bufferedIndex,
    };
  }

  /**
   * Safe method to get buffered property.
   * SourceBuffer.buffered may throw if SourceBuffer is removed from it's MediaSource
   */
  static getBuffered(media: Bufferable): TimeRanges {
    try {
      return media.buffered || noopBuffered;
    } catch (e) {
      logger.log('failed to get media.buffered', e);
      return noopBuffered;
    }
  }
}
