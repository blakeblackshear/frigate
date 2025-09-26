import { Events } from '../events';
import type StreamController from './stream-controller';
import type Hls from '../hls';
import type { ComponentAPI } from '../types/component-api';
import type { MediaAttachingData } from '../types/events';

class FPSController implements ComponentAPI {
  private hls: Hls;
  private isVideoPlaybackQualityAvailable: boolean = false;
  private timer?: number;
  private media: HTMLVideoElement | null = null;
  private lastTime: any;
  private lastDroppedFrames: number = 0;
  private lastDecodedFrames: number = 0;
  // stream controller must be provided as a dependency!
  private streamController!: StreamController;

  constructor(hls: Hls) {
    this.hls = hls;

    this.registerListeners();
  }

  public setStreamController(streamController: StreamController) {
    this.streamController = streamController;
  }

  protected registerListeners() {
    this.hls.on(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
    this.hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
  }

  protected unregisterListeners() {
    this.hls.off(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
    this.hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.unregisterListeners();
    this.isVideoPlaybackQualityAvailable = false;
    this.media = null;
  }

  protected onMediaAttaching(
    event: Events.MEDIA_ATTACHING,
    data: MediaAttachingData,
  ) {
    const config = this.hls.config;
    if (config.capLevelOnFPSDrop) {
      const media =
        data.media instanceof self.HTMLVideoElement ? data.media : null;
      this.media = media;
      if (media && typeof media.getVideoPlaybackQuality === 'function') {
        this.isVideoPlaybackQualityAvailable = true;
      }

      self.clearInterval(this.timer);
      this.timer = self.setInterval(
        this.checkFPSInterval.bind(this),
        config.fpsDroppedMonitoringPeriod,
      );
    }
  }

  private onMediaDetaching() {
    this.media = null;
  }

  checkFPS(
    video: HTMLVideoElement,
    decodedFrames: number,
    droppedFrames: number,
  ) {
    const currentTime = performance.now();
    if (decodedFrames) {
      if (this.lastTime) {
        const currentPeriod = currentTime - this.lastTime;
        const currentDropped = droppedFrames - this.lastDroppedFrames;
        const currentDecoded = decodedFrames - this.lastDecodedFrames;
        const droppedFPS = (1000 * currentDropped) / currentPeriod;
        const hls = this.hls;
        hls.trigger(Events.FPS_DROP, {
          currentDropped: currentDropped,
          currentDecoded: currentDecoded,
          totalDroppedFrames: droppedFrames,
        });
        if (droppedFPS > 0) {
          // hls.logger.log('checkFPS : droppedFPS/decodedFPS:' + droppedFPS/(1000 * currentDecoded / currentPeriod));
          if (
            currentDropped >
            hls.config.fpsDroppedMonitoringThreshold * currentDecoded
          ) {
            let currentLevel = hls.currentLevel;
            hls.logger.warn(
              'drop FPS ratio greater than max allowed value for currentLevel: ' +
                currentLevel,
            );
            if (
              currentLevel > 0 &&
              (hls.autoLevelCapping === -1 ||
                hls.autoLevelCapping >= currentLevel)
            ) {
              currentLevel = currentLevel - 1;
              hls.trigger(Events.FPS_DROP_LEVEL_CAPPING, {
                level: currentLevel,
                droppedLevel: hls.currentLevel,
              });
              hls.autoLevelCapping = currentLevel;
              this.streamController.nextLevelSwitch();
            }
          }
        }
      }
      this.lastTime = currentTime;
      this.lastDroppedFrames = droppedFrames;
      this.lastDecodedFrames = decodedFrames;
    }
  }

  checkFPSInterval() {
    const video = this.media;
    if (video) {
      if (this.isVideoPlaybackQualityAvailable) {
        const videoPlaybackQuality = video.getVideoPlaybackQuality();
        this.checkFPS(
          video,
          videoPlaybackQuality.totalVideoFrames,
          videoPlaybackQuality.droppedVideoFrames,
        );
      } else {
        // HTMLVideoElement doesn't include the webkit types
        this.checkFPS(
          video,
          (video as any).webkitDecodedFrameCount as number,
          (video as any).webkitDroppedFrameCount as number,
        );
      }
    }
  }
}

export default FPSController;
