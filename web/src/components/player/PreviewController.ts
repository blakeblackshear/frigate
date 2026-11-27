export abstract class PreviewController {
  public camera = "";

  constructor(camera: string) {
    this.camera = camera;
  }

  abstract scrubToTimestamp(time: number): boolean;

  abstract finishedSeeking(): void;

  abstract setNewPreviewStartTime(time: number): void;
}
