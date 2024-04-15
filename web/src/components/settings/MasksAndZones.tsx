import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PolygonCanvas } from "./PolygonCanvas";
import { Polygon, PolygonType } from "@/types/canvas";
import { interpolatePoints } from "@/utils/canvasUtil";
import { Skeleton } from "../ui/skeleton";
import { useResizeObserver } from "@/hooks/resize-observer";
import { LuExternalLink, LuInfo, LuPlus } from "react-icons/lu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import copy from "copy-to-clipboard";
import { toast } from "sonner";
import { Toaster } from "../ui/sonner";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import Heading from "../ui/heading";
import ZoneEditPane from "./ZoneEditPane";
import MotionMaskEditPane from "./MotionMaskEditPane";
import ObjectMaskEditPane from "./ObjectMaskEditPane";
import PolygonItem from "./PolygonItem";
import { Link } from "react-router-dom";

const parseCoordinates = (coordinatesString: string) => {
  const coordinates = coordinatesString.split(",");
  const points = [];

  for (let i = 0; i < coordinates.length; i += 2) {
    const x = parseFloat(coordinates[i]);
    const y = parseFloat(coordinates[i + 1]);
    points.push([x, y]);
  }

  return points;
};

// export type ZoneObjects = {
//   camera: string;
//   zoneName: string;
//   objects: string[];
// };

