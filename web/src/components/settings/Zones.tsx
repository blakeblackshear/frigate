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
import { useEffect, useMemo, useRef, useState } from "react";
import { PolygonCanvas } from "./PolygonCanvas";
import { Polygon } from "@/types/canvas";
import { interpolatePoints } from "@/utils/canvasUtil";
import { isDesktop } from "react-device-detect";
import PolygonControls from "./PolygonControls";
import { Skeleton } from "../ui/skeleton";
import { useResizeObserver } from "@/hooks/resize-observer";
import { LuPencil } from "react-icons/lu";

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

export default function SettingsZones() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [zonePolygons, setZonePolygons] = useState<Polygon[]>([]);
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

  const [selectedCamera, setSelectedCamera] = useState(cameras[0].name);

  const cameraConfig = useMemo(() => {
    if (config && selectedCamera) {
      return config.cameras[selectedCamera];
    }
  }, [config, selectedCamera]);

  const grow = useMemo(() => {
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

  const [{ width: containerWidth, height: containerHeight }] =
    useResizeObserver(containerRef);

  const { width, height } = cameraConfig
    ? cameraConfig.detect
    : { width: 1, height: 1 };
  const aspectRatio = width / height;

  const stretch = false;
  const fitAspect = 0.75;

  const scaledHeight = useMemo(() => {
    const scaledHeight =
      aspectRatio < (fitAspect ?? 0)
        ? Math.floor(containerHeight)
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
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraConfig, containerRef]);

  if (!cameraConfig && !selectedCamera) {
    return <ActivityIndicator />;
  }

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
            className={`flex flex-col justify-center items-center w-[60%] ${grow}`}
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
            <div>
              scaled width: {scaledWidth}, scaled height: {scaledHeight},
              container width: {containerWidth}, container height:
              {containerHeight}
            </div>
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
