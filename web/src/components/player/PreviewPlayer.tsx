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
import { isAndroid, isChrome, isMobile } from "react-device-detect";
import { TimeRange } from "@/types/timeline";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";

type PreviewPlayerProps = {
  className?: string;
  camera: string;
  timeRange: TimeRange;
  cameraPreviews: Preview[];
  startTime?: number;
  isScrubbing: boolean;
  forceAspect?: number;
  onControllerReady: (controller: PreviewController) => void;
  onClick?: () => void;
};
export default function PreviewPlayer({
  className,
  camera,
  timeRange,
  cameraPreviews,
  startTime,
  isScrubbing,
  onControllerReady,
  onClick,
}: PreviewPlayerProps) {
  const [currentHourFrame, setCurrentHourFrame] = useState<string>();

  const currentPreview = useMemo(() => {
    return cameraPreviews.find(
      (preview) =>
        preview.camera == camera &&
        Math.round(preview.start) >= timeRange.after &&
        Math.floor(preview.end) <= timeRange.before,
    );
  }, [cameraPreviews, camera, timeRange]);

  if (currentPreview) {
    return (
      <PreviewVideoPlayer
        className={className}
        camera={camera}
        timeRange={timeRange}
        cameraPreviews={cameraPreviews}
        initialPreview={currentPreview}
        startTime={startTime}
        isScrubbing={isScrubbing}
        currentHourFrame={currentHourFrame}
        onControllerReady={onControllerReady}
        onClick={onClick}
        setCurrentHourFrame={setCurrentHourFrame}
      />
    );
  }

  if (isCurrentHour(timeRange.before)) {
    return (
      <PreviewFramesPlayer
        className={className}
        camera={camera}
        timeRange={timeRange}
        startTime={startTime}
        onControllerReady={onControllerReady}
        onClick={onClick}
        setCurrentHourFrame={setCurrentHourFrame}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex size-full items-center justify-center rounded-lg text-white md:rounded-2xl",
        className,
      )}
    >
      No Preview Found
    </div>
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
  timeRange: TimeRange;
  cameraPreviews: Preview[];
  initialPreview?: Preview;
  startTime?: number;
  isScrubbing: boolean;
  currentHourFrame?: string;
  onControllerReady: (controller: PreviewVideoController) => void;
  onClick?: () => void;
  setCurrentHourFrame: (src: string | undefined) => void;
};
function PreviewVideoPlayer({
  className,
  camera,
  timeRange,
  cameraPreviews,
  initialPreview,
  startTime,
  isScrubbing,
  currentHourFrame,
  onControllerReady,
  onClick,
  setCurrentHourFrame,
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

  useEffect(() => {
    if (!controller) {
      return;
    }

    controller.scrubbing = isScrubbing;
  }, [controller, isScrubbing]);

  // initial state

  const [firstLoad, setFirstLoad] = useState(true);

  const [currentPreview, setCurrentPreview] = useState(initialPreview);

  const onPreviewSeeked = useCallback(() => {
    if (!controller) {
      return;
    }

    setCurrentHourFrame(undefined);

    if (isAndroid && isChrome) {
      // android/chrome glitches when setting currentTime at the same time as onSeeked
      setTimeout(() => controller.finishedSeeking(), 25);
    } else {
      controller.finishedSeeking();
    }
    // we only want to update on controller change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);

  // canvas to cover preview transition

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [videoSize, setVideoSize] = useState<number[]>([0, 0]);
  const [changeoverTimeout, setChangeoverTimeout] = useState<NodeJS.Timeout>();

  const changeSource = useCallback(
    (newPreview: Preview | undefined, video: HTMLVideoElement | null) => {
      if (!newPreview || !video) {
        setCurrentPreview(newPreview);
        return;
      }

      if (!canvasRef.current && videoSize[0] > 0) {
        const canvas = document.createElement("canvas");
        canvas.width = videoSize[0];
        canvas.height = videoSize[1];
        canvasRef.current = canvas;
      }

      const context = canvasRef.current?.getContext("2d");

      if (context) {
        context.drawImage(video, 0, 0, videoSize[0], videoSize[1]);
        setCurrentHourFrame(canvasRef.current?.toDataURL("image/webp"));
      }

      setCurrentPreview(newPreview);
      const timeout = setTimeout(() => {
        if (timeout) {
          clearTimeout(timeout);
          setChangeoverTimeout(undefined);
        }

        previewRef.current?.load();
      }, 1000);
      setChangeoverTimeout(timeout);

      // we only want this to change when current preview changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [setCurrentHourFrame, videoSize],
  );

  useEffect(() => {
    if (!controller) {
      return;
    }

    const preview = cameraPreviews.find(
      (preview) =>
        preview.camera == camera &&
        Math.round(preview.start) >= timeRange.after &&
        Math.floor(preview.end) <= timeRange.before,
    );

    if (preview != currentPreview) {
      controller.newPreviewLoaded = false;
      changeSource(preview, previewRef.current);
    }

    controller.newPlayback({
      preview,
      timeRange,
    });

    // we only want this to change when recordings update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, timeRange, changeSource]);

  return (
    <div
      className={cn(
        "relative flex w-full justify-center overflow-hidden rounded-lg bg-black md:rounded-2xl",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      <img
        className={`absolute size-full object-contain ${currentHourFrame ? "visible" : "invisible"}`}
        src={currentHourFrame}
        onLoad={() => {
          if (changeoverTimeout) {
            clearTimeout(changeoverTimeout);
            setChangeoverTimeout(undefined);
          }

          previewRef.current?.load();
        }}
      />
      <video
        ref={previewRef}
        className={`absolute size-full ${currentHourFrame ? "invisible" : "visible"}`}
        preload="auto"
        autoPlay
        playsInline
        muted
        disableRemotePlayback
        onSeeked={onPreviewSeeked}
        onLoadedData={() => {
          if (firstLoad) {
            setFirstLoad(false);
          }

          if (controller) {
            controller.previewReady();
          } else {
            previewRef.current?.pause();
          }

          if (previewRef.current) {
            setVideoSize([
              previewRef.current.videoWidth,
              previewRef.current.videoHeight,
            ]);

            if (startTime && currentPreview) {
              previewRef.current.currentTime = startTime - currentPreview.start;
            }
          }
        }}
      >
        {currentPreview != undefined && (
          <source
            src={`${baseUrl}${currentPreview.src.substring(1)}`}
            type={currentPreview.type}
          />
        )}
      </video>
      {cameraPreviews && !currentPreview && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg text-white md:rounded-2xl">
          No Preview Found
        </div>
      )}
      {firstLoad && <Skeleton className="absolute aspect-video size-full" />}
    </div>
  );
}

class PreviewVideoController extends PreviewController {
  // main state
  private previewRef: MutableRefObject<HTMLVideoElement | null>;
  private timeRange: TimeRange | undefined = undefined;

  // preview
  private preview: Preview | undefined = undefined;
  private timeToSeek: number | undefined = undefined;
  public scrubbing = false;
  public newPreviewLoaded = true;
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
    if (
      !this.newPreviewLoaded ||
      !this.previewRef.current ||
      !this.preview ||
      !this.timeRange
    ) {
      return false;
    }

    if (time < this.preview.start || time > this.preview.end) {
      return false;
    }

    const seekTime = Math.max(0, time - this.preview.start);

    if (this.seeking) {
      this.timeToSeek = seekTime;
    } else {
      this.previewRef.current.currentTime = seekTime;
      this.seeking = true;
    }

    return true;
  }

  override finishedSeeking() {
    if (!this.previewRef.current || !this.preview) {
      return;
    }

    if (this.timeToSeek) {
      const diff = Math.round(
        this.timeToSeek - this.previewRef.current.currentTime,
      );

      const scrubLimit = isMobile ? 1 : 0.5;

      if (Math.abs(diff) >= scrubLimit) {
        // only seek if there is an appropriate amount of time difference
        this.previewRef.current.currentTime = this.timeToSeek;
      } else {
        this.seeking = false;
        this.timeToSeek = undefined;
      }
    } else {
      this.seeking = false;
    }
  }

  override setNewPreviewStartTime(time: number) {
    if (this.preview) {
      this.timeToSeek = time - this.preview.start;
    }
  }

  previewReady() {
    this.newPreviewLoaded = true;
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
  timeRange: TimeRange;
  startTime?: number;
  onControllerReady: (controller: PreviewController) => void;
  onClick?: () => void;
  setCurrentHourFrame: (src: string) => void;
};
function PreviewFramesPlayer({
  className,
  camera,
  timeRange,
  startTime,
  setCurrentHourFrame,
  onControllerReady,
  onClick,
}: PreviewFramesPlayerProps) {
  // frames data

  const { data: previewFrames } = useSWR<string[]>(
    `preview/${camera}/start/${Math.floor(timeRange.after)}/end/${Math.ceil(
      timeRange.before,
    )}/frames`,
    { revalidateOnFocus: false },
  );
  const frameTimes = useMemo(() => {
    if (!previewFrames) {
      return undefined;
    }

    return previewFrames.map((frame) =>
      // @ts-expect-error we know this item will exist
      parseFloat(frame.split("-").at(-1).slice(undefined, -5)),
    );
  }, [previewFrames]);

  // controlling frames

  const imgRef = useRef<HTMLImageElement | null>(null);
  const controller = useMemo(() => {
    if (!frameTimes || !imgRef.current) {
      return undefined;
    }

    return new PreviewFramesController(
      camera,
      imgRef,
      frameTimes,
      setCurrentHourFrame,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgRef, frameTimes, imgRef.current]);

  // initial state

  const [firstLoad, setFirstLoad] = useState(true);

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
    setFirstLoad(false);

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
      controller.scrubToTimestamp(frameTimes?.at(-1) ?? timeRange.after);
    } else {
      controller.scrubToTimestamp(startTime);
    }
    // we only want to calculate this once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);

  return (
    <div
      className={cn(
        "relative flex w-full justify-center",
        className,
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
    >
      <img
        ref={imgRef}
        className={`size-full rounded-lg bg-black object-contain md:rounded-2xl`}
        onLoad={onImageLoaded}
      />
      {previewFrames?.length === 0 && (
        <div className="-y-translate-1/2 align-center absolute inset-x-0 top-1/2 rounded-lg bg-black text-center text-white md:rounded-2xl">
          No Preview Found
        </div>
      )}
      {firstLoad && <Skeleton className="absolute aspect-video size-full" />}
    </div>
  );
}

class PreviewFramesController extends PreviewController {
  imgController: MutableRefObject<HTMLImageElement | null>;
  frameTimes: number[];
  seeking: boolean = false;
  private timeToSeek: number | undefined = undefined;
  private setCurrentFrame: (src: string) => void;

  constructor(
    camera: string,
    imgController: MutableRefObject<HTMLImageElement | null>,
    frameTimes: number[],
    setCurrentFrame: (src: string) => void,
  ) {
    super(camera);
    this.imgController = imgController;
    this.frameTimes = frameTimes;
    this.setCurrentFrame = setCurrentFrame;
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
        this.setCurrentFrame(newSrc);
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
