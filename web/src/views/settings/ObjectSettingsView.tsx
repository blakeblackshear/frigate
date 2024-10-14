import { useCallback, useEffect, useMemo } from "react";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import AutoUpdatingCameraImage from "@/components/camera/AutoUpdatingCameraImage";
import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import { Toaster } from "@/components/ui/sonner";
import { Label } from "@/components/ui/label";
import useSWR from "swr";
import Heading from "@/components/ui/heading";
import { Switch } from "@/components/ui/switch";
import { usePersistence } from "@/hooks/use-persistence";
import { Skeleton } from "@/components/ui/skeleton";
import { useCameraActivity } from "@/hooks/use-camera-activity";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ObjectType } from "@/types/ws";
import useDeepMemo from "@/hooks/use-deep-memo";
import { Card } from "@/components/ui/card";
import { getIconForLabel } from "@/utils/iconUtil";
import { capitalizeFirstLetter } from "@/utils/stringUtil";
import { LuInfo } from "react-icons/lu";

type ObjectSettingsViewProps = {
  selectedCamera?: string;
};

type Options = { [key: string]: boolean };

const emptyObject = Object.freeze({});

export default function ObjectSettingsView({
  selectedCamera,
}: ObjectSettingsViewProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const DEBUG_OPTIONS = [
    {
      param: "bbox",
      title: "Bounding boxes",
      description: "Show bounding boxes around tracked objects",
      info: (
        <>
          <p className="mb-2">
            <strong>Object Bounding Box Colors</strong>
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              At startup, different colors will be assigned to each object label
            </li>
            <li>
              A dark blue thin line indicates that object is not detected at
              this current point in time
            </li>
            <li>
              A gray thin line indicates that object is detected as being
              stationary
            </li>
            <li>
              A thick line indicates that object is the subject of autotracking
              (when enabled)
            </li>
          </ul>
        </>
      ),
    },
    {
      param: "timestamp",
      title: "Timestamp",
      description: "Overlay a timestamp on the image",
    },
    {
      param: "zones",
      title: "Zones",
      description: "Show an outline of any defined zones",
    },
    {
      param: "mask",
      title: "Motion masks",
      description: "Show motion mask polygons",
    },
    {
      param: "motion",
      title: "Motion boxes",
      description: "Show boxes around areas where motion is detected",
      info: (
        <>
          <p className="mb-2">
            <strong>Motion Boxes</strong>
          </p>
          <p>
            Red boxes will be overlaid on areas of the frame where motion is
            currently being detected
          </p>
        </>
      ),
    },
    {
      param: "regions",
      title: "Regions",
      description:
        "Show a box of the region of interest sent to the object detector",
      info: (
        <>
          <p className="mb-2">
            <strong>Region Boxes</strong>
          </p>
          <p>
            Bright green boxes will be overlaid on areas of interest in the
            frame that are being sent to the object detector.
          </p>
        </>
      ),
    },
  ];

  const [options, setOptions, optionsLoaded] = usePersistence<Options>(
    `${selectedCamera}-feed`,
    emptyObject,
  );

  const handleSetOption = useCallback(
    (id: string, value: boolean) => {
      const newOptions = { ...options, [id]: value };
      setOptions(newOptions);
    },
    [options, setOptions],
  );

  const cameraConfig = useMemo(() => {
    if (config && selectedCamera) {
      return config.cameras[selectedCamera];
    }
  }, [config, selectedCamera]);

  const { objects } = useCameraActivity(cameraConfig ?? ({} as CameraConfig));

  const memoizedObjects = useDeepMemo(objects);

  const searchParams = useMemo(() => {
    if (!optionsLoaded) {
      return new URLSearchParams();
    }

    const params = new URLSearchParams(
      Object.keys(options || {}).reduce((memo, key) => {
        //@ts-expect-error we know this is correct
        memo.push([key, options[key] === true ? "1" : "0"]);
        return memo;
      }, []),
    );
    return params;
  }, [options, optionsLoaded]);

  useEffect(() => {
    document.title = "Object Settings - Frigate";
  }, []);

  if (!cameraConfig) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex size-full flex-col md:flex-row">
      <Toaster position="top-center" closeButton={true} />
      <div className="scrollbar-container order-last mb-10 mt-2 flex h-full w-full flex-col overflow-y-auto rounded-lg border-[1px] border-secondary-foreground bg-background_alt p-2 md:order-none md:mb-0 md:mr-2 md:mt-0 md:w-3/12">
        <Heading as="h3" className="my-2">
          Debug
        </Heading>
        <div className="mb-5 space-y-3 text-sm text-muted-foreground">
          <p>
            Frigate uses your detectors{" "}
            {config
              ? "(" +
                Object.keys(config?.detectors)
                  .map((detector) => capitalizeFirstLetter(detector))
                  .join(",") +
                ")"
              : ""}{" "}
            to detect objects in your camera's video stream.
          </p>
          <p>
            Debugging view shows a real-time view of tracked objects and their
            statistics. The object list shows a time-delayed summary of detected
            objects.
          </p>
        </div>

        <Tabs defaultValue="debug" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="debug">Debugging</TabsTrigger>
            <TabsTrigger value="objectlist">Object List</TabsTrigger>
          </TabsList>
          <TabsContent value="debug">
            <div className="flex w-full flex-col space-y-6">
              <div className="mt-2 space-y-6">
                <div className="my-2.5 flex flex-col gap-2.5">
                  {DEBUG_OPTIONS.map(({ param, title, description, info }) => (
                    <div
                      key={param}
                      className="flex w-full flex-row items-center justify-between"
                    >
                      <div className="mb-2 flex flex-col">
                        <div className="flex items-center gap-2">
                          <Label
                            className="mb-0 cursor-pointer capitalize text-primary"
                            htmlFor={param}
                          >
                            {title}
                          </Label>
                          {info && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer p-0">
                                  <LuInfo className="size-4" />
                                  <span className="sr-only">Info</span>
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                {info}
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {description}
                        </div>
                      </div>
                      <Switch
                        key={`${param}-${selectedCamera}`}
                        className="ml-1"
                        id={param}
                        checked={options && options[param]}
                        onCheckedChange={(isChecked) => {
                          handleSetOption(param, isChecked);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="objectlist">
            {ObjectList(memoizedObjects)}
          </TabsContent>
        </Tabs>
      </div>

      {cameraConfig ? (
        <div className="flex md:h-dvh md:max-h-full md:w-7/12 md:grow">
          <div className="size-full min-h-10">
            <AutoUpdatingCameraImage
              camera={cameraConfig.name}
              searchParams={searchParams}
              showFps={false}
              className="size-full"
              cameraClasses="relative w-full h-full flex flex-col justify-start"
            />
          </div>
        </div>
      ) : (
        <Skeleton className="size-full rounded-lg md:rounded-2xl" />
      )}
    </div>
  );
}

function ObjectList(objects?: ObjectType[]) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const colormap = useMemo(() => {
    if (!config) {
      return;
    }

    return config.model?.colormap;
  }, [config]);

  const getColorForObjectName = useCallback(
    (objectName: string) => {
      return colormap && colormap[objectName]
        ? `rgb(${colormap[objectName][2]}, ${colormap[objectName][1]}, ${colormap[objectName][0]})`
        : "rgb(128, 128, 128)";
    },
    [colormap],
  );

  return (
    <div className="scrollbar-container flex w-full flex-col overflow-y-auto">
      {objects && objects.length > 0 ? (
        objects.map((obj) => {
          return (
            <Card className="mb-1 p-2 text-sm" key={obj.id}>
              <div className="flex flex-row items-center gap-3 pb-1">
                <div className="flex flex-1 flex-row items-center justify-start p-3 pl-1">
                  <div
                    className="rounded-lg p-2"
                    style={{
                      backgroundColor: obj.stationary
                        ? "rgb(110,110,110)"
                        : getColorForObjectName(obj.label),
                    }}
                  >
                    {getIconForLabel(obj.label, "size-5 text-white")}
                  </div>
                  <div className="ml-3 text-lg">
                    {capitalizeFirstLetter(obj.label.replaceAll("_", " "))}
                  </div>
                </div>
                <div className="flex w-8/12 flex-row items-end justify-end">
                  <div className="text-md mr-2 w-1/3">
                    <div className="flex flex-col items-end justify-end">
                      <p className="mb-1.5 text-sm text-primary-variant">
                        Score
                      </p>
                      {obj.score
                        ? (obj.score * 100).toFixed(1).toString()
                        : "-"}
                      %
                    </div>
                  </div>
                  <div className="text-md mr-2 w-1/3">
                    <div className="flex flex-col items-end justify-end">
                      <p className="mb-1.5 text-sm text-primary-variant">
                        Ratio
                      </p>
                      {obj.ratio ? obj.ratio.toFixed(2).toString() : "-"}
                    </div>
                  </div>
                  <div className="text-md mr-2 w-1/3">
                    <div className="flex flex-col items-end justify-end">
                      <p className="mb-1.5 text-sm text-primary-variant">
                        Area
                      </p>
                      {obj.area ? obj.area.toString() : "-"}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })
      ) : (
        <div className="p-3 text-center">No objects</div>
      )}
    </div>
  );
}
