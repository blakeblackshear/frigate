import Heading from "../ui/heading";
import { Separator } from "../ui/separator";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ATTRIBUTE_LABELS, FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import { isMobile } from "react-device-detect";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Polygon } from "@/types/canvas";
import { reviewQueries } from "@/utils/zoneEdutUtil";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import PolygonEditControls from "./PolygonEditControls";
import { FaCheckCircle } from "react-icons/fa";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { flattenPoints, interpolatePoints } from "@/utils/canvasUtil";
import ActivityIndicator from "../indicators/activity-indicator";

type ZoneEditPaneProps = {
  polygons?: Polygon[];
  setPolygons: React.Dispatch<React.SetStateAction<Polygon[]>>;
  activePolygonIndex?: number;
  scaledWidth?: number;
  scaledHeight?: number;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  onSave?: () => void;
  onCancel?: () => void;
};

export default function ZoneEditPane({
  polygons,
  setPolygons,
  activePolygonIndex,
  scaledWidth,
  scaledHeight,
  isLoading,
  setIsLoading,
  onSave,
  onCancel,
}: ZoneEditPaneProps) {
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");

  const cameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.cameras)
      .filter((conf) => conf.ui.dashboard && conf.enabled)
      .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
  }, [config]);

  const polygon = useMemo(() => {
    if (polygons && activePolygonIndex !== undefined) {
      return polygons[activePolygonIndex];
    } else {
      return null;
    }
  }, [polygons, activePolygonIndex]);

  const cameraConfig = useMemo(() => {
    if (polygon?.camera && config) {
      return config.cameras[polygon.camera];
    }
  }, [polygon, config]);

  const formSchema = z.object({
    name: z
      .string()
      .min(2, {
        message: "Zone name must be at least 2 characters.",
      })
      .transform((val: string) => val.trim().replace(/\s+/g, "_"))
      .refine(
        (value: string) => {
          return !cameras.map((cam) => cam.name).includes(value);
        },
        {
          message: "Zone name must not be the name of a camera.",
        },
      )
      .refine(
        (value: string) => {
          const otherPolygonNames =
            polygons
              ?.filter((_, index) => index !== activePolygonIndex)
              .map((polygon) => polygon.name) || [];

          return !otherPolygonNames.includes(value);
        },
        {
          message: "Zone name already exists on this camera.",
        },
      ),
    inertia: z.coerce.number().min(1, {
      message: "Inertia must be above 0.",
    }),
    loitering_time: z.coerce.number().min(0, {
      message: "Loitering time must be greater than or equal to 0.",
    }),
    isFinished: z.boolean().refine(() => polygon?.isFinished === true, {
      message: "The polygon drawing must be finished before saving.",
    }),
    objects: z.array(z.string()).optional(),
    review_alerts: z.boolean().default(false).optional(),
    review_detections: z.boolean().default(false).optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: polygon?.name ?? "",
      inertia:
        (polygon?.camera &&
          polygon?.name &&
          config?.cameras[polygon.camera]?.zones[polygon.name]?.inertia) ||
        3,
      loitering_time:
        (polygon?.camera &&
          polygon?.name &&
          config?.cameras[polygon.camera]?.zones[polygon.name]
            ?.loitering_time) ||
        0,
      isFinished: polygon?.isFinished ?? false,
      objects: polygon?.objects ?? [],
      review_alerts:
        (polygon?.camera &&
          polygon?.name &&
          config?.cameras[
            polygon.camera
          ]?.review.alerts.required_zones.includes(polygon.name)) ||
        false,
      review_detections:
        (polygon?.camera &&
          polygon?.name &&
          config?.cameras[
            polygon.camera
          ]?.review.detections.required_zones.includes(polygon.name)) ||
        false,
    },
  });

  // const [changedValue, setChangedValue] = useState(false);
  type FormValuesType = {
    name: string;
    inertia: number;
    loitering_time: number;
    isFinished: boolean;
    objects: string[];
    review_alerts: boolean;
    review_detections: boolean;
  };

  // const requiredDetectionZones = useMemo(
  //   () => cameraConfig?.review.detections.required_zones,
  //   [cameraConfig],
  // );

  // const requiredAlertZones = useMemo(
  //   () => cameraConfig?.review.alerts.required_zones,
  //   [cameraConfig],
  // );

  // const [alertQueries, setAlertQueries] = useState("");
  // const [detectionQueries, setDetectionQueries] = useState("");

  // useEffect(() => {
  //   console.log("config updated!", config);
  // }, [config]);

  // useEffect(() => {
  //   console.log("camera config updated!", cameraConfig);
  // }, [cameraConfig]);

  // useEffect(() => {
  //   console.log("required zones updated!", requiredZones);
  // }, [requiredZones]);

  const saveToConfig = useCallback(
    async (
      {
        name,
        inertia,
        loitering_time,
        objects: form_objects,
        review_alerts,
        review_detections,
      }: FormValuesType, // values submitted via the form
      objects: string[],
    ) => {
      if (!scaledWidth || !scaledHeight || !polygon) {
        return;
      }
      // console.log("loitering time", loitering_time);
      // const alertsZones = config?.cameras[camera]?.review.alerts.required_zones;

      // const detectionsZones =
      //   config?.cameras[camera]?.review.detections.required_zones;
      let mutatedConfig = config;

      const renamingZone = name != polygon.name && polygon.name != "";

      if (renamingZone) {
        // rename - delete old zone and replace with new
        const {
          alertQueries: renameAlertQueries,
          detectionQueries: renameDetectionQueries,
        } = reviewQueries(
          polygon.name,
          false,
          false,
          polygon.camera,
          cameraConfig?.review.alerts.required_zones || [],
          cameraConfig?.review.detections.required_zones || [],
        );

        try {
          await axios.put(
            `config/set?cameras.${polygon.camera}.zones.${polygon.name}${renameAlertQueries}${renameDetectionQueries}`,
            {
              requires_restart: 0,
            },
          );

          // Wait for the config to be updated
          mutatedConfig = await updateConfig();
          // console.log("this should be updated...", mutatedConfig.cameras);
          // console.log("check original config object...", config);
        } catch (error) {
          toast.error(`Failed to save config changes.`, {
            position: "top-center",
          });
          return;
        }
      }

      // console.log("out of try except", mutatedConfig);

      const coordinates = flattenPoints(
        interpolatePoints(polygon.points, scaledWidth, scaledHeight, 1, 1),
      ).join(",");
      // const foo = config.cameras["doorbell"].zones["outside"].objects;

      let objectQueries = objects
        .map(
          (object) =>
            `&cameras.${polygon?.camera}.zones.${name}.objects=${object}`,
        )
        .join("");

      const same_objects =
        form_objects.length == objects.length &&
        form_objects.every(function (element, index) {
          return element === objects[index];
        });

      // deleting objects
      if (!objectQueries && !same_objects && !renamingZone) {
        // console.log("deleting objects");
        objectQueries = `&cameras.${polygon?.camera}.zones.${name}.objects`;
      }

      const { alertQueries, detectionQueries } = reviewQueries(
        name,
        review_alerts,
        review_detections,
        polygon.camera,
        mutatedConfig?.cameras[polygon.camera]?.review.alerts.required_zones ||
          [],
        mutatedConfig?.cameras[polygon.camera]?.review.detections
          .required_zones || [],
      );

      // console.log("object queries:", objectQueries);
      // console.log("alert queries:", alertQueries);
      // console.log("detection queries:", detectionQueries);

      // console.log(
      //   `config/set?cameras.${polygon?.camera}.zones.${name}.coordinates=${coordinates}&cameras.${polygon?.camera}.zones.${name}.inertia=${inertia}&cameras.${polygon?.camera}.zones.${name}.loitering_time=${loitering_time}${objectQueries}${alertQueries}${detectionQueries}`,
      // );

      axios
        .put(
          `config/set?cameras.${polygon?.camera}.zones.${name}.coordinates=${coordinates}&cameras.${polygon?.camera}.zones.${name}.inertia=${inertia}&cameras.${polygon?.camera}.zones.${name}.loitering_time=${loitering_time}${objectQueries}${alertQueries}${detectionQueries}`,
          { requires_restart: 0 },
        )
        .then((res) => {
          if (res.status === 200) {
            toast.success(`Zone ${name} saved.`, {
              position: "top-center",
            });
            // setChangedValue(false);
            updateConfig();
          } else {
            toast.error(`Failed to save config changes: ${res.statusText}`, {
              position: "top-center",
            });
          }
        })
        .catch((error) => {
          toast.error(
            `Failed to save config changes: ${error.response.data.message}`,
            { position: "top-center" },
          );
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [
      config,
      updateConfig,
      polygon,
      scaledWidth,
      scaledHeight,
      setIsLoading,
      cameraConfig,
    ],
  );

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (activePolygonIndex === undefined || !values || !polygons) {
      return;
    }
    setIsLoading(true);
    // polygons[activePolygonIndex].name = values.name;
    // console.log("form values", values);
    // console.log(
    //   "string",

    //   flattenPoints(
    //     interpolatePoints(polygon.points, scaledWidth, scaledHeight, 1, 1),
    //   ).join(","),
    // );
    // console.log("active polygon", polygons[activePolygonIndex]);

    saveToConfig(
      values as FormValuesType,
      polygons[activePolygonIndex].objects,
    );

    if (onSave) {
      onSave();
    }
  }

  if (!polygon) {
    return;
  }

  return (
    <>
      <Toaster position="top-center" />
      <Heading as="h3" className="my-2">
        {polygon.name.length ? "Edit" : "New"} Zone
      </Heading>
      <div className="text-sm text-muted-foreground my-2">
        <p>
          Zones allow you to define a specific area of the frame so you can
          determine whether or not an object is within a particular area.
        </p>
      </div>
      <Separator className="my-3 bg-secondary" />
      {polygons && activePolygonIndex !== undefined && (
        <div className="flex flex-row my-2 text-sm w-full justify-between">
          <div className="my-1 inline-flex">
            {polygons[activePolygonIndex].points.length}{" "}
            {polygons[activePolygonIndex].points.length > 1 ||
            polygons[activePolygonIndex].points.length == 0
              ? "points"
              : "point"}
            {polygons[activePolygonIndex].isFinished && (
              <FaCheckCircle className="ml-2 size-5" />
            )}
          </div>
          <PolygonEditControls
            polygons={polygons}
            setPolygons={setPolygons}
            activePolygonIndex={activePolygonIndex}
          />
        </div>
      )}
      <div className="mb-3 text-sm text-muted-foreground">
        Click to draw a polygon on the image.
      </div>

      <Separator className="my-3 bg-secondary" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    className="w-full p-2 border border-input bg-background text-secondary-foreground hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                    placeholder="Enter a name..."
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Name must be at least 2 characters and must not be the name of
                  a camera or another zone.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex my-2">
            <Separator className="bg-secondary" />
          </div>
          <FormField
            control={form.control}
            name="inertia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inertia</FormLabel>
                <FormControl>
                  <Input
                    className="w-full p-2 border border-input bg-background text-secondary-foreground hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                    placeholder="3"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Specifies how many frames that an object must be in a zone
                  before they are considered in the zone. <em>Default: 3</em>
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex my-2">
            <Separator className="bg-secondary" />
          </div>
          <FormField
            control={form.control}
            name="loitering_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loitering Time</FormLabel>
                <FormControl>
                  <Input
                    className="w-full p-2 border border-input bg-background text-secondary-foreground hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                    placeholder="0"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Sets a minimum amount of time in seconds that the object must
                  be in the zone for it to activate. <em>Default: 0</em>
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex my-2">
            <Separator className="bg-secondary" />
          </div>
          <FormItem>
            <FormLabel>Objects</FormLabel>
            <FormDescription>
              List of objects that apply to this zone.
            </FormDescription>
            <ZoneObjectSelector
              camera={polygon.camera}
              zoneName={polygon.name}
              selectedLabels={polygon.objects}
              updateLabelFilter={(objects) => {
                if (activePolygonIndex === undefined || !polygons) {
                  return;
                }
                const updatedPolygons = [...polygons];
                const activePolygon = updatedPolygons[activePolygonIndex];
                updatedPolygons[activePolygonIndex] = {
                  ...activePolygon,
                  objects: objects ?? [],
                };
                setPolygons(updatedPolygons);
              }}
            />
          </FormItem>
          <div className="flex my-2">
            <Separator className="bg-secondary" />
          </div>
          <FormField
            control={form.control}
            name="review_alerts"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Alerts</FormLabel>
                  <FormDescription>
                    When an object enters this zone, ensure it is marked as an
                    alert.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="review_detections"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Detections</FormLabel>
                  <FormDescription>
                    When an object enters this zone, ensure it is marked as a
                    detection.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isFinished"
            render={() => (
              <FormItem>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-row gap-2 pt-5">
            <Button className="flex flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="select"
              disabled={isLoading}
              className="flex flex-1"
              type="submit"
            >
              {isLoading ? (
                <div className="flex flex-row items-center gap-2">
                  <ActivityIndicator />
                  <span>Saving...</span>
                </div>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}

type ZoneObjectSelectorProps = {
  camera: string;
  zoneName: string;
  selectedLabels: string[];
  updateLabelFilter: (labels: string[] | undefined) => void;
};

export function ZoneObjectSelector({
  camera,
  zoneName,
  selectedLabels,
  updateLabelFilter,
}: ZoneObjectSelectorProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const cameraConfig = useMemo(() => {
    if (config && camera) {
      return config.cameras[camera];
    }
  }, [config, camera]);

  const allLabels = useMemo<string[]>(() => {
    if (!cameraConfig || !config) {
      return [];
    }

    const labels = new Set<string>();

    Object.values(config.cameras).forEach((camera) => {
      camera.objects.track.forEach((label) => {
        if (!ATTRIBUTE_LABELS.includes(label)) {
          labels.add(label);
        }
      });
    });

    cameraConfig.objects.track.forEach((label) => {
      if (!ATTRIBUTE_LABELS.includes(label)) {
        labels.add(label);
      }
    });

    if (zoneName) {
      if (cameraConfig.zones[zoneName]) {
        cameraConfig.zones[zoneName].objects.forEach((label) => {
          if (!ATTRIBUTE_LABELS.includes(label)) {
            labels.add(label);
          }
        });
      }
    }

    return [...labels].sort() || [];
  }, [config, cameraConfig, zoneName]);

  const [currentLabels, setCurrentLabels] = useState<string[] | undefined>(
    selectedLabels,
  );

  useEffect(() => {
    updateLabelFilter(currentLabels);
  }, [currentLabels, updateLabelFilter]);

  return (
    <>
      <div className="h-auto overflow-y-auto overflow-x-hidden">
        <div className="flex justify-between items-center my-2.5">
          <Label className="text-primary cursor-pointer" htmlFor="allLabels">
            All Objects
          </Label>
          <Switch
            className="ml-1"
            id="allLabels"
            checked={!currentLabels?.length}
            onCheckedChange={(isChecked) => {
              if (isChecked) {
                setCurrentLabels([]);
              }
            }}
          />
        </div>
        <Separator />
        <div className="my-2.5 flex flex-col gap-2.5">
          {allLabels.map((item) => (
            <div key={item} className="flex justify-between items-center">
              <Label
                className="w-full text-primary capitalize cursor-pointer"
                htmlFor={item}
              >
                {item.replaceAll("_", " ")}
              </Label>
              <Switch
                key={item}
                className="ml-1"
                id={item}
                checked={currentLabels?.includes(item) ?? false}
                onCheckedChange={(isChecked) => {
                  if (isChecked) {
                    const updatedLabels = currentLabels
                      ? [...currentLabels]
                      : [];

                    updatedLabels.push(item);
                    setCurrentLabels(updatedLabels);
                  } else {
                    const updatedLabels = currentLabels
                      ? [...currentLabels]
                      : [];

                    // can not deselect the last item
                    if (updatedLabels.length > 1) {
                      updatedLabels.splice(updatedLabels.indexOf(item), 1);
                      setCurrentLabels(updatedLabels);
                    }
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
