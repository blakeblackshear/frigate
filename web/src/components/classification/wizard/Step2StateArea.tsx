import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LuX, LuPlus } from "react-icons/lu";
import { Stage, Layer, Rect, Transformer } from "react-konva";
import Konva from "konva";
import { useResizeObserver } from "@/hooks/resize-observer";
import { useApiHost } from "@/api";
import { resolveCameraName } from "@/hooks/use-camera-friendly-name";
import Heading from "@/components/ui/heading";
import { isMobile } from "react-device-detect";
import { cn } from "@/lib/utils";

export type CameraAreaConfig = {
  camera: string;
  crop: [number, number, number, number];
};

export type Step2FormData = {
  cameraAreas: CameraAreaConfig[];
};

type Step2StateAreaProps = {
  initialData?: Partial<Step2FormData>;
  onNext: (data: Step2FormData) => void;
  onBack: () => void;
};

export default function Step2StateArea({
  initialData,
  onNext,
  onBack,
}: Step2StateAreaProps) {
  const { t } = useTranslation(["views/classificationModel"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const apiHost = useApiHost();

  const [cameraAreas, setCameraAreas] = useState<CameraAreaConfig[]>(
    initialData?.cameraAreas || [],
  );
  const [selectedCameraIndex, setSelectedCameraIndex] = useState<number>(0);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const rectRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const [{ width: containerWidth }] = useResizeObserver(containerRef);

  const availableCameras = useMemo(() => {
    if (!config) return [];

    const selectedCameraNames = cameraAreas.map((ca) => ca.camera);
    return Object.entries(config.cameras)
      .sort()
      .filter(
        ([name, cam]) =>
          cam.enabled &&
          cam.enabled_in_config &&
          !selectedCameraNames.includes(name),
      )
      .map(([name]) => ({
        name,
        displayName: resolveCameraName(config, name),
      }));
  }, [config, cameraAreas]);

  const selectedCamera = useMemo(() => {
    if (cameraAreas.length === 0) return null;
    return cameraAreas[selectedCameraIndex];
  }, [cameraAreas, selectedCameraIndex]);

  const selectedCameraConfig = useMemo(() => {
    if (!config || !selectedCamera) return null;
    return config.cameras[selectedCamera.camera];
  }, [config, selectedCamera]);

  const imageSize = useMemo(() => {
    if (!containerWidth || !selectedCameraConfig) {
      return { width: 0, height: 0 };
    }

    const containerAspectRatio = 16 / 9;
    const containerHeight = containerWidth / containerAspectRatio;

    const cameraAspectRatio =
      selectedCameraConfig.detect.width / selectedCameraConfig.detect.height;

    // Fit camera within 16:9 container
    let imageWidth, imageHeight;
    if (cameraAspectRatio > containerAspectRatio) {
      imageWidth = containerWidth;
      imageHeight = imageWidth / cameraAspectRatio;
    } else {
      imageHeight = containerHeight;
      imageWidth = imageHeight * cameraAspectRatio;
    }

    return { width: imageWidth, height: imageHeight };
  }, [containerWidth, selectedCameraConfig]);

  const handleAddCamera = useCallback(
    (cameraName: string) => {
      // Calculate a square crop in pixel space
      const camera = config?.cameras[cameraName];
      if (!camera) return;

      const cameraAspect = camera.detect.width / camera.detect.height;
      const cropSize = 0.3;
      let x1, y1, x2, y2;

      if (cameraAspect >= 1) {
        const pixelSize = cropSize * camera.detect.height;
        const normalizedWidth = pixelSize / camera.detect.width;
        x1 = (1 - normalizedWidth) / 2;
        y1 = (1 - cropSize) / 2;
        x2 = x1 + normalizedWidth;
        y2 = y1 + cropSize;
      } else {
        const pixelSize = cropSize * camera.detect.width;
        const normalizedHeight = pixelSize / camera.detect.height;
        x1 = (1 - cropSize) / 2;
        y1 = (1 - normalizedHeight) / 2;
        x2 = x1 + cropSize;
        y2 = y1 + normalizedHeight;
      }

      const newArea: CameraAreaConfig = {
        camera: cameraName,
        crop: [x1, y1, x2, y2],
      };
      setCameraAreas([...cameraAreas, newArea]);
      setSelectedCameraIndex(cameraAreas.length);
      setIsPopoverOpen(false);
    },
    [cameraAreas, config],
  );

  const handleRemoveCamera = useCallback(
    (index: number) => {
      const newAreas = cameraAreas.filter((_, i) => i !== index);
      setCameraAreas(newAreas);
      if (selectedCameraIndex >= newAreas.length) {
        setSelectedCameraIndex(Math.max(0, newAreas.length - 1));
      }
    },
    [cameraAreas, selectedCameraIndex],
  );

  const handleCropChange = useCallback(
    (crop: [number, number, number, number]) => {
      const newAreas = [...cameraAreas];
      newAreas[selectedCameraIndex] = {
        ...newAreas[selectedCameraIndex],
        crop,
      };
      setCameraAreas(newAreas);
    },
    [cameraAreas, selectedCameraIndex],
  );

  useEffect(() => {
    setImageLoaded(false);
  }, [selectedCamera]);

  useEffect(() => {
    const rect = rectRef.current;
    const transformer = transformerRef.current;

    if (
      rect &&
      transformer &&
      selectedCamera &&
      imageSize.width > 0 &&
      imageLoaded
    ) {
      rect.scaleX(1);
      rect.scaleY(1);
      transformer.nodes([rect]);
      transformer.getLayer()?.batchDraw();
    }
  }, [selectedCamera, imageSize, imageLoaded]);

  const handleRectChange = useCallback(() => {
    const rect = rectRef.current;

    if (rect && imageSize.width > 0) {
      const actualWidth = rect.width() * rect.scaleX();
      const actualHeight = rect.height() * rect.scaleY();

      // Average dimensions to maintain perfect square
      const size = (actualWidth + actualHeight) / 2;

      rect.width(size);
      rect.height(size);
      rect.scaleX(1);
      rect.scaleY(1);

      const x1 = rect.x() / imageSize.width;
      const y1 = rect.y() / imageSize.height;
      const x2 = (rect.x() + size) / imageSize.width;
      const y2 = (rect.y() + size) / imageSize.height;

      handleCropChange([x1, y1, x2, y2]);
    }
  }, [imageSize, handleCropChange]);

  const handleContinue = useCallback(() => {
    onNext({ cameraAreas });
  }, [cameraAreas, onNext]);

  const canContinue = cameraAreas.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "flex gap-4 overflow-hidden",
          isMobile ? "flex-col" : "flex-row",
        )}
      >
        <div
          className={cn(
            "flex flex-shrink-0 flex-col gap-2 overflow-y-auto rounded-lg bg-secondary p-4",
            isMobile ? "w-full" : "w-64",
          )}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{t("wizard.step2.cameras")}</h3>
            {availableCameras.length > 0 ? (
              <Popover
                open={isPopoverOpen}
                onOpenChange={setIsPopoverOpen}
                modal={true}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="size-6 rounded-md bg-secondary-foreground p-1 text-background"
                    aria-label="Add camera"
                  >
                    <LuPlus />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="scrollbar-container w-64 border bg-background p-3 shadow-lg"
                  align="start"
                  sideOffset={5}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="flex flex-col gap-2">
                    <Heading as="h4" className="text-sm text-primary-variant">
                      {t("wizard.step2.selectCamera")}
                    </Heading>
                    <div className="scrollbar-container flex max-h-[30vh] flex-col gap-1 overflow-y-auto">
                      {availableCameras.map((cam) => (
                        <Button
                          key={cam.name}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto justify-start p-2 capitalize text-primary"
                          onClick={() => {
                            handleAddCamera(cam.name);
                          }}
                        >
                          {cam.displayName}
                        </Button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Button
                variant="secondary"
                className="size-6 cursor-not-allowed rounded-md bg-muted p-1 text-muted-foreground"
                disabled
              >
                <LuPlus />
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-1">
            {cameraAreas.map((area, index) => {
              const isSelected = index === selectedCameraIndex;
              const displayName = resolveCameraName(config, area.camera);

              return (
                <div
                  key={area.camera}
                  className={`flex items-center justify-between rounded-md p-2 ${
                    isSelected
                      ? "bg-selected/20 ring-1 ring-selected"
                      : "hover:bg-secondary/50"
                  } cursor-pointer`}
                  onClick={() => setSelectedCameraIndex(index)}
                >
                  <span className="text-sm capitalize">{displayName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCamera(index);
                    }}
                  >
                    <LuX className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {cameraAreas.length === 0 && (
            <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
              {t("wizard.step2.noCameras")}
            </div>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center overflow-hidden rounded-lg p-4">
          <div
            ref={containerRef}
            className="flex items-center justify-center"
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              maxHeight: "100%",
            }}
          >
            {selectedCamera && selectedCameraConfig && imageSize.width > 0 ? (
              <div
                style={{
                  width: imageSize.width,
                  height: imageSize.height,
                  position: "relative",
                }}
              >
                <img
                  ref={imageRef}
                  src={`${apiHost}api/${selectedCamera.camera}/latest.jpg?h=500`}
                  alt={resolveCameraName(config, selectedCamera.camera)}
                  className="h-full w-full object-contain"
                  onLoad={() => setImageLoaded(true)}
                />
                <Stage
                  ref={stageRef}
                  width={imageSize.width}
                  height={imageSize.height}
                  className="absolute inset-0"
                >
                  <Layer>
                    <Rect
                      ref={rectRef}
                      x={selectedCamera.crop[0] * imageSize.width}
                      y={selectedCamera.crop[1] * imageSize.height}
                      width={
                        (selectedCamera.crop[2] - selectedCamera.crop[0]) *
                        imageSize.width
                      }
                      height={
                        (selectedCamera.crop[3] - selectedCamera.crop[1]) *
                        imageSize.height
                      }
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="rgba(59, 130, 246, 0.1)"
                      draggable
                      dragBoundFunc={(pos) => {
                        const rect = rectRef.current;
                        if (!rect) return pos;

                        const size = rect.width();
                        const x = Math.max(
                          0,
                          Math.min(pos.x, imageSize.width - size),
                        );
                        const y = Math.max(
                          0,
                          Math.min(pos.y, imageSize.height - size),
                        );

                        return { x, y };
                      }}
                      onDragEnd={handleRectChange}
                      onTransformEnd={handleRectChange}
                    />
                    <Transformer
                      ref={transformerRef}
                      rotateEnabled={false}
                      enabledAnchors={[
                        "top-left",
                        "top-right",
                        "bottom-left",
                        "bottom-right",
                      ]}
                      boundBoxFunc={(_oldBox, newBox) => {
                        const minSize = 50;
                        const maxSize = Math.min(
                          imageSize.width,
                          imageSize.height,
                        );

                        // Clamp dimensions to stage bounds first
                        const clampedWidth = Math.max(
                          minSize,
                          Math.min(newBox.width, maxSize),
                        );
                        const clampedHeight = Math.max(
                          minSize,
                          Math.min(newBox.height, maxSize),
                        );

                        // Enforce square using average
                        const size = (clampedWidth + clampedHeight) / 2;

                        // Clamp position to keep square within bounds
                        const x = Math.max(
                          0,
                          Math.min(newBox.x, imageSize.width - size),
                        );
                        const y = Math.max(
                          0,
                          Math.min(newBox.y, imageSize.height - size),
                        );

                        return {
                          ...newBox,
                          x,
                          y,
                          width: size,
                          height: size,
                        };
                      }}
                    />
                  </Layer>
                </Stage>
              </div>
            ) : (
              <div className="flex items-center justify-center text-muted-foreground">
                {t("wizard.step2.selectCameraPrompt")}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:justify-end sm:gap-4">
        <Button type="button" onClick={onBack} className="sm:flex-1">
          {t("button.back", { ns: "common" })}
        </Button>
        <Button
          type="button"
          onClick={handleContinue}
          variant="select"
          className="flex items-center justify-center gap-2 sm:flex-1"
          disabled={!canContinue}
        >
          {t("button.continue", { ns: "common" })}
        </Button>
      </div>
    </div>
  );
}
