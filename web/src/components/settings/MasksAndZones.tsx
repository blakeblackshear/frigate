import { Separator } from "@/components/ui/separator";

import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PolygonCanvas } from "./PolygonCanvas";
import { Polygon } from "@/types/canvas";
import { interpolatePoints, toRGBColorString } from "@/utils/canvasUtil";
import { isDesktop } from "react-device-detect";
import { NewZoneButton } from "./NewZoneButton";
import { Skeleton } from "../ui/skeleton";
import { useResizeObserver } from "@/hooks/resize-observer";
import { LuCopy, LuPencil, LuTrash } from "react-icons/lu";
import { FaDrawPolygon } from "react-icons/fa";
import copy from "copy-to-clipboard";
import { toast } from "sonner";
import { Toaster } from "../ui/sonner";
import Heading from "../ui/heading";
import { Input } from "../ui/input";
import { ZoneEditPane } from "./ZoneEditPane";

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

export type ZoneObjects = {
  camera: string;
  zoneName: string;
  objects: string[];
};

type MasksAndZoneProps = {
  selectedCamera: string;
  setSelectedCamera: React.Dispatch<React.SetStateAction<string>>;
};

export default function MasksAndZones({
  selectedCamera,
  setSelectedCamera,
}: MasksAndZoneProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [zonePolygons, setZonePolygons] = useState<Polygon[]>([]);
  const [zoneObjects, setZoneObjects] = useState<ZoneObjects[]>([]);
  const [activePolygonIndex, setActivePolygonIndex] = useState<
    number | undefined
  >(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editViews = ["zone", "motion_mask", "object_mask", undefined] as const;

  type EditPaneType = (typeof editViews)[number];
  const [editPane, setEditPane] = useState<EditPaneType>(undefined);

  const cameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.cameras)
      .filter((conf) => conf.ui.dashboard && conf.enabled)
      .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
  }, [config]);

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

  const saveZoneObjects = useCallback(
    (camera: string, zoneName: string, objects?: string[]) => {
      setZoneObjects((prevZoneObjects) => {
        const updatedZoneObjects = prevZoneObjects.map((zoneObject) => {
          if (
            zoneObject.camera === camera &&
            zoneObject.zoneName === zoneName
          ) {
            return { ...zoneObject, objects: objects || [] };
          }
          return zoneObject;
        });
        return updatedZoneObjects;
      });
    },
    [setZoneObjects],
  );

  const growe = useMemo(() => {
    if (!cameraConfig) {
      return;
    }

    const aspectRatio = cameraConfig.detect.width / cameraConfig.detect.height;

    if (aspectRatio > 2) {
      return "aspect-wide";
    } else if (aspectRatio < 16 / 9) {
      if (isDesktop) {
        return "size-full aspect-tall";
      } else {
        return "size-full";
      }
    } else {
      return "size-full aspect-video";
    }
  }, [cameraConfig]);

  const getCameraAspect = useCallback(
    (cam: string) => {
      if (!config) {
        return undefined;
      }

      const camera = config.cameras[cam];

      if (!camera) {
        return undefined;
      }

      return camera.detect.width / camera.detect.height;
    },
    [config],
  );

  const mainCameraAspect = useMemo(() => {
    const aspectRatio = getCameraAspect(selectedCamera);

    if (!aspectRatio) {
      return "normal";
    } else if (aspectRatio > 2) {
      return "wide";
    } else if (aspectRatio < 16 / 9) {
      return "tall";
    } else {
      return "normal";
    }
  }, [getCameraAspect, selectedCamera]);

  const grow = useMemo(() => {
    if (mainCameraAspect == "wide") {
      return "w-full aspect-wide";
    } else if (mainCameraAspect == "tall") {
      if (isDesktop) {
        return "size-full aspect-tall flex flex-col justify-center";
      } else {
        return "size-full";
      }
    } else {
      return "w-full aspect-video";
    }
  }, [mainCameraAspect]);

  const [{ width: containerWidth, height: containerHeight }] =
    useResizeObserver(containerRef);

  const { width, height } = cameraConfig
    ? cameraConfig.detect
    : { width: 1, height: 1 };
  const aspectRatio = width / height;

  const stretch = true;
  const fitAspect = 16 / 9;
  // console.log(containerRef.current?.clientHeight);

  const scaledHeight = useMemo(() => {
    const scaledHeight =
      aspectRatio < (fitAspect ?? 0)
        ? Math.floor(
            Math.min(containerHeight, containerRef.current?.clientHeight),
          )
        : Math.floor(containerWidth / aspectRatio);
    const finalHeight = stretch ? scaledHeight : Math.min(scaledHeight, height);

    if (finalHeight > 0) {
      return finalHeight;
    }

    return 100;
  }, [
    aspectRatio,
    containerWidth,
    containerHeight,
    fitAspect,
    height,
    stretch,
  ]);

  const scaledWidth = useMemo(
    () => Math.ceil(scaledHeight * aspectRatio),
    [scaledHeight, aspectRatio],
  );

  const handleCopyCoordinates = useCallback(
    (index: number) => {
      if (zonePolygons) {
        const poly = zonePolygons[index];
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
    [zonePolygons, scaledHeight, scaledWidth],
  );

  useEffect(() => {
    if (cameraConfig && containerRef.current) {
      setZonePolygons(
        Object.entries(cameraConfig.zones).map(([name, zoneData]) => ({
          camera: cameraConfig.name,
          name,
          points: interpolatePoints(
            parseCoordinates(zoneData.coordinates),
            1,
            1,
            scaledWidth,
            scaledHeight,
          ),
          isFinished: true,
          color: zoneData.color,
        })),
      );

      setZoneObjects(
        Object.entries(cameraConfig.zones).map(([name, zoneData]) => ({
          camera: cameraConfig.name,
          zoneName: name,
          objects: Object.keys(zoneData.filters),
        })),
      );
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraConfig, containerRef]);

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
      {cameraConfig && zonePolygons && (
        <div className="flex flex-col md:flex-row size-full">
          <Toaster position="top-center" />
          <div className="flex flex-col order-last w-full overflow-y-auto md:w-3/12 md:order-none md:mr-2 rounded-lg border-secondary-foreground border-[1px] p-2 bg-background_alt">
            {/* <div className="flex mb-3">
              <Separator />
            </div> */}
            {editPane == "zone" && (
              <ZoneEditPane
                polygons={zonePolygons}
                activePolygonIndex={activePolygonIndex}
                onCancel={() => {
                  setEditPane(undefined);
                  setActivePolygonIndex(undefined);
                }}
              />
            )}
            {editPane == "motion_mask" && (
              <ZoneEditPane
                polygons={zonePolygons}
                activePolygonIndex={activePolygonIndex}
                onCancel={() => {
                  setEditPane(undefined);
                  setActivePolygonIndex(undefined);
                }}
              />
            )}
            {editPane == "object_mask" && (
              <ZoneEditPane
                polygons={zonePolygons}
                activePolygonIndex={activePolygonIndex}
                onCancel={() => {
                  setEditPane(undefined);
                  setActivePolygonIndex(undefined);
                }}
              />
            )}
            {editPane == undefined && (
              <>
                <div className="flex flex-row justify-between items-center mb-3">
                  <div className="text-md">Zones</div>
                  <NewZoneButton
                    camera={cameraConfig.name}
                    polygons={zonePolygons}
                    setPolygons={setZonePolygons}
                    activePolygonIndex={activePolygonIndex}
                    setActivePolygonIndex={setActivePolygonIndex}
                  />
                </div>
                {zonePolygons.map((polygon, index) => (
                  <div
                    key={index}
                    className="flex p-1 rounded-lg flex-row items-center justify-between mx-2 mb-1"
                    // style={{
                    //   backgroundColor:
                    //     activePolygonIndex === index
                    //       ? toRGBColorString(polygon.color, false)
                    //       : "",
                    // }}
                  >
                    <div
                      className={`flex items-center ${activePolygonIndex === index ? "text-primary" : "text-muted-foreground"}`}
                    >
                      <FaDrawPolygon
                        className="size-4 mr-2"
                        style={{
                          fill: toRGBColorString(polygon.color, true),
                          color: toRGBColorString(polygon.color, true),
                        }}
                      />
                      <p>{polygon.name}</p>
                    </div>
                    <div className="flex flex-row gap-2">
                      <div
                        className="cursor-pointer"
                        onClick={() => {
                          setActivePolygonIndex(index);
                          setEditPane("zone");
                          // if (activePolygonIndex == index) {
                          //   setActivePolygonIndex(null);

                          // } else {
                          //   setActivePolygonIndex(index);
                          // }
                        }}
                      >
                        <LuPencil
                          className={`size-4 ${activePolygonIndex === index ? "text-primary" : "text-muted-foreground"}`}
                        />
                      </div>
                      <div
                        className="cursor-pointer"
                        onClick={() => handleCopyCoordinates(index)}
                      >
                        <LuCopy
                          className={`size-4 ${activePolygonIndex === index ? "text-primary" : "text-muted-foreground"}`}
                        />
                      </div>
                      <div
                        className="cursor-pointer"
                        onClick={() => {
                          setZonePolygons((oldPolygons) => {
                            return oldPolygons.filter((_, i) => i !== index);
                          });
                          setActivePolygonIndex(undefined);
                        }}
                      >
                        <LuTrash
                          className={`size-4 ${activePolygonIndex === index ? "text-primary fill-primary" : "text-muted-foreground fill-muted-foreground"}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
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
                {zonePolygons.map((polygon, index) => (
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
              polygons={zonePolygons}
              setPolygons={setZonePolygons}
              activePolygonIndex={activePolygonIndex}
              setActivePolygonIndex={setActivePolygonIndex}
            />
            <div className="flex flex-col justify-center items-center m-auto w-[30%] bg-secondary">
              <pre style={{ whiteSpace: "pre-wrap" }}>
                {JSON.stringify(
                  zonePolygons &&
                    zonePolygons.map((polygon) =>
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
            className="flex md:w-7/12 md:grow md:h-dvh md:max-h-full"
          >
            <div className="size-full">
              {cameraConfig ? (
                <PolygonCanvas
                  camera={cameraConfig.name}
                  width={scaledWidth}
                  height={scaledHeight}
                  polygons={zonePolygons}
                  setPolygons={setZonePolygons}
                  activePolygonIndex={activePolygonIndex}
                />
              ) : (
                <Skeleton className="w-full h-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