type MasksAndZoneProps = {
  selectedCamera: string;
  selectedZoneMask?: PolygonType[];
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  unsavedChanges: boolean;
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function MasksAndZones({
  selectedCamera,
  selectedZoneMask,
  isEditing,
  setIsEditing,
  unsavedChanges,
  setUnsavedChanges,
}: MasksAndZoneProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [allPolygons, setAllPolygons] = useState<Polygon[]>([]);
  const [editingPolygons, setEditingPolygons] = useState<Polygon[]>([]);
  // const [zoneObjects, setZoneObjects] = useState<ZoneObjects[]>([]);
  const [activePolygonIndex, setActivePolygonIndex] = useState<
    number | undefined
  >(undefined);
  const [hoveredPolygonIndex, setHoveredPolygonIndex] = useState<number | null>(
    null,
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  // const polygonTypes = [
  //   "zone",
  //   "motion_mask",
  //   "object_mask",
  //   undefined,
  // ] as const;

  // type EditPaneType = (typeof polygonTypes)[number];
  const [editPane, setEditPane] = useState<PolygonType | undefined>(undefined);

  // const cameras = useMemo(() => {
  //   if (!config) {
  //     return [];
  //   }

  //   return Object.values(config.cameras)
  //     .filter((conf) => conf.ui.dashboard && conf.enabled)
  //     .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
  // }, [config]);

  const cameraConfig = useMemo(() => {
    if (config && selectedCamera) {
      return config.cameras[selectedCamera];
    }
  }, [config, selectedCamera]);

  // const saveZoneObjects = useCallback(
  //   (camera: string, zoneName: string, newObjects?: string[]) => {
  //     setZoneObjects((prevZoneObjects) =>
  //       prevZoneObjects.map((zoneObject) => {
  //         if (
  //           zoneObject.camera === camera &&
  //           zoneObject.zoneName === zoneName
  //         ) {
  //           console.log("found", camera, "with", zoneName);
  //           console.log("new objects", newObjects);
  //           console.log("new zoneobject", {
  //             ...zoneObject,
  //             objects: newObjects ?? [],
  //           });
  //           // Replace objects with newObjects if provided
  //           return {
  //             ...zoneObject,
  //             objects: newObjects ?? [],
  //           };
  //         }
  //         return zoneObject; // Keep original object
  //       }),
  //     );
  //   },
  //   [setZoneObjects],
  // );

  // const saveZoneObjects = useCallback(
  //   (camera: string, zoneName: string, objects?: string[]) => {
  //     setZoneObjects((prevZoneObjects) => {
  //       const updatedZoneObjects = prevZoneObjects.map((zoneObject) => {
  //         if (
  //           zoneObject.camera === camera &&
  //           zoneObject.zoneName === zoneName
  //         ) {
  //           return { ...zoneObject, objects: objects || [] };
  //         }
  //         return zoneObject;
  //       });
  //       return updatedZoneObjects;
  //     });
  //   },
  //   [setZoneObjects],
  // );

  const [{ width: containerWidth, height: containerHeight }] =
    useResizeObserver(containerRef);

  // const { width: detectWidth, height: detectHeight } = cameraConfig
  //   ? cameraConfig.detect
  //   : { width: 1, height: 1 };
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
  // TODO: mobile / portrait cams
  const fitAspect = 16 / 9;

  const scaledHeight = useMemo(() => {
    if (containerRef.current && aspectRatio && detectHeight) {
      const scaledHeight =
        aspectRatio < (fitAspect ?? 0)
          ? Math.floor(
              Math.min(containerHeight, containerRef.current?.clientHeight),
            )
          : Math.floor(containerWidth / aspectRatio);
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

  const handleNewPolygon = (type: PolygonType) => {
    if (!cameraConfig) {
      return;
    }

    setActivePolygonIndex(allPolygons.length);
    let polygonName = "";
    let polygonColor = [128, 128, 0];
    if (type == "motion_mask") {
      const count = allPolygons.filter(
        (poly) => poly.type == "motion_mask",
      ).length;
      polygonName = `Motion Mask ${count + 1}`;
      polygonColor = [0, 0, 220];
    }
    if (type == "object_mask") {
      const count = allPolygons.filter(
        (poly) => poly.type == "object_mask",
      ).length;
      polygonName = `Object Mask ${count + 1}`;
      polygonColor = [128, 128, 128];
      // TODO - get this from config object after mutation so label can be set
    }
    setEditingPolygons([
      ...(allPolygons || []),
      {
        points: [],
        isFinished: false,
        isUnsaved: true,
        type,
        name: polygonName,
        objects: [],
        camera: selectedCamera,
        color: polygonColor,
      },
    ]);
  };

  const handleCancel = useCallback(() => {
    // console.log("handling cancel");
    setEditPane(undefined);
    // console.log("all", allPolygons);
    // console.log("editing", editingPolygons);
    // setAllPolygons(allPolygons.filter((poly) => !poly.isUnsaved));
    setEditingPolygons([...allPolygons]);
    setActivePolygonIndex(undefined);
    setHoveredPolygonIndex(null);
  }, [allPolygons]);

  const handleSave = useCallback(() => {
    // console.log("handling save");
    setAllPolygons([...(editingPolygons ?? [])]);
    setActivePolygonIndex(undefined);
    setEditPane(undefined);
    setHoveredPolygonIndex(null);
  }, [editingPolygons]);

  const handleCopyCoordinates = useCallback(
    (index: number) => {
      if (allPolygons && scaledWidth && scaledHeight) {
        const poly = allPolygons[index];
        copy(
          interpolatePoints(poly.points, scaledWidth, scaledHeight, 1, 1)
            .map((point) => `${point[0]},${point[1]}`)
            .join(","),
        );
        toast.success(`Copied coordinates for ${poly.name} to clipboard.`);
      } else {
        toast.error("Could not copy coordinates to clipboard.");
      }
    },
    [allPolygons, scaledHeight, scaledWidth],
  );

  useEffect(() => {}, [editPane]);

  useEffect(() => {
    if (cameraConfig && containerRef.current && scaledWidth && scaledHeight) {
      const zones = Object.entries(cameraConfig.zones).map(
        ([name, zoneData]) => ({
          type: "zone" as PolygonType,
          camera: cameraConfig.name,
          name,
          objects: zoneData.objects,
          points: interpolatePoints(
            parseCoordinates(zoneData.coordinates),
            1,
            1,
            scaledWidth,
            scaledHeight,
          ),
          isFinished: true,
          isUnsaved: false,
          color: zoneData.color,
        }),
      );

      const motionMasks = Object.entries(cameraConfig.motion.mask).map(
        ([, maskData], index) => ({
          type: "motion_mask" as PolygonType,
          camera: cameraConfig.name,
          name: `Motion Mask ${index + 1}`,
          objects: [],
          points: interpolatePoints(
            parseCoordinates(maskData),
            1,
            1,
            scaledWidth,
            scaledHeight,
          ),
          isFinished: true,
          isUnsaved: false,
          color: [0, 0, 255],
        }),
      );

      const globalObjectMasks = Object.entries(cameraConfig.objects.mask).map(
        ([, maskData], index) => ({
          type: "object_mask" as PolygonType,
          camera: cameraConfig.name,
          name: `Object Mask ${index + 1} (all objects)`,
          objects: [],
          points: interpolatePoints(
            parseCoordinates(maskData),
            1,
            1,
            scaledWidth,
            scaledHeight,
          ),
          isFinished: true,
          isUnsaved: false,
          color: [0, 0, 255],
        }),
      );

      const globalObjectMasksCount = globalObjectMasks.length;

      const objectMasks = Object.entries(cameraConfig.objects.filters).flatMap(
        ([objectName, { mask }]): Polygon[] =>
          mask !== null && mask !== undefined
            ? mask.flatMap((maskItem, subIndex) =>
                maskItem !== null && maskItem !== undefined
                  ? [
                      {
                        type: "object_mask" as PolygonType,
                        camera: cameraConfig.name,
                        name: `Object Mask ${globalObjectMasksCount + subIndex + 1} (${objectName})`,
                        objects: [objectName],
                        points: interpolatePoints(
                          parseCoordinates(maskItem),
                          1,
                          1,
                          scaledWidth,
                          scaledHeight,
                        ),
                        isFinished: true,
                        isUnsaved: false,
                        color: [128, 128, 128],
                      },
                    ]
                  : [],
              )
            : [],
      );

      // console.log("setting all and editing");
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

      // setZoneObjects(
      //   Object.entries(cameraConfig.zones).map(([name, zoneData]) => ({
      //     camera: cameraConfig.name,
      //     zoneName: name,
      //     objects: Object.keys(zoneData.filters),
      //   })),
      // );
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraConfig, containerRef, scaledHeight, scaledWidth]);

  useEffect(() => {
    if (editPane === undefined) {
      setEditingPolygons([...allPolygons]);
      setIsEditing(false);
      // console.log("edit pane undefined, all", allPolygons);
    } else {
      setIsEditing(true);
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setEditingPolygons, setIsEditing, allPolygons]);

  // useEffect(() => {
  //   console.log(
  //     "config zone objects",
  //     Object.entries(cameraConfig.zones).map(([name, zoneData]) => ({
  //       camera: cameraConfig.name,
  //       zoneName: name,
  //       objects: Object.keys(zoneData.filters),
  //     })),
  //   );
  //   console.log("component zone objects", zoneObjects);
  // }, [zoneObjects]);

  useEffect(() => {
    if (selectedCamera) {
      setActivePolygonIndex(undefined);
    }
  }, [selectedCamera]);

  if (!cameraConfig && !selectedCamera) {
    return <ActivityIndicator />;
  }

  return (
    <>
      {cameraConfig && editingPolygons && (
        <div className="flex flex-col md:flex-row size-full">
          <Toaster position="top-center" />
          <div className="flex flex-col h-full w-full overflow-y-auto mt-2 md:mt-0 mb-10 md:mb-0 md:w-3/12 order-last md:order-none md:mr-2 rounded-lg border-secondary-foreground border-[1px] p-2 bg-background_alt">
            {editPane == "zone" && (
              <ZoneEditPane
                polygons={editingPolygons}
                setPolygons={setEditingPolygons}
                activePolygonIndex={activePolygonIndex}
                onCancel={handleCancel}
                onSave={handleSave}
              />
            )}
            {editPane == "motion_mask" && (
              <MotionMaskEditPane
                polygons={editingPolygons}
                setPolygons={setEditingPolygons}
                activePolygonIndex={activePolygonIndex}
                onCancel={handleCancel}
                onSave={handleSave}
              />
            )}
            {editPane == "object_mask" && (
              <ObjectMaskEditPane
                polygons={editingPolygons}
                setPolygons={setEditingPolygons}
                activePolygonIndex={activePolygonIndex}
                onCancel={handleCancel}
                onSave={handleSave}
              />
            )}
            {editPane === undefined && (
              <>
                <Heading as="h3" className="my-2">
                  Masks / Zones
                </Heading>
                <div className="flex flex-col w-full">
                  {(selectedZoneMask === undefined ||
                    selectedZoneMask.includes("zone" as PolygonType)) && (
                    <div className="mt-0 pt-0 last:pb-3 last:border-b-[1px] last:border-secondary">
                      <div className="flex flex-row justify-between items-center my-3">
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <div className="text-md cursor-default">Zones</div>
                          </HoverCardTrigger>
                          <HoverCardContent>
                            <div className="flex flex-col gap-2 text-sm text-primary-variant my-2">
                              <p>
                                Zones allow you to define a specific area of the
                                frame so you can determine whether or not an
                                object is within a particular area.
                              </p>
                              <div className="flex items-center text-primary">
                                <Link
                                  to="https://docs.frigate.video/configuration/zones"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline"
                                >
                                  Documentation{" "}
                                  <LuExternalLink className="size-3 ml-2 inline-flex" />
                                </Link>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="secondary"
                              className="size-6 p-1 rounded-md text-background bg-secondary-foreground"
                              onClick={() => {
                                setEditPane("zone");
                                handleNewPolygon("zone");
                              }}
                            >
                              <LuPlus />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Add Zone</TooltipContent>
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
                            activePolygonIndex={activePolygonIndex}
                            hoveredPolygonIndex={hoveredPolygonIndex}
                            setHoveredPolygonIndex={setHoveredPolygonIndex}
                            setActivePolygonIndex={setActivePolygonIndex}
                            setEditPane={setEditPane}
                            setAllPolygons={setAllPolygons}
                            handleCopyCoordinates={handleCopyCoordinates}
                          />
                        ))}
                    </div>
                  )}
                  {(selectedZoneMask === undefined ||
                    selectedZoneMask.includes(
                      "motion_mask" as PolygonType,
                    )) && (
                    <div className="first:mt-0 mt-3 first:pt-0 pt-3 last:pb-3 border-t-[1px] last:border-b-[1px] first:border-transparent border-secondary">
                      <div className="flex flex-row justify-between items-center my-3">
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <div className="text-md cursor-default">
                              Motion Masks
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent>
                            <div className="flex flex-col gap-2 text-sm text-primary-variant my-2">
                              <p>
                                Motion masks are used to prevent unwanted types
                                of motion from triggering detection. Over
                                masking will make it more difficult for objects
                                to be tracked.
                              </p>
                              <div className="flex items-center text-primary">
                                <Link
                                  to="https://docs.frigate.video/configuration/masks#motion-masks"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline"
                                >
                                  Documentation{" "}
                                  <LuExternalLink className="size-3 ml-2 inline-flex" />
                                </Link>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="secondary"
                              className="size-6 p-1 rounded-md text-background bg-secondary-foreground"
                              onClick={() => {
                                setEditPane("motion_mask");
                                handleNewPolygon("motion_mask");
                              }}
                            >
                              <LuPlus />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Add Motion Mask</TooltipContent>
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
                            activePolygonIndex={activePolygonIndex}
                            hoveredPolygonIndex={hoveredPolygonIndex}
                            setHoveredPolygonIndex={setHoveredPolygonIndex}
                            setActivePolygonIndex={setActivePolygonIndex}
                            setEditPane={setEditPane}
                            setAllPolygons={setAllPolygons}
                            handleCopyCoordinates={handleCopyCoordinates}
                          />
                        ))}
                    </div>
                  )}
                  {(selectedZoneMask === undefined ||
                    selectedZoneMask.includes(
                      "object_mask" as PolygonType,
                    )) && (
                    <div className="first:mt-0 mt-3 first:pt-0 pt-3 last:pb-3 border-t-[1px] last:border-b-[1px] first:border-transparent border-secondary">
                      <div className="flex flex-row justify-between items-center my-3">
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <div className="text-md cursor-default">
                              Object Masks
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent>
                            <div className="flex flex-col gap-2 text-sm text-primary-variant my-2">
                              <p>
                                Object filter masks are used to filter out false
                                positives for a given object type based on
                                location.
                              </p>
                              <div className="flex items-center text-primary">
                                <Link
                                  to="https://docs.frigate.video/configuration/masks#object-filter-masks"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline"
                                >
                                  Documentation{" "}
                                  <LuExternalLink className="size-3 ml-2 inline-flex" />
                                </Link>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="secondary"
                              className="size-6 p-1 rounded-md text-background bg-secondary-foreground"
                              onClick={() => {
                                setEditPane("object_mask");
                                handleNewPolygon("object_mask");
                              }}
                            >
                              <LuPlus />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Add Object Mask</TooltipContent>
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
                            activePolygonIndex={activePolygonIndex}
                            hoveredPolygonIndex={hoveredPolygonIndex}
                            setHoveredPolygonIndex={setHoveredPolygonIndex}
                            setActivePolygonIndex={setActivePolygonIndex}
                            setEditPane={setEditPane}
                            setAllPolygons={setAllPolygons}
                            handleCopyCoordinates={handleCopyCoordinates}
                          />
                        ))}
                    </div>
                  )}
                </div>
              </>
            )}
            {/* <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Name</TableHead>
                  <TableHead className="max-w-[200px]">Coordinates</TableHead>
                  <TableHead>Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allPolygons.map((polygon, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {polygon.name}
                    </TableCell>
                    <TableCell className="max-w-[200px] text-wrap">
                      <code>
                        {JSON.stringify(
                          interpolatePoints(
                            polygon.points,
                            scaledWidth,
                            scaledHeight,
                            cameraConfig.detect.width,
                            cameraConfig.detect.height,
                          ),
                          null,
                          0,
                        )}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div
                        className="cursor-pointer"
                        onClick={() => setActivePolygonIndex(index)}
                      >
                        <LuPencil className="size-4 text-white" />
                      </div>
                      <ZoneObjectSelector
                        camera={polygon.camera}
                        zoneName={polygon.name}
                        allLabels={allLabels}
                        updateLabelFilter={(objects) =>
                          saveZoneObjects(polygon.camera, polygon.name, objects)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div>
              scaled width: {scaledWidth}, scaled height: {scaledHeight},
              container width: {containerWidth}, container height:
              {containerHeight}
            </div>
            <ZoneControls
              camera={cameraConfig.name}
              polygons={allPolygons}
              setPolygons={setAllPolygons}
              activePolygonIndex={activePolygonIndex}
              setActivePolygonIndex={setActivePolygonIndex}
            />
            <div className="flex flex-col justify-center items-center m-auto w-[30%] bg-secondary">
              <pre style={{ whiteSpace: "pre-wrap" }}>
                {JSON.stringify(
                  allPolygons &&
                    allPolygons.map((polygon) =>
                      interpolatePoints(
                        polygon.points,
                        scaledWidth,
                        scaledHeight,
                        1,
                        1,
                      ),
                    ),
                  null,
                  0,
                )}
              </pre>
            </div> */}
          </div>
          <div
            ref={containerRef}
            className="flex md:w-7/12 md:grow md:h-dvh max-h-[50%] md:max-h-full"
          >
            <div className="flex flex-row justify-center mx-auto size-full">
              {cameraConfig &&
              scaledWidth &&
              scaledHeight &&
              editingPolygons ? (
                <PolygonCanvas
                  camera={cameraConfig.name}
                  width={scaledWidth}
                  height={scaledHeight}
                  polygons={editingPolygons}
                  setPolygons={setEditingPolygons}
                  activePolygonIndex={activePolygonIndex}
                  hoveredPolygonIndex={hoveredPolygonIndex}
                  selectedZoneMask={selectedZoneMask}
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
