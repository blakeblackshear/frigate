import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
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
import { ProfileState } from "@/types/profile";
type MasksAndZoneViewProps = {
  selectedCamera: string;
  selectedZoneMask?: PolygonType[];
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  profileState?: ProfileState;
};

export default function MasksAndZonesView({
  selectedCamera,
  selectedZoneMask,
  setUnsavedChanges,
  profileState,
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
  const editPaneRef = useRef(editPane);
  editPaneRef.current = editPane;
  const prevScaledRef = useRef<{ w: number; h: number } | null>(null);
  const [activeLine, setActiveLine] = useState<number | undefined>();
  const [snapPoints, setSnapPoints] = useState(false);

  // Profile state
  const currentEditingProfile =
    profileState?.editingProfile[selectedCamera] ?? null;

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

  // Helper to dim colors for base polygons in profile mode
  const dimColor = useCallback(
    (color: number[]): number[] => {
      if (!currentEditingProfile) return color;
      return color.map((c) => Math.round(c * 0.4 + 153 * 0.6));
    },
    [currentEditingProfile],
  );

  useEffect(() => {
    if (cameraConfig && containerRef.current && scaledWidth && scaledHeight) {
      const profileData = currentEditingProfile
        ? cameraConfig.profiles?.[currentEditingProfile]
        : undefined;

      // When a profile is active, the top-level sections contain
      // effective (profile-merged) values.  Use base_config for the
      // original base values so the "Base Config" view is accurate and
      // the base layer for profile merging is correct.
      const baseMotion = (cameraConfig.base_config?.motion ??
        cameraConfig.motion) as typeof cameraConfig.motion;
      const baseObjects = (cameraConfig.base_config?.objects ??
        cameraConfig.objects) as typeof cameraConfig.objects;
      const baseZones = (cameraConfig.base_config?.zones ??
        cameraConfig.zones) as typeof cameraConfig.zones;

      // Build base zone names set for source tracking
      const baseZoneNames = new Set(Object.keys(baseZones));
      const profileZoneNames = new Set(Object.keys(profileData?.zones ?? {}));
      const baseMotionMaskNames = new Set(Object.keys(baseMotion.mask || {}));
      const profileMotionMaskNames = new Set(
        Object.keys(profileData?.motion?.mask ?? {}),
      );
      const baseGlobalObjectMaskNames = new Set(
        Object.keys(baseObjects.mask || {}),
      );
      const profileGlobalObjectMaskNames = new Set(
        Object.keys(profileData?.objects?.mask ?? {}),
      );

      // Merge zones: profile zones override base zones with same name
      const mergedZones = new Map<
        string,
        {
          data: CameraConfig["zones"][string];
          source: "base" | "profile" | "override";
        }
      >();

      for (const [name, zoneData] of Object.entries(baseZones)) {
        if (currentEditingProfile && profileZoneNames.has(name)) {
          // Profile overrides this base zone
          mergedZones.set(name, {
            data: profileData!.zones![name]!,
            source: "override",
          });
        } else {
          mergedZones.set(name, {
            data: zoneData,
            source: currentEditingProfile ? "base" : "base",
          });
        }
      }

      // Add profile-only zones
      if (profileData?.zones) {
        for (const [name, zoneData] of Object.entries(profileData.zones)) {
          if (!baseZoneNames.has(name)) {
            mergedZones.set(name, { data: zoneData!, source: "profile" });
          }
        }
      }

      let zoneIndex = 0;
      const zones: Polygon[] = [];
      for (const [name, { data: zoneData, source }] of mergedZones) {
        const isBase = source === "base" && !!currentEditingProfile;
        const baseColor =
          zoneData.color ?? baseZones[name]?.color ?? [128, 128, 0];
        zones.push({
          type: "zone" as PolygonType,
          typeIndex: zoneIndex,
          camera: cameraConfig.name,
          name,
          friendly_name: zoneData.friendly_name,
          enabled: zoneData.enabled,
          enabled_in_config: zoneData.enabled_in_config,
          objects: zoneData.objects ?? [],
          points: interpolatePoints(
            parseCoordinates(zoneData.coordinates),
            1,
            1,
            scaledWidth,
            scaledHeight,
          ),
          distances:
            zoneData.distances?.map((distance: string) =>
              parseFloat(distance),
            ) ?? [],
          isFinished: true,
          color: isBase ? dimColor(baseColor) : baseColor,
          polygonSource: currentEditingProfile ? source : undefined,
        });
        zoneIndex++;
      }

      // Merge motion masks
      const mergedMotionMasks = new Map<
        string,
        {
          data: CameraConfig["motion"]["mask"][string];
          source: "base" | "profile" | "override";
        }
      >();

      for (const [maskId, maskData] of Object.entries(baseMotion.mask || {})) {
        if (currentEditingProfile && profileMotionMaskNames.has(maskId)) {
          mergedMotionMasks.set(maskId, {
            data: profileData!.motion!.mask![maskId],
            source: "override",
          });
        } else {
          mergedMotionMasks.set(maskId, {
            data: maskData,
            source: currentEditingProfile ? "base" : "base",
          });
        }
      }

      if (profileData?.motion?.mask) {
        for (const [maskId, maskData] of Object.entries(
          profileData.motion.mask,
        )) {
          if (!baseMotionMaskNames.has(maskId)) {
            mergedMotionMasks.set(maskId, {
              data: maskData,
              source: "profile",
            });
          }
        }
      }

      let motionMaskIndex = 0;
      const motionMasks: Polygon[] = [];
      for (const [maskId, { data: maskData, source }] of mergedMotionMasks) {
        const isBase = source === "base" && !!currentEditingProfile;
        const baseColor = [0, 0, 255];
        motionMasks.push({
          type: "motion_mask" as PolygonType,
          typeIndex: motionMaskIndex,
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
          color: isBase ? dimColor(baseColor) : baseColor,
          polygonSource: currentEditingProfile ? source : undefined,
        });
        motionMaskIndex++;
      }

      // Merge global object masks
      const mergedGlobalObjectMasks = new Map<
        string,
        {
          data: CameraConfig["objects"]["mask"][string];
          source: "base" | "profile" | "override";
        }
      >();

      for (const [maskId, maskData] of Object.entries(baseObjects.mask || {})) {
        if (currentEditingProfile && profileGlobalObjectMaskNames.has(maskId)) {
          mergedGlobalObjectMasks.set(maskId, {
            data: profileData!.objects!.mask![maskId],
            source: "override",
          });
        } else {
          mergedGlobalObjectMasks.set(maskId, {
            data: maskData,
            source: currentEditingProfile ? "base" : "base",
          });
        }
      }

      if (profileData?.objects?.mask) {
        for (const [maskId, maskData] of Object.entries(
          profileData.objects.mask,
        )) {
          if (!baseGlobalObjectMaskNames.has(maskId)) {
            mergedGlobalObjectMasks.set(maskId, {
              data: maskData,
              source: "profile",
            });
          }
        }
      }

      let objectMaskIndex = 0;
      const globalObjectMasks: Polygon[] = [];
      for (const [
        maskId,
        { data: maskData, source },
      ] of mergedGlobalObjectMasks) {
        const isBase = source === "base" && !!currentEditingProfile;
        const baseColor = [128, 128, 128];
        globalObjectMasks.push({
          type: "object_mask" as PolygonType,
          typeIndex: objectMaskIndex,
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
          color: isBase ? dimColor(baseColor) : baseColor,
          polygonSource: currentEditingProfile ? source : undefined,
        });
        objectMaskIndex++;
      }

      objectMaskIndex = globalObjectMasks.length;

      // Build per-object filter mask names for profile tracking
      const baseFilterMaskNames = new Set<string>();
      for (const [, filterConfig] of Object.entries(
        baseObjects.filters || {},
      )) {
        for (const maskId of Object.keys(filterConfig.mask || {})) {
          if (!maskId.startsWith("global_")) {
            baseFilterMaskNames.add(maskId);
          }
        }
      }

      const profileFilterMaskNames = new Set<string>();
      if (profileData?.objects?.filters) {
        for (const [, filterConfig] of Object.entries(
          profileData.objects.filters,
        )) {
          if (filterConfig?.mask) {
            for (const maskId of Object.keys(filterConfig.mask)) {
              profileFilterMaskNames.add(maskId);
            }
          }
        }
      }

      // Per-object filter masks (base)
      const objectMasks: Polygon[] = Object.entries(baseObjects.filters || {})
        .filter(
          ([, filterConfig]) =>
            filterConfig.mask && Object.keys(filterConfig.mask).length > 0,
        )
        .flatMap(([objectName, filterConfig]): Polygon[] => {
          return Object.entries(filterConfig.mask || {}).flatMap(
            ([maskId, maskData]) => {
              if (maskId.startsWith("global_")) {
                return [];
              }

              const source: "base" | "override" = currentEditingProfile
                ? profileFilterMaskNames.has(maskId)
                  ? "override"
                  : "base"
                : "base";
              const isBase = source === "base" && !!currentEditingProfile;

              // If override, use profile data
              const finalData =
                source === "override" && profileData?.objects?.filters
                  ? (profileData.objects.filters[objectName]?.mask?.[maskId] ??
                    maskData)
                  : maskData;

              const baseColor = [128, 128, 128];
              const newMask: Polygon = {
                type: "object_mask" as PolygonType,
                typeIndex: objectMaskIndex,
                camera: cameraConfig.name,
                name: maskId,
                friendly_name: finalData.friendly_name,
                enabled: finalData.enabled,
                enabled_in_config: finalData.enabled_in_config,
                objects: [objectName],
                points: interpolatePoints(
                  parseCoordinates(finalData.coordinates),
                  1,
                  1,
                  scaledWidth,
                  scaledHeight,
                ),
                distances: [],
                isFinished: true,
                color: isBase ? dimColor(baseColor) : baseColor,
                polygonSource: currentEditingProfile ? source : undefined,
              };
              objectMaskIndex++;
              return [newMask];
            },
          );
        });

      // Add profile-only per-object filter masks
      if (profileData?.objects?.filters) {
        for (const [objectName, filterConfig] of Object.entries(
          profileData.objects.filters,
        )) {
          if (filterConfig?.mask) {
            for (const [maskId, maskData] of Object.entries(
              filterConfig.mask,
            )) {
              if (!baseFilterMaskNames.has(maskId) && maskData) {
                const baseColor = [128, 128, 128];
                objectMasks.push({
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
                  color: baseColor,
                  polygonSource: "profile",
                });
                objectMaskIndex++;
              }
            }
          }
        }
      }

      setAllPolygons([
        ...zones,
        ...motionMasks,
        ...globalObjectMasks,
        ...objectMasks,
      ]);
      // Don't overwrite editingPolygons during editing – layout shifts
      // from switching to the edit pane can trigger a resize which
      // recalculates scaledWidth/scaledHeight and would discard the
      // newly-added polygon. Instead, rescale existing points
      // proportionally.
      if (editPaneRef.current === undefined) {
        setEditingPolygons([
          ...zones,
          ...motionMasks,
          ...globalObjectMasks,
          ...objectMasks,
        ]);
      } else if (
        prevScaledRef.current &&
        (prevScaledRef.current.w !== scaledWidth ||
          prevScaledRef.current.h !== scaledHeight)
      ) {
        const prevW = prevScaledRef.current.w;
        const prevH = prevScaledRef.current.h;
        setEditingPolygons((prev) =>
          prev.map((poly) => ({
            ...poly,
            points: poly.points.map(([x, y]) => [
              (x / prevW) * scaledWidth,
              (y / prevH) * scaledHeight,
            ]),
          })),
        );
      }
      prevScaledRef.current = { w: scaledWidth, h: scaledHeight };
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cameraConfig,
    containerRef,
    scaledHeight,
    scaledWidth,
    currentEditingProfile,
    dimColor,
  ]);

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

  // Cancel editing when profile selection changes
  useEffect(() => {
    if (editPaneRef.current !== undefined) {
      handleCancel();
    }
    // we only want to react to profile changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEditingProfile]);

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
          <div className="scrollbar-container order-last mb-2 mt-2 flex h-full w-full flex-col overflow-y-auto rounded-lg border-[1px] border-secondary-foreground bg-background_alt p-2 md:order-none md:mr-3 md:mt-0 md:w-3/12 md:min-w-0 md:shrink-0">
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
                editingProfile={currentEditingProfile}
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
                editingProfile={currentEditingProfile}
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
                editingProfile={currentEditingProfile}
              />
            )}
            {editPane === undefined && (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <Heading as="h4">{t("menu.masksAndZones")}</Heading>
                </div>
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
                            editingProfile={currentEditingProfile}
                            allProfileNames={profileState?.allProfileNames}
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
                            editingProfile={currentEditingProfile}
                            allProfileNames={profileState?.allProfileNames}
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
                            editingProfile={currentEditingProfile}
                            allProfileNames={profileState?.allProfileNames}
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
              "flex max-h-[50%] min-w-0 md:h-dvh md:max-h-full md:w-7/12 md:grow",
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
