import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PolygonCanvas } from "./PolygonCanvas";
import { Polygon, PolygonType } from "@/types/canvas";
import { interpolatePoints, toRGBColorString } from "@/utils/canvasUtil";
import { isDesktop, isMobile } from "react-device-detect";
import { Skeleton } from "../ui/skeleton";
import { useResizeObserver } from "@/hooks/resize-observer";
import { LuCopy, LuPencil, LuPlusSquare, LuTrash } from "react-icons/lu";
import { FaDrawPolygon, FaObjectGroup } from "react-icons/fa";
import copy from "copy-to-clipboard";
import { toast } from "sonner";
import { Toaster } from "../ui/sonner";
import { ZoneEditPane } from "./ZoneEditPane";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Separator } from "../ui/separator";
import { BsPersonBoundingBox } from "react-icons/bs";

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

type PolygonItemProps = {
  polygon: Polygon;
  setAllPolygons: React.Dispatch<React.SetStateAction<Polygon[]>>;
  index: number;
  activePolygonIndex: number | undefined;
  hoveredPolygonIndex: number | null;
  setHoveredPolygonIndex: (index: number | null) => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  setActivePolygonIndex: (index: number | undefined) => void;
  setEditPane: (type: PolygonType) => void;
  handleCopyCoordinates: (index: number) => void;
};

