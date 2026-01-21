import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PolygonCanvas } from "@/components/settings/PolygonCanvas";
import { Polygon, PolygonType } from "@/types/canvas";
import { interpolatePoints, parseCoordinates } from "@/utils/canvasUtil";
import { Skeleton } from "@/components/ui/skeleton";
import { useResizeObserver } from "@/hooks/resize-observer";
import { LuExternalLink, LuPlus } from "react-icons/lu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import copy from "copy-to-clipboard";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Heading from "@/components/ui/heading";
import ZoneEditPane from "@/components/settings/ZoneEditPane";
import MotionMaskEditPane from "@/components/settings/MotionMaskEditPane";
import ObjectMaskEditPane from "@/components/settings/ObjectMaskEditPane";
import PolygonItem from "@/components/settings/PolygonItem";
import { Link } from "react-router-dom";
import { isDesktop } from "react-device-detect";

import { useSearchEffect } from "@/hooks/use-overlay-state";
import { useTranslation } from "react-i18next";

import { useDocDomain } from "@/hooks/use-doc-domain";
import { cn } from "@/lib/utils";

type MasksAndZoneViewProps = {
  selectedCamera: string;
  selectedZoneMask?: PolygonType[];
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function MasksAndZonesView({
  selectedCamera,
  selectedZoneMask,
  setUnsavedChanges,
}: MasksAndZoneViewProps) {
  const { t } = useTranslation(["views/settings"]);
  const { getLocaleDocUrl } = useDocDomain();
  const { data: config } = useSWR<FrigateConfig>("config");
  const [allPolygons, setAllPolygons] = useState<Polygon[]>([]);
  const [editingPolygons, setEditingPolygons] = useState<Polygon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPolygonIndex, setLoadingPolygonIndex] = useState<
    number | undefined
  >(undefined);
  const [activePolygonIndex, setActivePolygonIndex] = useState<
    number | undefined
  >(undefined);
  const [hoveredPolygonIndex, setHoveredPolygonIndex] = useState<number | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [editPane, setEditPane] = useState<PolygonType | undefined>(undefined);
  const [activeLine, setActiveLine] = useState<number | undefined>();
  const [snapPoints, setSnapPoints] = useState(false);

  const cameraConfig = useMemo(() => {
    if (config && selectedCamera) {
      return config.cameras[selectedCamera];
    }
  }, [config, selectedCamera]);

  const [{ width: containerWidth, height: containerHeight }] =
    useResizeObserver(containerRef);

  const aspectRatio = useMemo(() => {
    if (!config) {
      return undefined;
    }

    const camera = config.cameras[selectedCamera];

    if (!camera) {
      return undefined;
    }

    return camera.detect.width / camera.detect.height;
  }, [config, selectedCamera]);

  const detectHeight = useMemo(() => {
    if (!config) {
      return undefined;
    }

    const camera = config.cameras[selectedCamera];

    if (!camera) {
      return undefined;
    }

    return camera.detect.height;
  }, [config, selectedCamera]);

  const stretch = true;

  const fitAspect = useMemo(
    () => (isDesktop ? containerWidth / containerHeight : 3 / 4),
    [containerWidth, containerHeight],
  );

  const scaledHeight = useMemo(() => {
    if (containerRef.current && aspectRatio && detectHeight) {
      const scaledHeight =
        aspectRatio < (fitAspect ?? 0)
          ? Math.floor(
              Math.min(containerHeight, containerRef.current?.clientHeight),
            )
          : isDesktop || aspectRatio > fitAspect
            ? Math.floor(containerWidth / aspectRatio)
            : Math.floor(containerWidth / aspectRatio) / 1.5;
      const finalHeight = stretch
        ? scaledHeight
        : Math.min(scaledHeight, detectHeight);

      if (finalHeight > 0) {
        return finalHeight;
      }
    }
  }, [
    aspectRatio,
    containerWidth,
    containerHeight,
    fitAspect,
    detectHeight,
    stretch,
  ]);

  const scaledWidth = useMemo(() => {
    if (aspectRatio && scaledHeight) {
      return Math.ceil(scaledHeight * aspectRatio);
    }
  }, [scaledHeight, aspectRatio]);

  const handleNewPolygon = (type: PolygonType, coordinates?: number[][]) => {
    if (!cameraConfig) {
      return;
    }

    setActivePolygonIndex(allPolygons.length);

    let polygonColor = [128, 128, 0];

    if (type == "motion_mask") {
      polygonColor = [0, 0, 220];
    }
    if (type == "object_mask") {
      polygonColor = [128, 128, 128];
    }

    setEditingPolygons([
      ...(allPolygons || []),
      {
        points: coordinates ?? [],
        distances: [],
        isFinished: coordinates ? true : false,
        type,
        typeIndex: 9999,
        name: "",
        objects: [],
        camera: selectedCamera,
        color: polygonColor,
        enabled: true,
      },
    ]);
  };

  const handleCancel = useCallback(() => {
    setEditPane(undefined);
    setEditingPolygons([...allPolygons]);
    setActivePolygonIndex(undefined);
    setHoveredPolygonIndex(null);
    setUnsavedChanges(false);
    document.title = t("documentTitle.masksAndZones");
  }, [allPolygons, setUnsavedChanges, t]);

  const handleSave = useCallback(() => {
    setAllPolygons([...(editingPolygons ?? [])]);
    setHoveredPolygonIndex(null);
    setUnsavedChanges(false);
  }, [editingPolygons, setUnsavedChanges]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!isLoading && editPane !== undefined) {
      setActivePolygonIndex(undefined);
      setEditPane(undefined);
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const handleCopyCoordinates = useCallback(
    (index: number) => {
      if (allPolygons && scaledWidth && scaledHeight) {
        const poly = allPolygons[index];
        copy(
          interpolatePoints(poly.points, scaledWidth, scaledHeight, 1, 1)
            .map((point) => `${point[0]},${point[1]}`)
            .join(","),
        );
        toast.success(
          t("masksAndZones.toast.success.copyCoordinates", {
            polyName: poly.name,
          }),
        );
      } else {
        toast.error(t("masksAndZones.toast.error.copyCoordinatesFailed"));
      }
    },
    [allPolygons, scaledHeight, scaledWidth, t],
  );

  useEffect(() => {
    if (cameraConfig && containerRef.current && scaledWidth && scaledHeight) {
      const zones = Object.entries(cameraConfig.zones).map(
        ([name, zoneData], index) => ({
          type: "zone" as PolygonType,
          typeIndex: index,
          camera: cameraConfig.name,
          name,
          friendly_name: zoneData.friendly_name,
          enabled: zoneData.enabled,
          enabled_in_config: zoneData.enabled_in_config,
          objects: zoneData.objects,
          points: interpolatePoints(
            parseCoordinates(zoneData.coordinates),
            1,
            1,
            scaledWidth,
            scaledHeight,
          ),
          distances:
            zoneData.distances?.map((distance) => parseFloat(distance)) ?? [],
          isFinished: true,
          color: zoneData.color,
        }),
      );

      let motionMasks: Polygon[] = [];
      let globalObjectMasks: Polygon[] = [];
      let objectMasks: Polygon[] = [];

      // Motion masks are a dict with mask_id as key
      motionMasks = Object.entries(cameraConfig.motion.mask || {}).map(
        ([maskId, maskData], index) => ({
          type: "motion_mask" as PolygonType,
          typeIndex: index,
          camera: cameraConfig.name,
          name: maskId,
          friendly_name: maskData.friendly_name,
          enabled: maskData.enabled,
          enabled_in_config: maskData.enabled_in_config,
          objects: [],
          points: interpolatePoints(
            parseCoordinates(maskData.coordinates),
            1,
            1,
            scaledWidth,
            scaledHeight,
          ),
          distances: [],
          isFinished: true,
          color: [0, 0, 255],
        }),
      );

      // Global object masks are a dict with mask_id as key
      globalObjectMasks = Object.entries(cameraConfig.objects.mask || {}).map(
        ([maskId, maskData], index) => ({
          type: "object_mask" as PolygonType,
          typeIndex: index,
          camera: cameraConfig.name,
          name: maskId,
          friendly_name: maskData.friendly_name,
          enabled: maskData.enabled,
          enabled_in_config: maskData.enabled_in_config,
          objects: [],
          points: interpolatePoints(
            parseCoordinates(maskData.coordinates),
            1,
            1,
            scaledWidth,
            scaledHeight,
          ),
          distances: [],
          isFinished: true,
          color: [128, 128, 128],
        }),
      );

      let objectMaskIndex = globalObjectMasks.length;

      objectMasks = Object.entries(cameraConfig.objects.filters)
        .filter(
          ([, filterConfig]) =>
            filterConfig.mask && Object.keys(filterConfig.mask).length > 0,
        )
        .flatMap(([objectName, filterConfig]): Polygon[] => {
          return Object.entries(filterConfig.mask || {}).flatMap(
            ([maskId, maskData]) => {
              // Skip if this mask is a global mask (prefixed with "global_")
              if (maskId.startsWith("global_")) {
                return [];
              }

              const newMask = {
                type: "object_mask" as PolygonType,
                typeIndex: objectMaskIndex,
                camera: cameraConfig.name,
                name: maskId,
                friendly_name: maskData.friendly_name,
                enabled: maskData.enabled,
                enabled_in_config: maskData.enabled_in_config,
                objects: [objectName],
                points: interpolatePoints(
                  parseCoordinates(maskData.coordinates),
                  1,
                  1,
                  scaledWidth,
                  scaledHeight,
                ),
                distances: [],
                isFinished: true,
                color: [128, 128, 128],
              };
              objectMaskIndex++;
              return [newMask];
            },
          );
        });

      setAllPolygons([
        ...zones,
        ...motionMasks,
        ...globalObjectMasks,
        ...objectMasks,
      ]);
      setEditingPolygons([
        ...zones,
        ...motionMasks,
        ...globalObjectMasks,
        ...objectMasks,
      ]);
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraConfig, containerRef, scaledHeight, scaledWidth]);

  useEffect(() => {
    if (editPane === undefined) {
      setEditingPolygons([...allPolygons]);
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setEditingPolygons, allPolygons]);

  useEffect(() => {
    if (selectedCamera) {
      setActivePolygonIndex(undefined);
      setEditPane(undefined);
    }
  }, [selectedCamera]);

  useSearchEffect("object_mask", (coordinates: string) => {
    if (!scaledWidth || !scaledHeight || isLoading) {
      return false;
    }
    // convert box points string to points array
    const points = coordinates.split(",").map((p) => parseFloat(p));

    const [x1, y1, w, h] = points;

    // bottom center
    const centerX = x1 + w / 2;
    const bottomY = y1 + h;

    const centerXAbs = centerX * scaledWidth;
    const bottomYAbs = bottomY * scaledHeight;

    // padding and clamp
    const minPadding = 0.1 * w * scaledWidth;
    const maxPadding = 0.3 * w * scaledWidth;
    const padding = Math.min(
      Math.max(minPadding, 0.15 * w * scaledWidth),
      maxPadding,
    );

    const top = Math.max(0, bottomYAbs - padding);
    const bottom = Math.min(scaledHeight, bottomYAbs + padding);
    const left = Math.max(0, centerXAbs - padding);
    const right = Math.min(scaledWidth, centerXAbs + padding);

    const paddedBox = [
      [left, top],
      [right, top],
      [right, bottom],
      [left, bottom],
    ];

    setEditPane("object_mask");
    setActivePolygonIndex(undefined);
    handleNewPolygon("object_mask", paddedBox);
    return true;
  });

  useEffect(() => {
    document.title = t("documentTitle.masksAndZones");
  }, [t]);

  if (!cameraConfig && !selectedCamera) {
    return <ActivityIndicator />;
  }

  return (
    <>
      {cameraConfig && editingPolygons && (
        <div className="flex size-full flex-col md:flex-row">
          <Toaster position="top-center" closeButton={true} />
          <div className="scrollbar-container order-last mb-2 mt-2 flex h-full w-full flex-col overflow-y-auto rounded-lg border-[1px] border-secondary-foreground bg-background_alt p-2 md:order-none md:mr-3 md:mt-0 md:w-3/12">
            {editPane == "zone" && (
              <ZoneEditPane
                polygons={editingPolygons}
                setPolygons={setEditingPolygons}
                activePolygonIndex={activePolygonIndex}
                scaledWidth={scaledWidth}
                scaledHeight={scaledHeight}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                onCancel={handleCancel}
                onSave={handleSave}
                setActiveLine={setActiveLine}
                snapPoints={snapPoints}
                setSnapPoints={setSnapPoints}
              />
            )}
            {editPane == "motion_mask" && (
              <MotionMaskEditPane
                polygons={editingPolygons}
                setPolygons={setEditingPolygons}
                activePolygonIndex={activePolygonIndex}
                scaledWidth={scaledWidth}
                scaledHeight={scaledHeight}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                onCancel={handleCancel}
                onSave={handleSave}
                snapPoints={snapPoints}
                setSnapPoints={setSnapPoints}
              />
            )}
            {editPane == "object_mask" && (
              <ObjectMaskEditPane
                polygons={editingPolygons}
                setPolygons={setEditingPolygons}
                activePolygonIndex={activePolygonIndex}
                scaledWidth={scaledWidth}
                scaledHeight={scaledHeight}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                onCancel={handleCancel}
                onSave={handleSave}
                snapPoints={snapPoints}
                setSnapPoints={setSnapPoints}
              />
            )}
            {editPane === undefined && (
              <>
                <Heading as="h4" className="mb-2">
                  {t("menu.masksAndZones")}
                </Heading>
                <div className="flex w-full flex-col">
                  {(selectedZoneMask === undefined ||
                    selectedZoneMask.includes("zone" as PolygonType)) && (
                    <div className="mt-0 pt-0 last:border-b-[1px] last:border-secondary last:pb-3">
                      <div className="my-3 flex flex-row items-center justify-between">
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <div className="text-md cursor-default">
                              {t("masksAndZones.zones.label")}
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent>
                            <div className="my-2 flex flex-col gap-2 text-sm text-primary-variant">
                              <p>{t("masksAndZones.zones.desc.title")}</p>
                              <div className="flex items-center text-primary">
                                <Link
                                  to={getLocaleDocUrl("configuration/zones")}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline"
                                >
                                  {t("readTheDocumentation", { ns: "common" })}
                                  <LuExternalLink className="ml-2 inline-flex size-3" />
                                </Link>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="secondary"
                              className="size-6 rounded-md bg-secondary-foreground p-1 text-background"
                              aria-label={t("masksAndZones.zones.add")}
                              onClick={() => {
                                setEditPane("zone");
                                handleNewPolygon("zone");
                              }}
                            >
                              <LuPlus />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("masksAndZones.zones.add")}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      {allPolygons
                        .flatMap((polygon, index) =>
                          polygon.type === "zone" ? [{ polygon, index }] : [],
                        )
                        .map(({ polygon, index }) => (
                          <PolygonItem
                            key={index}
                            polygon={polygon}
                            index={index}
                            hoveredPolygonIndex={hoveredPolygonIndex}
                            setHoveredPolygonIndex={setHoveredPolygonIndex}
                            setActivePolygonIndex={setActivePolygonIndex}
                            setEditPane={setEditPane}
                            handleCopyCoordinates={handleCopyCoordinates}
                            isLoading={isLoading}
                            setIsLoading={setIsLoading}
                            loadingPolygonIndex={loadingPolygonIndex}
                            setLoadingPolygonIndex={setLoadingPolygonIndex}
                          />
                        ))}
                    </div>
                  )}
                  {(selectedZoneMask === undefined ||
                    selectedZoneMask.includes(
                      "motion_mask" as PolygonType,
                    )) && (
                    <div className="mt-3 border-t-[1px] border-secondary pt-3 first:mt-0 first:border-transparent first:pt-0 last:border-b-[1px] last:pb-3">
                      <div className="my-3 flex flex-row items-center justify-between">
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <div className="text-md cursor-default">
                              {t("masksAndZones.motionMasks.label")}
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent>
                            <div className="my-2 flex flex-col gap-2 text-sm text-primary-variant">
                              <p>{t("masksAndZones.motionMasks.desc.title")}</p>
                              <div className="flex items-center text-primary">
                                <Link
                                  to={getLocaleDocUrl(
                                    "configuration/masks#motion-masks",
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline"
                                >
                                  {t("readTheDocumentation", { ns: "common" })}
                                  <LuExternalLink className="ml-2 inline-flex size-3" />
                                </Link>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="secondary"
                              className="size-6 rounded-md bg-secondary-foreground p-1 text-background"
                              aria-label={t("masksAndZones.motionMasks.add")}
                              onClick={() => {
                                setEditPane("motion_mask");
                                handleNewPolygon("motion_mask");
                              }}
                            >
                              <LuPlus />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("masksAndZones.motionMasks.add")}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      {allPolygons
                        .flatMap((polygon, index) =>
                          polygon.type === "motion_mask"
                            ? [{ polygon, index }]
                            : [],
                        )
                        .map(({ polygon, index }) => (
                          <PolygonItem
                            key={index}
                            polygon={polygon}
                            index={index}
                            hoveredPolygonIndex={hoveredPolygonIndex}
                            setHoveredPolygonIndex={setHoveredPolygonIndex}
                            setActivePolygonIndex={setActivePolygonIndex}
                            setEditPane={setEditPane}
                            handleCopyCoordinates={handleCopyCoordinates}
                            isLoading={isLoading}
                            setIsLoading={setIsLoading}
                            loadingPolygonIndex={loadingPolygonIndex}
                            setLoadingPolygonIndex={setLoadingPolygonIndex}
                          />
                        ))}
                    </div>
                  )}
                  {(selectedZoneMask === undefined ||
                    selectedZoneMask.includes(
                      "object_mask" as PolygonType,
                    )) && (
                    <div className="mt-3 border-t-[1px] border-secondary pt-3 first:mt-0 first:border-transparent first:pt-0 last:border-b-[1px] last:pb-3">
                      <div className="my-3 flex flex-row items-center justify-between">
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <div className="text-md cursor-default">
                              {t("masksAndZones.objectMasks.label")}
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent>
                            <div className="my-2 flex flex-col gap-2 text-sm text-primary-variant">
                              <p>{t("masksAndZones.objectMasks.desc.title")}</p>
                              <div className="flex items-center text-primary">
                                <Link
                                  to={getLocaleDocUrl(
                                    "configuration/masks#object-filter-masks",
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline"
                                >
                                  {t("readTheDocumentation", { ns: "common" })}
                                  <LuExternalLink className="ml-2 inline-flex size-3" />
                                </Link>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="secondary"
                              className="size-6 rounded-md bg-secondary-foreground p-1 text-background"
                              aria-label={t("masksAndZones.objectMasks.add")}
                              onClick={() => {
                                setEditPane("object_mask");
                                handleNewPolygon("object_mask");
                              }}
                            >
                              <LuPlus />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("masksAndZones.objectMasks.add")}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      {allPolygons
                        .flatMap((polygon, index) =>
                          polygon.type === "object_mask"
                            ? [{ polygon, index }]
                            : [],
                        )
                        .map(({ polygon, index }) => (
                          <PolygonItem
                            key={index}
                            polygon={polygon}
                            index={index}
                            hoveredPolygonIndex={hoveredPolygonIndex}
                            setHoveredPolygonIndex={setHoveredPolygonIndex}
                            setActivePolygonIndex={setActivePolygonIndex}
                            setEditPane={setEditPane}
                            handleCopyCoordinates={handleCopyCoordinates}
                            isLoading={isLoading}
                            setIsLoading={setIsLoading}
                            loadingPolygonIndex={loadingPolygonIndex}
                            setLoadingPolygonIndex={setLoadingPolygonIndex}
                          />
                        ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div
            ref={containerRef}
            className={cn(
              "flex max-h-[50%] md:h-dvh md:max-h-full md:w-7/12 md:grow",
              isDesktop && "md:mr-3",
            )}
          >
            <div className="mx-auto flex size-full flex-row justify-center">
              {cameraConfig &&
              scaledWidth &&
              scaledHeight &&
              editingPolygons ? (
                <PolygonCanvas
                  containerRef={containerRef}
                  camera={cameraConfig.name}
                  width={scaledWidth}
                  height={scaledHeight}
                  polygons={editingPolygons}
                  setPolygons={setEditingPolygons}
                  activePolygonIndex={activePolygonIndex}
                  hoveredPolygonIndex={hoveredPolygonIndex}
                  selectedZoneMask={selectedZoneMask}
                  activeLine={activeLine}
                  snapPoints={snapPoints}
                />
              ) : (
                <Skeleton className="size-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
