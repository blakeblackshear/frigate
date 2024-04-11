import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PolygonCanvas } from "./PolygonCanvas";
import { Polygon } from "@/types/canvas";
import { interpolatePoints, toRGBColorString } from "@/utils/canvasUtil";
import { isDesktop } from "react-device-detect";
import ZoneControls, {
  NewZoneButton,
  ZoneObjectSelector,
} from "./NewZoneButton";
import { Skeleton } from "../ui/skeleton";
import { useResizeObserver } from "@/hooks/resize-observer";
import { LuCopy, LuPencil, LuPlusSquare, LuTrash } from "react-icons/lu";
import { FaDrawPolygon } from "react-icons/fa";

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
  const [activePolygonIndex, setActivePolygonIndex] = useState<number | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  const allLabels = useMemo<string[]>(() => {
    if (!cameras) {
      return [];
    }

    const labels = new Set<string>();

    cameras.forEach((camera) => {
      camera.objects.track.forEach((label) => {
        labels.add(label);
      });
    });

    return [...labels].sort();
  }, [cameras]);

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

  useEffect(() => {
    console.log(
      "config zone objects",
      Object.entries(cameraConfig.zones).map(([name, zoneData]) => ({
        camera: cameraConfig.name,
        zoneName: name,
        objects: Object.keys(zoneData.filters),
      })),
    );
    console.log("component zone objects", zoneObjects);
  }, [zoneObjects]);

  useEffect(() => {
    if (selectedCamera) {
      setActivePolygonIndex(null);
    }
  }, [selectedCamera]);

  if (!cameraConfig && !selectedCamera) {
    return <ActivityIndicator />;
  }

  return (
    <>
      {cameraConfig && (
        <div className="flex flex-col md:flex-row size-full">
          <div className="flex flex-col order-last w-full md:w-3/12 md:order-none md:mr-2">
            <div className="flex mb-3">
              <Separator />
            </div>
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
                style={{
                  backgroundColor:
                    activePolygonIndex === index
                      ? toRGBColorString(polygon.color, false)
                      : "",
                }}
              >
                <div
                  className={`flex items-center ${activePolygonIndex === index ? "text-primary" : "text-secondary-foreground"}`}
                >
                  <FaDrawPolygon
                    className="size-4 mr-2"
                    style={{
                      fill: toRGBColorString(polygon.color, true),
                      color: toRGBColorString(polygon.color, true),
                    }}
                  />
                  {polygon.name}
                </div>
                <div className="flex flex-row gap-2">
                  <div
                    className="cursor-pointer"
                    onClick={() => setActivePolygonIndex(index)}
                  >
                    <LuPencil
                      className={`size-4 ${activePolygonIndex === index ? "text-primary" : "text-secondary-foreground"}`}
                    />
                  </div>
                  <LuCopy
                    className={`size-4 ${activePolygonIndex === index ? "text-primary" : "text-secondary-foreground"}`}
                  />
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      setZonePolygons((oldPolygons) => {
                        return oldPolygons.filter((_, i) => i !== index);
                      });
                      setActivePolygonIndex(null);
                    }}
                  >
                    <LuTrash
                      className={`size-4 ${activePolygonIndex === index ? "text-primary fill-primary" : "text-secondary-foreground fill-secondary-foreground"}`}
                    />
                  </div>
                </div>
              </div>
            ))}
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
            className="flex md:w-7/12 md:grow md:h-dvh md:max-h-[90%]"
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