export type ZoneObjects = {
  camera: string;
  zoneName: string;
  objects: string[];
};

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
  const [zoneObjects, setZoneObjects] = useState<ZoneObjects[]>([]);
  const [activePolygonIndex, setActivePolygonIndex] = useState<
    number | undefined
  >(undefined);
  const [hoveredPolygonIndex, setHoveredPolygonIndex] = useState<number | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // const polygonTypes = [
  //   "zone",
  //   "motion_mask",
  //   "object_mask",
  //   undefined,
  // ] as const;

  // type EditPaneType = (typeof polygonTypes)[number];
  const [editPane, setEditPane] = useState<PolygonType | undefined>(undefined);

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
  const fitAspect = 1;

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
    setActivePolygonIndex(allPolygons.length);
    setEditingPolygons([
      ...(allPolygons || []),
      {
        points: [],
        isFinished: false,
        isUnsaved: true,
        type,
        name: "",
        objects: [],
        camera: selectedCamera,
        color: [0, 0, 220],
      },
    ]);
  };

  const handleCancel = useCallback(() => {
    setEditPane(undefined);
    setAllPolygons(allPolygons.filter((poly) => !poly.isUnsaved));
    setActivePolygonIndex(undefined);
    setHoveredPolygonIndex(null);
  }, [allPolygons]);

  const handleSave = useCallback(() => {
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
          name: `All Objects Object Mask ${index + 1}`,
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
                        name: `${objectName.charAt(0).toUpperCase() + objectName.slice(1)} Object Mask ${globalObjectMasksCount + subIndex + 1}`,
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

      setAllPolygons([
        ...zones,
        ...motionMasks,
        ...globalObjectMasks,
        ...objectMasks,
      ]);

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
  }, [cameraConfig, containerRef, scaledHeight, scaledWidth]);

  useEffect(() => {
    if (editPane === undefined) {
      setEditingPolygons([...allPolygons]);
      setIsEditing(false);
      console.log(allPolygons);
    } else {
      setIsEditing(true);
    }
  }, [setEditingPolygons, setIsEditing, allPolygons, editPane]);

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
      setActivePolygonIndex(undefined);
    }
  }, [selectedCamera]);

  if (!cameraConfig && !selectedCamera) {
    return <ActivityIndicator />;
  }

  return (
    <>
      {cameraConfig && allPolygons && (
        <div className="flex flex-col md:flex-row size-full">
          <Toaster position="top-center" />
          <div className="flex flex-col w-full overflow-y-auto md:w-3/12 order-last md:order-none md:mr-2 rounded-lg border-secondary-foreground border-[1px] p-2 bg-background_alt">
            {editPane == "zone" && (
              <ZoneEditPane
                polygons={editingPolygons}
                activePolygonIndex={activePolygonIndex}
                onCancel={handleCancel}
                onSave={handleSave}
              />
            )}
            {editPane == "motion_mask" && (
              <ZoneEditPane
                polygons={editingPolygons}
                activePolygonIndex={activePolygonIndex}
                onCancel={handleCancel}
                onSave={handleSave}
              />
            )}
            {editPane == "object_mask" && (
              <ZoneEditPane
                polygons={editingPolygons}
                activePolygonIndex={activePolygonIndex}
                onCancel={handleCancel}
                onSave={handleSave}
              />
            )}
            {editPane === undefined && (
              <>
                {(selectedZoneMask === undefined ||
                  selectedZoneMask.includes("zone" as PolygonType)) && (
                  <>
                    <div className="flex flex-row justify-between items-center my-2">
                      <div className="text-md">Zones</div>
                      <Button
                        variant="ghost"
                        className="h-8 px-0"
                        onClick={() => {
                          setEditPane("zone");
                          handleNewPolygon("zone");
                        }}
                      >
                        <LuPlusSquare />
                      </Button>
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
                          deleteDialogOpen={deleteDialogOpen}
                          setDeleteDialogOpen={setDeleteDialogOpen}
                          setActivePolygonIndex={setActivePolygonIndex}
                          setEditPane={setEditPane}
                          setAllPolygons={setAllPolygons}
                          handleCopyCoordinates={handleCopyCoordinates}
                        />
                      ))}
                  </>
                )}
                <div className="flex my-2">
                  <Separator className="bg-secondary" />
                </div>
                {(selectedZoneMask === undefined ||
                  selectedZoneMask.includes("motion_mask" as PolygonType)) && (
                  <>
                    <div className="flex flex-row justify-between items-center my-2">
                      <div className="text-md">Motion Masks</div>
                      <Button
                        variant="ghost"
                        className="h-8 px-0"
                        onClick={() => {
                          setEditPane("motion_mask");
                          handleNewPolygon("motion_mask");
                        }}
                      >
                        <LuPlusSquare />
                      </Button>
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
                          deleteDialogOpen={deleteDialogOpen}
                          setDeleteDialogOpen={setDeleteDialogOpen}
                          setActivePolygonIndex={setActivePolygonIndex}
                          setEditPane={setEditPane}
                          setAllPolygons={setAllPolygons}
                          handleCopyCoordinates={handleCopyCoordinates}
                        />
                      ))}
                  </>
                )}
                <div className="flex my-2">
                  <Separator className="bg-secondary" />
                </div>
                {(selectedZoneMask === undefined ||
                  selectedZoneMask.includes("object_mask" as PolygonType)) && (
                  <>
                    <div className="flex flex-row justify-between items-center my-2">
                      <div className="text-md">Object Masks</div>
                      <Button
                        variant="ghost"
                        className="h-8 px-0"
                        onClick={() => {
                          setEditPane("object_mask");
                          handleNewPolygon("object_mask");
                        }}
                      >
                        <LuPlusSquare />
                      </Button>
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
                          deleteDialogOpen={deleteDialogOpen}
                          setDeleteDialogOpen={setDeleteDialogOpen}
                          setActivePolygonIndex={setActivePolygonIndex}
                          setEditPane={setEditPane}
                          setAllPolygons={setAllPolygons}
                          handleCopyCoordinates={handleCopyCoordinates}
                        />
                      ))}
                  </>
                )}
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
            className="flex md:w-7/12 md:grow md:h-dvh md:max-h-full"
          >
            <div className="size-full">
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
                <Skeleton className="w-full h-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PolygonItem({
  polygon,
  setAllPolygons,
  index,
  activePolygonIndex,
  hoveredPolygonIndex,
  setHoveredPolygonIndex,
  deleteDialogOpen,
  setDeleteDialogOpen,
  setActivePolygonIndex,
  setEditPane,
  handleCopyCoordinates,
}: PolygonItemProps) {
  const polygonTypeIcons = {
    zone: FaDrawPolygon,
    motion_mask: FaObjectGroup,
    object_mask: BsPersonBoundingBox,
  };

  const PolygonItemIcon = polygon ? polygonTypeIcons[polygon.type] : undefined;

  return (
    <div
      key={index}
      className="flex p-1 rounded-lg flex-row items-center justify-between mx-2 mb-1 transition-background duration-100"
      data-index={index}
      onMouseEnter={() => setHoveredPolygonIndex(index)}
      onMouseLeave={() => setHoveredPolygonIndex(null)}
      style={{
        backgroundColor:
          hoveredPolygonIndex === index
            ? toRGBColorString(polygon.color, false)
            : "",
      }}
    >
      {isMobile && <></>}
      <div
        className={`flex items-center ${
          activePolygonIndex === index
            ? "text-primary"
            : "text-muted-foreground"
        }`}
      >
        {PolygonItemIcon && (
          <PolygonItemIcon
            className="size-4 mr-2"
            style={{
              fill: toRGBColorString(polygon.color, true),
              color: toRGBColorString(polygon.color, true),
            }}
          />
        )}
        <p className="cursor-default">{polygon.name}</p>
      </div>
      {deleteDialogOpen && hoveredPolygonIndex === index && (
        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={() => setDeleteDialogOpen(!deleteDialogOpen)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              Are you sure you want to delete the{" "}
              {polygon.type.replace("_", " ")} <em>{polygon.name}</em>?
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setAllPolygons((oldPolygons) => {
                    return oldPolygons.filter((_, i) => i !== index);
                  });
                  setActivePolygonIndex(undefined);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {hoveredPolygonIndex === index && (
        <div className="flex flex-row gap-2">
          <div
            className="cursor-pointer"
            onClick={() => {
              setActivePolygonIndex(index);
              setEditPane(polygon.type);
            }}
          >
            <LuPencil
              className={`size-4 ${
                activePolygonIndex === index
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            />
          </div>
          <div
            className="cursor-pointer"
            onClick={() => handleCopyCoordinates(index)}
          >
            <LuCopy
              className={`size-4 ${
                activePolygonIndex === index
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            />
          </div>
          <div
            className="cursor-pointer"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <LuTrash
              className={`size-4 ${
                activePolygonIndex === index
                  ? "text-primary fill-primary"
                  : "text-muted-foreground fill-muted-foreground"
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
