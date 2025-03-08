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
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ZoneFormValuesType, Polygon } from "@/types/canvas";
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
import { getAttributeLabels } from "@/utils/iconUtil";

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
  setActiveLine: React.Dispatch<React.SetStateAction<number | undefined>>;
  snapPoints: boolean;
  setSnapPoints: React.Dispatch<React.SetStateAction<boolean>>;
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
  setActiveLine,
  snapPoints,
  setSnapPoints,
}: ZoneEditPaneProps) {
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");

  const cameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.cameras)
      .filter((conf) => conf.ui.dashboard && conf.enabled_in_config)
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

  const [lineA, lineB, lineC, lineD] = useMemo(() => {
    const distances =
      polygon?.camera &&
      polygon?.name &&
      config?.cameras[polygon.camera]?.zones[polygon.name]?.distances;

    return Array.isArray(distances)
      ? distances.map((value) => parseFloat(value) || 0)
      : [undefined, undefined, undefined, undefined];
  }, [polygon, config]);

  const formSchema = z
    .object({
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
        )
        .refine(
          (value: string) => {
            return !value.includes(".");
          },
          {
            message: "Zone name must not contain a period.",
          },
        )
        .refine((value: string) => /^[a-zA-Z0-9_-]+$/.test(value), {
          message: "Zone name has an illegal character.",
        }),
      inertia: z.coerce
        .number()
        .min(1, {
          message: "Inertia must be above 0.",
        })
        .or(z.literal("")),
      loitering_time: z.coerce
        .number()
        .min(0, {
          message: "Loitering time must be greater than or equal to 0.",
        })
        .optional()
        .or(z.literal("")),
      isFinished: z.boolean().refine(() => polygon?.isFinished === true, {
        message: "The polygon drawing must be finished before saving.",
      }),
      objects: z.array(z.string()).optional(),
      review_alerts: z.boolean().default(false).optional(),
      review_detections: z.boolean().default(false).optional(),
      speedEstimation: z.boolean().default(false),
      lineA: z.coerce
        .number()
        .min(0.1, {
          message: "Distance must be greater than or equal to 0.1",
        })
        .optional()
        .or(z.literal("")),
      lineB: z.coerce
        .number()
        .min(0.1, {
          message: "Distance must be greater than or equal to 0.1",
        })
        .optional()
        .or(z.literal("")),
      lineC: z.coerce
        .number()
        .min(0.1, {
          message: "Distance must be greater than or equal to 0.1",
        })
        .optional()
        .or(z.literal("")),
      lineD: z.coerce
        .number()
        .min(0.1, {
          message: "Distance must be greater than or equal to 0.1",
        })
        .optional()
        .or(z.literal("")),
      speed_threshold: z.coerce
        .number()
        .min(0.1, {
          message: "Speed threshold must be greater than or equal to 0.1",
        })
        .optional()
        .or(z.literal("")),
    })
    .refine(
      (data) => {
        if (data.speedEstimation) {
          return !!data.lineA && !!data.lineB && !!data.lineC && !!data.lineD;
        }
        return true;
      },
      {
        message: "All distance fields must be filled to use speed estimation.",
        path: ["speedEstimation"],
      },
    )
    .refine(
      (data) => {
        // Prevent speed estimation when loitering_time is greater than 0
        return !(
          data.speedEstimation &&
          data.loitering_time &&
          data.loitering_time > 0
        );
      },
      {
        message:
          "Zones with loitering times greater than 0 should not be used with speed estimation.",
        path: ["loitering_time"],
      },
    );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      name: polygon?.name ?? "",
      inertia:
        polygon?.camera &&
        polygon?.name &&
        config?.cameras[polygon.camera]?.zones[polygon.name]?.inertia,
      loitering_time:
        polygon?.camera &&
        polygon?.name &&
        config?.cameras[polygon.camera]?.zones[polygon.name]?.loitering_time,
      isFinished: polygon?.isFinished ?? false,
      objects: polygon?.objects ?? [],
      speedEstimation: !!(lineA || lineB || lineC || lineD),
      lineA,
      lineB,
      lineC,
      lineD,
      speed_threshold:
        polygon?.camera &&
        polygon?.name &&
        config?.cameras[polygon.camera]?.zones[polygon.name]?.speed_threshold,
    },
  });

  useEffect(() => {
    if (
      form.watch("speedEstimation") &&
      polygon &&
      polygon.points.length !== 4
    ) {
      toast.error(
        "Speed estimation has been disabled for this zone. Zones with speed estimation must have exactly 4 points.",
      );
      form.setValue("speedEstimation", false);
    }
  }, [polygon, form]);

  const saveToConfig = useCallback(
    async (
      {
        name: zoneName,
        inertia,
        loitering_time,
        objects: form_objects,
        speedEstimation,
        lineA,
        lineB,
        lineC,
        lineD,
        speed_threshold,
      }: ZoneFormValuesType, // values submitted via the form
      objects: string[],
    ) => {
      if (!scaledWidth || !scaledHeight || !polygon) {
        return;
      }
      let mutatedConfig = config;
      let alertQueries = "";
      let detectionQueries = "";

      const renamingZone = zoneName != polygon.name && polygon.name != "";

      if (renamingZone) {
        // rename - delete old zone and replace with new
        const zoneInAlerts =
          cameraConfig?.review.alerts.required_zones.includes(polygon.name) ??
          false;
        const zoneInDetections =
          cameraConfig?.review.detections.required_zones.includes(
            polygon.name,
          ) ?? false;

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
        } catch (error) {
          toast.error(`Failed to save config changes.`, {
            position: "top-center",
          });
          return;
        }

        // make sure new zone name is readded to review
        ({ alertQueries, detectionQueries } = reviewQueries(
          zoneName,
          zoneInAlerts,
          zoneInDetections,
          polygon.camera,
          mutatedConfig?.cameras[polygon.camera]?.review.alerts
            .required_zones || [],
          mutatedConfig?.cameras[polygon.camera]?.review.detections
            .required_zones || [],
        ));
      }

      const coordinates = flattenPoints(
        interpolatePoints(polygon.points, scaledWidth, scaledHeight, 1, 1),
      ).join(",");

      let objectQueries = objects
        .map(
          (object) =>
            `&cameras.${polygon?.camera}.zones.${zoneName}.objects=${object}`,
        )
        .join("");

      const same_objects =
        form_objects.length == objects.length &&
        form_objects.every(function (element, index) {
          return element === objects[index];
        });

      // deleting objects
      if (!objectQueries && !same_objects && !renamingZone) {
        objectQueries = `&cameras.${polygon?.camera}.zones.${zoneName}.objects`;
      }

      let inertiaQuery = "";
      if (inertia) {
        inertiaQuery = `&cameras.${polygon?.camera}.zones.${zoneName}.inertia=${inertia}`;
      }

      let loiteringTimeQuery = "";
      if (loitering_time >= 0) {
        loiteringTimeQuery = `&cameras.${polygon?.camera}.zones.${zoneName}.loitering_time=${loitering_time}`;
      }

      let distancesQuery = "";
      const distances = [lineA, lineB, lineC, lineD].filter(Boolean).join(",");
      if (speedEstimation) {
        distancesQuery = `&cameras.${polygon?.camera}.zones.${zoneName}.distances=${distances}`;
      } else {
        if (distances != "") {
          distancesQuery = `&cameras.${polygon?.camera}.zones.${zoneName}.distances`;
        }
      }

      let speedThresholdQuery = "";
      if (speed_threshold >= 0 && speedEstimation) {
        speedThresholdQuery = `&cameras.${polygon?.camera}.zones.${zoneName}.speed_threshold=${speed_threshold}`;
      } else {
        if (
          polygon?.camera &&
          polygon?.name &&
          config?.cameras[polygon.camera]?.zones[polygon.name]?.speed_threshold
        ) {
          speedThresholdQuery = `&cameras.${polygon?.camera}.zones.${zoneName}.speed_threshold`;
        }
      }

      axios
        .put(
          `config/set?cameras.${polygon?.camera}.zones.${zoneName}.coordinates=${coordinates}${inertiaQuery}${loiteringTimeQuery}${speedThresholdQuery}${distancesQuery}${objectQueries}${alertQueries}${detectionQueries}`,
          { requires_restart: 0 },
        )
        .then((res) => {
          if (res.status === 200) {
            toast.success(
              `Zone (${zoneName}) has been saved. Restart Frigate to apply changes.`,
              {
                position: "top-center",
              },
            );
            updateConfig();
          } else {
            toast.error(`Failed to save config changes: ${res.statusText}`, {
              position: "top-center",
            });
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(`Failed to save config changes: ${errorMessage}`, {
            position: "top-center",
          });
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

    saveToConfig(
      values as ZoneFormValuesType,
      polygons[activePolygonIndex].objects,
    );

    if (onSave) {
      onSave();
    }
  }

  useEffect(() => {
    document.title = "Edit Zone - Frigate";
  }, []);

  if (!polygon) {
    return;
  }

  return (
    <>
      <Toaster position="top-center" closeButton={true} />
      <Heading as="h3" className="my-2">
        {polygon.name.length ? "Edit" : "New"} Zone
      </Heading>
      <div className="my-2 text-sm text-muted-foreground">
        <p>
          Zones allow you to define a specific area of the frame so you can
          determine whether or not an object is within a particular area.
        </p>
      </div>
      <Separator className="my-3 bg-secondary" />
      {polygons && activePolygonIndex !== undefined && (
        <div className="my-2 flex w-full flex-row justify-between text-sm">
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
            snapPoints={snapPoints}
            setSnapPoints={setSnapPoints}
          />
        </div>
      )}
      <div className="mb-3 text-sm text-muted-foreground">
        Click to draw a polygon on the image.
      </div>

      <Separator className="my-3 bg-secondary" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-2 space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    className="text-md w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
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
          <Separator className="my-2 flex bg-secondary" />
          <FormField
            control={form.control}
            name="inertia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inertia</FormLabel>
                <FormControl>
                  <Input
                    className="text-md w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
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
          <Separator className="my-2 flex bg-secondary" />
          <FormField
            control={form.control}
            name="loitering_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loitering Time</FormLabel>
                <FormControl>
                  <Input
                    className="text-md w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
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
          <Separator className="my-2 flex bg-secondary" />
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

          <Separator className="my-2 flex bg-secondary" />
          <FormField
            control={form.control}
            name="speedEstimation"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center space-x-2">
                  <FormControl>
                    <div className="my-2.5 flex w-full items-center justify-between">
                      <FormLabel
                        className="cursor-pointer text-primary"
                        htmlFor="allLabels"
                      >
                        Speed Estimation
                      </FormLabel>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          if (
                            checked &&
                            polygons &&
                            activePolygonIndex &&
                            polygons[activePolygonIndex].points.length !== 4
                          ) {
                            toast.error(
                              "Zones with speed estimation must have exactly 4 points.",
                            );
                            return;
                          }
                          const loiteringTime =
                            form.getValues("loitering_time");

                          if (checked && loiteringTime && loiteringTime > 0) {
                            toast.error(
                              "Zones with loitering times greater than 0 should not be used with speed estimation.",
                            );
                          }
                          field.onChange(checked);
                        }}
                      />
                    </div>
                  </FormControl>
                </div>
                <FormDescription>
                  Enable speed estimation for objects in this zone. The zone
                  must have exactly 4 points.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("speedEstimation") &&
            polygons &&
            activePolygonIndex &&
            polygons[activePolygonIndex].points.length === 4 && (
              <>
                <FormField
                  control={form.control}
                  name="lineA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Line A distance (
                        {config?.ui.unit_system == "imperial"
                          ? "feet"
                          : "meters"}
                        )
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="text-md w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                          {...field}
                          onFocus={() => setActiveLine(1)}
                          onBlur={() => setActiveLine(undefined)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lineB"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Line B distance (
                        {config?.ui.unit_system == "imperial"
                          ? "feet"
                          : "meters"}
                        )
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="text-md w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                          {...field}
                          onFocus={() => setActiveLine(2)}
                          onBlur={() => setActiveLine(undefined)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lineC"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Line C distance (
                        {config?.ui.unit_system == "imperial"
                          ? "feet"
                          : "meters"}
                        )
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="text-md w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                          {...field}
                          onFocus={() => setActiveLine(3)}
                          onBlur={() => setActiveLine(undefined)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lineD"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Line D distance (
                        {config?.ui.unit_system == "imperial"
                          ? "feet"
                          : "meters"}
                        )
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="text-md w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                          {...field}
                          onFocus={() => setActiveLine(4)}
                          onBlur={() => setActiveLine(undefined)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Separator className="my-2 flex bg-secondary" />
                <FormField
                  control={form.control}
                  name="speed_threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Speed Threshold (
                        {config?.ui.unit_system == "imperial" ? "mph" : "kph"})
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="text-md w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Specifies a minimum speed for objects to be considered
                        in this zone.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

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
            <Button
              className="flex flex-1"
              aria-label="Cancel"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              variant="select"
              disabled={isLoading}
              className="flex flex-1"
              aria-label="Save"
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

  const attributeLabels = useMemo(() => {
    if (!config) {
      return [];
    }

    return getAttributeLabels(config);
  }, [config]);

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

    cameraConfig.objects.track.forEach((label) => {
      if (!attributeLabels.includes(label)) {
        labels.add(label);
      }
    });

    if (zoneName) {
      if (cameraConfig.zones[zoneName]) {
        cameraConfig.zones[zoneName].objects.forEach((label) => {
          if (!attributeLabels.includes(label)) {
            labels.add(label);
          }
        });
      }
    }

    return [...labels].sort() || [];
  }, [config, cameraConfig, attributeLabels, zoneName]);

  const [currentLabels, setCurrentLabels] = useState<string[] | undefined>(
    selectedLabels,
  );

  useEffect(() => {
    updateLabelFilter(currentLabels);
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLabels]);

  return (
    <>
      <div className="scrollbar-container h-auto overflow-y-auto overflow-x-hidden">
        <div className="my-2.5 flex items-center justify-between">
          <Label className="cursor-pointer text-primary" htmlFor="allLabels">
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
            <div key={item} className="flex items-center justify-between">
              <Label
                className="w-full cursor-pointer capitalize text-primary"
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
