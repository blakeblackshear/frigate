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

type PreviewVideoPlayerProps = {
  className?: string;
  camera: string;
  timeRange: { start: number; end: number };
  cameraPreviews: Preview[];
  startTime?: number;
  onControllerReady: (controller: PreviewVideoController) => void;
  onClick?: () => void;
};
export default function PreviewVideoPlayer({
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
    </div>
  );
}

export class PreviewVideoController {
  // main state
  public camera = "";
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
    this.camera = camera;
    this.previewRef = previewRef;
  }

  newPlayback(newPlayback: PreviewPlayback) {
    this.preview = newPlayback.preview;
    this.seeking = false;

    this.timeRange = newPlayback.timeRange;
  }

  scrubToTimestamp(time: number): boolean {
    if (!this.preview || !this.timeRange) {
      return false;
    }

    if (time < this.preview.start || time > this.preview.end) {
      return false;
    }

    if (this.seeking) {
      this.timeToSeek = time;
    } else {
      if (this.previewRef.current) {
        this.previewRef.current.currentTime = Math.max(
          0,
          time - this.preview.start,
        );
        this.seeking = true;
      }
    }

    return true;
  }

  setNewPreviewStartTime(time: number) {
    this.timeToSeek = time;
  }

  finishedSeeking() {
    if (!this.previewRef.current || !this.preview) {
      return;
    }

    if (
      this.timeToSeek &&
      this.timeToSeek != this.previewRef.current?.currentTime
    ) {
      this.previewRef.current.currentTime =
        this.timeToSeek - this.preview.start;
    } else {
      this.seeking = false;
    }
  }

  previewReady() {
    this.seeking = false;
    this.previewRef.current?.pause();

    if (this.timeToSeek) {
      this.finishedSeeking();
    }
  }
}
