import {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { Preview } from "@/types/preview";
import { PreviewPlayback } from "@/types/playback";
import { isCurrentHour } from "@/utils/dateUtil";
import { baseUrl } from "@/api/baseUrl";
import { isAndroid } from "react-device-detect";
import { Skeleton } from "../ui/skeleton";

type PreviewPlayerProps = {
  className?: string;
  camera: string;
  timeRange: { start: number; end: number };
  cameraPreviews: Preview[];
  startTime?: number;
  onControllerReady: (controller: PreviewController) => void;
  onClick?: () => void;
};
export default function PreviewPlayer({
  className,
  camera,
  timeRange,
  cameraPreviews,
  startTime,
  onControllerReady,
  onClick,
}: PreviewPlayerProps) {
  if (isCurrentHour(timeRange.end)) {
    return (
      <PreviewFramesPlayer
        className={className}
        camera={camera}
        timeRange={timeRange}
        startTime={startTime}
        onControllerReady={onControllerReady}
        onClick={onClick}
      />
    );
  }

  return (
    <PreviewVideoPlayer
      className={className}
      camera={camera}
      timeRange={timeRange}
      cameraPreviews={cameraPreviews}
      startTime={startTime}
      onControllerReady={onControllerReady}
      onClick={onClick}
    />
  );
}

export abstract class PreviewController {
  public camera = "";

  constructor(camera: string) {
    this.camera = camera;
  }

  abstract scrubToTimestamp(time: number): boolean;

  abstract finishedSeeking(): void;

  abstract setNewPreviewStartTime(time: number): void;
}

type PreviewVideoPlayerProps = {
  className?: string;
  camera: string;
  timeRange: { start: number; end: number };
  cameraPreviews: Preview[];
  startTime?: number;
  onControllerReady: (controller: PreviewVideoController) => void;
  onClick?: () => void;
};
function PreviewVideoPlayer({
  className,
  camera,
  timeRange,
  cameraPreviews,
  startTime,
  onControllerReady,
  onClick,
}: PreviewVideoPlayerProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  // controlling playback

  const previewRef = useRef<HTMLVideoElement | null>(null);
  const controller = useMemo(() => {
    if (!config || !previewRef.current) {
      return undefined;
    }

    return new PreviewVideoController(camera, previewRef);
    // we only care when preview is ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, config, previewRef.current]);

  useEffect(() => {
    if (!controller) {
      return;
    }

    if (controller) {
      onControllerReady(controller);
    }
    // we only want to fire once when players are ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);

  // initial state

  const [loaded, setLoaded] = useState(false);
  const initialPreview = useMemo(() => {
    return cameraPreviews.find(
      (preview) =>
        preview.camera == camera &&
        Math.round(preview.start) >= timeRange.start &&
        Math.floor(preview.end) <= timeRange.end,
    );

    // we only want to calculate this once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [currentPreview, setCurrentPreview] = useState(initialPreview);

  const onPreviewSeeked = useCallback(() => {
    if (!controller) {
      return;
    }

    controller.finishedSeeking();
  }, [controller]);

  useEffect(() => {
    if (!controller) {
      return;
    }

    const preview = cameraPreviews.find(
      (preview) =>
        preview.camera == camera &&
        Math.round(preview.start) >= timeRange.start &&
        Math.floor(preview.end) <= timeRange.end,
    );
    setLoaded(false);
    setCurrentPreview(preview);

    controller.newPlayback({
      preview,
      timeRange,
    });

    // we only want this to change when recordings update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, timeRange]);

  useEffect(() => {
    if (!currentPreview || !previewRef.current) {
      return;
    }

    previewRef.current.load();
  }, [currentPreview, previewRef]);

  return (
    <div
      className={`relative w-full ${className ?? ""} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <video
        ref={previewRef}
        className={`size-full rounded-2xl bg-black`}
        preload="auto"
        autoPlay
        playsInline
        muted
        disableRemotePlayback
        onSeeked={onPreviewSeeked}
        onLoadedData={() => {
          setLoaded(true);

          if (controller) {
            controller.previewReady();
          } else {
            previewRef.current?.pause();
          }

          if (previewRef.current && startTime && currentPreview) {
            previewRef.current.currentTime = startTime - currentPreview.start;
          }
        }}
      >
        {currentPreview != undefined && (
          <source src={currentPreview.src} type={currentPreview.type} />
        )}
      </video>
      {!loaded && <Skeleton className="absolute inset-0" />}
      {cameraPreviews && !currentPreview && (
        <div className="absolute inset-x-0 top-1/2 -y-translate-1/2 bg-black text-white rounded-2xl align-center text-center">
          No Preview Found
        </div>
      )}
    </div>
  );
}

class PreviewVideoController extends PreviewController {
  // main state
  private previewRef: MutableRefObject<HTMLVideoElement | null>;
  private timeRange: { start: number; end: number } | undefined = undefined;

  // preview
  private preview: Preview | undefined = undefined;
  private timeToSeek: number | undefined = undefined;
  private seeking = false;

  constructor(
    camera: string,
    previewRef: MutableRefObject<HTMLVideoElement | null>,
  ) {
    super(camera);
    this.previewRef = previewRef;
  }

  newPlayback(newPlayback: PreviewPlayback) {
    this.preview = newPlayback.preview;
    this.seeking = false;

    this.timeRange = newPlayback.timeRange;
  }

  override scrubToTimestamp(time: number): boolean {
    if (!this.previewRef.current || !this.preview || !this.timeRange) {
      return false;
    }

    if (time < this.preview.start || time > this.preview.end) {
      return false;
    }

    if (this.seeking) {
      this.timeToSeek = time;
    } else {
      this.previewRef.current.currentTime = Math.max(
        0,
        time - this.preview.start,
      );
      this.seeking = true;
    }

    return true;
  }

  override finishedSeeking() {
    if (!this.previewRef.current || !this.preview) {
      return;
    }

    if (this.timeToSeek) {
      if (
        Math.round(this.previewRef.current.currentTime + this.preview.start) !=
        Math.round(this.timeToSeek)
      ) {
        if (isAndroid) {
          const currentTs =
            this.previewRef.current.currentTime + this.preview.start;
          const diff = this.timeToSeek - currentTs;

          if (diff < 30) {
            this.previewRef.current.currentTime =
              this.previewRef.current.currentTime + diff / 2;
          } else {
            this.previewRef.current.currentTime =
              this.timeToSeek - this.preview.start;
          }
        } else {
          this.previewRef.current.currentTime =
            this.timeToSeek - this.preview.start;
        }
      } else {
        this.seeking = false;
        this.timeToSeek = undefined;
      }
    } else {
      this.seeking = false;
    }
  }

  override setNewPreviewStartTime(time: number) {
    this.timeToSeek = time;
  }

  previewReady() {
    this.seeking = false;
    this.previewRef.current?.pause();

    if (this.timeToSeek) {
      this.finishedSeeking();
    }
  }
}

type PreviewFramesPlayerProps = {
  className?: string;
  camera: string;
  timeRange: { start: number; end: number };
  startTime?: number;
  onControllerReady: (controller: PreviewController) => void;
  onClick?: () => void;
};
function PreviewFramesPlayer({
  className,
  camera,
  timeRange,
  startTime,
  onControllerReady,
  onClick,
}: PreviewFramesPlayerProps) {
  // frames data

  const { data: previewFrames } = useSWR<string[]>(
    `preview/${camera}/start/${Math.floor(timeRange.start)}/end/${Math.ceil(
      timeRange.end,
    )}/frames`,
    { revalidateOnFocus: false },
  );
  const frameTimes = useMemo(() => {
    if (!previewFrames) {
      return undefined;
    }

    return previewFrames.map((frame) =>
      parseFloat(frame.split("-")[1].slice(undefined, -5)),
    );
  }, [previewFrames]);

  // controlling frames

  const imgRef = useRef<HTMLImageElement | null>(null);
  const controller = useMemo(() => {
    if (!frameTimes || !imgRef.current) {
      return undefined;
    }

    return new PreviewFramesController(camera, imgRef, frameTimes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgRef, frameTimes, imgRef.current]);

  // initial state

  useEffect(() => {
    if (!controller) {
      return;
    }

    if (controller) {
      onControllerReady(controller);
    }

    // we only want to fire once when players are ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);

  const onImageLoaded = useCallback(() => {
    if (!controller) {
      return;
    }

    controller.finishedSeeking();
  }, [controller]);

  useEffect(() => {
    if (!controller) {
      return;
    }

    if (!startTime) {
      controller.scrubToTimestamp(frameTimes?.at(-1) ?? timeRange.start);
    } else {
      controller.scrubToTimestamp(startTime);
    }
    // we only want to calculate this once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);

  return (
    <div
      className={`relative w-full ${className ?? ""} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <img
        ref={imgRef}
        className={`size-full object-contain rounded-2xl bg-black`}
        onLoad={onImageLoaded}
      />
      {previewFrames?.length === 0 && (
        <div className="absolute inset-x-0 top-1/2 -y-translate-1/2 bg-black text-white rounded-2xl align-center text-center">
          No Preview Found
        </div>
      )}
    </div>
  );
}

class PreviewFramesController extends PreviewController {
  imgController: MutableRefObject<HTMLImageElement | null>;
  frameTimes: number[];
  seeking: boolean = false;
  private timeToSeek: number | undefined = undefined;

  constructor(
    camera: string,
    imgController: MutableRefObject<HTMLImageElement | null>,
    frameTimes: number[],
  ) {
    super(camera);
    this.imgController = imgController;
    this.frameTimes = frameTimes;
  }

  override scrubToTimestamp(time: number): boolean {
    if (!this.imgController.current) {
      return false;
    }

    const frame = this.frameTimes.find((p) => {
      return time <= p;
    });

    if (!frame) {
      return false;
    }

    if (this.seeking) {
      this.timeToSeek = frame;
    } else {
      const newSrc = `${baseUrl}api/preview/preview_${this.camera}-${frame}.webp/thumbnail.webp`;

      if (this.imgController.current.src != newSrc) {
        this.imgController.current.src = newSrc;
        this.seeking = true;
      }
    }

    return true;
  }

  override finishedSeeking() {
    if (!this.imgController.current) {
      return false;
    }

    if (this.timeToSeek) {
      const newSrc = `${baseUrl}api/preview/preview_${this.camera}-${this.timeToSeek}.webp/thumbnail.webp`;

      if (this.imgController.current.src != newSrc) {
        this.imgController.current.src = newSrc;
      } else {
        this.timeToSeek = undefined;
        this.seeking = false;
      }
    } else {
      this.seeking = false;
    }
  }

  override setNewPreviewStartTime(time: number) {
    this.timeToSeek = time;
  }
}
