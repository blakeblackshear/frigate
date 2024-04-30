import { useCallback, useEffect, useMemo } from "react";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import AutoUpdatingCameraImage from "@/components/camera/AutoUpdatingCameraImage";
import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import { Toaster } from "@/components/ui/sonner";
import { Label } from "@/components/ui/label";
import useSWR from "swr";
import Heading from "../ui/heading";
import { Switch } from "../ui/switch";
import { usePersistence } from "@/hooks/use-persistence";
import { Skeleton } from "../ui/skeleton";
import { useCameraActivity } from "@/hooks/use-camera-activity";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ObjectType } from "@/types/ws";
import useDeepMemo from "@/hooks/use-deep-memo";
import { Card } from "../ui/card";
import { getIconForLabel } from "@/utils/iconUtil";
import { capitalizeFirstLetter } from "@/utils/stringUtil";

type ObjectSettingsProps = {
  selectedCamera?: string;
};

type Options = { [key: string]: boolean };

const emptyObject = Object.freeze({});

export default function ObjectSettings({
  selectedCamera,
}: ObjectSettingsProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const DEBUG_OPTIONS = [
    { param: "bbox", title: "Bounding boxes" },
    { param: "timestamp", title: "Timestamp" },
    { param: "zones", title: "Zones" },
    { param: "mask", title: "Masks" },
    { param: "motion", title: "Motion boxes" },
    { param: "regions", title: "Regions" },
  ];

  const [options, setOptions] = usePersistence<Options>(
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

  const searchParams = useMemo(
    () =>
      new URLSearchParams(
        Object.keys(options || {}).reduce((memo, key) => {
          //@ts-expect-error we know this is correct
          memo.push([key, options[key] === true ? "1" : "0"]);
          return memo;
        }, []),
      ),
    [options],
  );

  useEffect(() => {
    document.title = "Object Settings - Frigate";
  }, []);

  if (!cameraConfig) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex flex-col md:flex-row size-full">
      <Toaster position="top-center" />
      <div className="flex flex-col h-full w-full overflow-y-auto mt-2 md:mt-0 mb-10 md:mb-0 md:w-3/12 order-last md:order-none md:mr-2 rounded-lg border-secondary-foreground border-[1px] p-2 bg-background_alt">
        <Heading as="h3" className="my-2">
          Object Detection
        </Heading>
        <div className="text-sm text-muted-foreground mb-5 space-y-3">
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
            Debugging view shows a real-time view of detected objects and their
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
            <div className="flex flex-col w-full space-y-6">
              <div className="mt-2 space-y-6">
                <div className="my-2.5 flex flex-col gap-2.5">
                  {DEBUG_OPTIONS.map(({ param, title }) => (
                    <div
                      key={param}
                      className="flex justify-between items-center"
                    >
                      <Label
                        className="w-full text-primary capitalize cursor-pointer"
                        htmlFor={param}
                      >
                        {title}
                      </Label>
                      <Switch
                        key={param}
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
        <div className="flex md:w-7/12 md:grow md:h-dvh md:max-h-full">
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
    <div className="flex flex-col w-full overflow-y-auto">
      {objects && objects.length > 0 ? (
        objects.map((obj) => {
          return (
            <Card className="text-sm p-2 mb-1" key={obj.id}>
              <div className="flex flex-row items-center gap-3 pb-1">
                <div className="flex flex-row flex-1 items-center justify-start p-3 pl-1">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      backgroundColor: obj.stationary
                        ? "rgb(110,110,110)"
                        : getColorForObjectName(obj.label),
                    }}
                  >
                    {getIconForLabel(obj.label, "size-5 text-white")}
                  </div>
                  <div className="ml-3 text-lg">
                    {capitalizeFirstLetter(obj.label)}
                  </div>
                </div>
                <div className="flex flex-row w-8/12 items-end justify-end">
                  <div className="mr-2 text-md w-1/3">
                    <div className="flex flex-col items-end justify-end">
                      <p className="text-sm mb-1.5 text-primary-variant">
                        Score
                      </p>
                      {(obj.score * 100).toFixed(1).toString()}%
                    </div>
                  </div>
                  <div className="mr-2 text-md w-1/3">
                    <div className="flex flex-col items-end justify-end">
                      <p className="text-sm mb-1.5 text-primary-variant">
                        Ratio
                      </p>
                      {obj.ratio.toFixed(2).toString()}
                    </div>
                  </div>
                  <div className="mr-2 text-md w-1/3">
                    <div className="flex flex-col items-end justify-end">
                      <p className="text-sm mb-1.5 text-primary-variant">
                        Area
                      </p>
                      {obj.area.toString()}
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
