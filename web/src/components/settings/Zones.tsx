import Heading from "@/components/ui/heading";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useApiHost } from "@/api";
import { Polygon } from "@/types/canvas";
import { interpolatePoints } from "@/utils/canvasUtil";
import AutoUpdatingCameraImage from "../camera/AutoUpdatingCameraImage";
import { isDesktop } from "react-device-detect";
import PolygonControls from "./PolygonControls";
import { Skeleton } from "../ui/skeleton";
import { useResizeObserver } from "@/hooks/resize-observer";
import { LuPencil } from "react-icons/lu";

const parseCoordinates = (coordinatesString: string) => {
  const coordinates = coordinatesString.split(",");
  const points = [];

  for (let i = 0; i < coordinates.length; i += 2) {
    const x = parseInt(coordinates[i], 10);
    const y = parseInt(coordinates[i + 1], 10);
    points.push([x, y]);
  }

  return points;
};

export default function SettingsZones() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [zonePolygons, setZonePolygons] = useState<Polygon[]>([]);
  const [activePolygonIndex, setActivePolygonIndex] = useState<number | null>(
    null,
  );
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiHost = useApiHost();
  // const videoSource = `${apiHost}api/ptzcam/latest.jpg`;

  const cameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.cameras)
      .filter((conf) => conf.ui.dashboard && conf.enabled)
      .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
  }, [config]);

  const [selectedCamera, setSelectedCamera] = useState(cameras[0].name);

  const cameraConfig = useMemo(() => {
    if (config && selectedCamera) {
      return config.cameras[selectedCamera];
    }
  }, [config, selectedCamera]);

  const cameraAspect = useMemo(() => {
    if (!cameraConfig) {
      return;
    }

    const aspectRatio = cameraConfig.detect.width / cameraConfig.detect.height;
    console.log("aspect", aspectRatio);

    if (!aspectRatio) {
      return "normal";
    } else if (aspectRatio > 2) {
      return "wide";
    } else if (aspectRatio < 16 / 9) {
      return "tall";
    } else {
      return "normal";
    }
  }, [cameraConfig]);

  const grow = useMemo(() => {
    if (cameraAspect == "wide") {
      return "aspect-wide";
    } else if (cameraAspect == "tall") {
      if (isDesktop) {
        return "size-full aspect-tall";
      } else {
        return "size-full";
      }
    } else {
      return "aspect-video";
    }
  }, [cameraAspect]);

  // const [{ width: containerWidth, height: containerHeight }] =
  //   useResizeObserver(containerRef);
  const containerWidth = containerRef.current?.clientWidth;
  const containerHeight = containerRef.current?.clientHeight;

  // Add scrollbar width (when visible) to the available observer width to eliminate screen juddering.
  // https://github.com/blakeblackshear/frigate/issues/1657
  let scrollBarWidth = 0;
  // if (window.innerWidth && document.body.offsetWidth) {
  //   scrollBarWidth = window.innerWidth - document.body.offsetWidth;
  // }
  // const availableWidth = scrollBarWidth
  //   ? containerWidth + scrollBarWidth
  //   : containerWidth;

  const availableWidth = containerWidth;

  const { width, height } = cameraConfig
    ? cameraConfig.detect
    : { width: 1, height: 1 };
  const aspectRatio = width / height;

  const stretch = false;
  const fitAspect = 1;
  const scaledHeight = useMemo(() => {
    const scaledHeight =
      aspectRatio < (fitAspect ?? 0)
        ? Math.floor(containerHeight)
        : Math.floor(availableWidth / aspectRatio);
    const finalHeight = stretch ? scaledHeight : Math.min(scaledHeight, height);

    if (finalHeight > 0) {
      return finalHeight;
    }

    return 100;
  }, [
    availableWidth,
    aspectRatio,
    containerHeight,
    fitAspect,
    height,
    stretch,
  ]);
  const scaledWidth = useMemo(
    () => Math.ceil(scaledHeight * aspectRatio - scrollBarWidth),
    [scaledHeight, aspectRatio, scrollBarWidth],
  );

  useEffect(() => {
    if (cameraConfig && containerRef.current) {
      setZonePolygons(
        Object.entries(cameraConfig.zones).map(([name, zoneData]) => ({
          name,
          points: interpolatePoints(
            parseCoordinates(zoneData.coordinates),
            cameraConfig.detect.width,
            cameraConfig.detect.height,
            scaledWidth,
            scaledHeight,
          ),
          isFinished: true,
        })),
      );
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraConfig, containerRef]);

  // const image = useMemo(() => {
  //   if (cameraConfig && containerRef && containerRef.current) {
  //     console.log("width:", containerRef.current.clientWidth);
  //     const element = new window.Image();
  //     element.width = containerRef.current.clientWidth;
  //     element.height = containerRef.current.clientHeight;
  //     element.src = `${apiHost}api/${cameraConfig.name}/latest.jpg`;
  //     return element;
  //   }
  // }, [cameraConfig, apiHost, containerRef]);

  // useEffect(() => {
  //   if (image) {
  //     imgRef.current = image;
  //   }
  // }, [image]);

  if (!cameraConfig && !selectedCamera) {
    return <ActivityIndicator />;
  }

  // console.log("selected camera", selectedCamera);
  // console.log("threshold", motionThreshold);
  // console.log("contour area", motionContourArea);
  // console.log("zone polygons", zonePolygons);

  // console.log("width:", containerRef.current.clientWidth);
  // const element = new window.Image();
  // element.width = containerRef.current.clientWidth;
  // element.height = containerRef.current.clientHeight;

  return (
    <>
      <Heading as="h2">Zones</Heading>
      <div className="flex items-center space-x-2 mt-5">
        <Select value={selectedCamera} onValueChange={setSelectedCamera}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Camera" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Choose a camera</SelectLabel>
              {cameras.map((camera) => (
                <SelectItem
                  key={camera.name}
                  value={`${camera.name}`}
                  className="capitalize"
                >
                  {camera.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {cameraConfig && (
        <div className="flex flex-row justify-evenly">
          <div
            className={`flex flex-col justify-center items-center w-[50%] ${grow}`}
          >
            <div ref={containerRef} className="size-full">
              {cameraConfig ? (
                <PolygonCanvas
                  camera={cameraConfig.name}
                  width={scaledWidth}
                  height={scaledHeight}
                  polygons={zonePolygons}
                  setPolygons={setZonePolygons}
                  activePolygonIndex={activePolygonIndex}
                  setActivePolygonIndex={setActivePolygonIndex}
                />
              ) : (
                <Skeleton className="w-full h-full" />
              )}
            </div>
          </div>
          <div className="w-[30%]">
            <Table>
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
                      {" "}
                      <div
                        className="cursor-pointer"
                        onClick={() => setActivePolygonIndex(index)}
                      >
                        <LuPencil className="size-4 text-white" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PolygonControls
              camera={cameraConfig.name}
              width={scaledWidth}
              height={scaledHeight}
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}
