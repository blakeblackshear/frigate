import Heading from "../ui/heading";
import { Separator } from "../ui/separator";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCallback, useEffect, useMemo } from "react";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ObjectMaskFormValuesType, Polygon } from "@/types/canvas";
import PolygonEditControls from "./PolygonEditControls";
import { FaCheckCircle } from "react-icons/fa";
import {
  flattenPoints,
  interpolatePoints,
  parseCoordinates,
} from "@/utils/canvasUtil";
import axios from "axios";
import { toast } from "sonner";
import { Toaster } from "../ui/sonner";
import ActivityIndicator from "../indicators/activity-indicator";
import { getAttributeLabels } from "@/utils/iconUtil";

type ObjectMaskEditPaneProps = {
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

export default function ObjectMaskEditPane({
  polygons,
  setPolygons,
  activePolygonIndex,
  scaledWidth,
  scaledHeight,
  isLoading,
  setIsLoading,
  onSave,
  onCancel,
}: ObjectMaskEditPaneProps) {
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");

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

  const defaultName = useMemo(() => {
    if (!polygons) {
      return;
    }

    const count = polygons.filter((poly) => poly.type == "object_mask").length;

    let objectType = "";
    const objects = polygon?.objects[0];
    if (objects === undefined) {
      objectType = "all objects";
    } else {
      objectType = objects;
    }

    return `Object Mask ${count + 1} (${objectType})`;
  }, [polygons, polygon]);

  const formSchema = z
    .object({
      objects: z.string(),
      polygon: z.object({ isFinished: z.boolean(), name: z.string() }),
    })
    .refine(() => polygon?.isFinished === true, {
      message: "The polygon drawing must be finished before saving.",
      path: ["polygon.isFinished"],
    });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      objects: polygon?.objects[0] ?? "all_labels",
      polygon: { isFinished: polygon?.isFinished ?? false, name: defaultName },
    },
  });

  const saveToConfig = useCallback(
    async (
      { objects: form_objects }: ObjectMaskFormValuesType, // values submitted via the form
    ) => {
      if (!scaledWidth || !scaledHeight || !polygon || !cameraConfig) {
        return;
      }

      const coordinates = flattenPoints(
        interpolatePoints(polygon.points, scaledWidth, scaledHeight, 1, 1),
      ).join(",");

      let queryString = "";
      let configObject;
      let createFilter = false;
      let globalMask = false;
      let filteredMask = [coordinates];
      const editingMask = polygon.name.length > 0;

      // global mask on camera for all objects
      if (form_objects == "all_labels") {
        configObject = cameraConfig.objects.mask;
        globalMask = true;
      } else {
        if (
          cameraConfig.objects.filters[form_objects] &&
          cameraConfig.objects.filters[form_objects].mask !== null
        ) {
          configObject = cameraConfig.objects.filters[form_objects].mask;
        } else {
          createFilter = true;
        }
      }

      if (!createFilter) {
        let index = Array.isArray(configObject)
          ? configObject.length
          : configObject
            ? 1
            : 0;

        // editing existing mask, not creating a new one
        if (editingMask) {
          index = polygon.typeIndex;
        }

        filteredMask = (
          Array.isArray(configObject) ? configObject : [configObject as string]
        ).filter((_, currentIndex) => currentIndex !== index);

        filteredMask.splice(index, 0, coordinates);
      }

      queryString = filteredMask
        .map((pointsArray) => {
          const coordinates = flattenPoints(parseCoordinates(pointsArray)).join(
            ",",
          );
          return globalMask
            ? `cameras.${polygon?.camera}.objects.mask=${coordinates}&`
            : `cameras.${polygon?.camera}.objects.filters.${form_objects}.mask=${coordinates}&`;
        })
        .join("");

      if (!queryString) {
        return;
      }

      axios
        .put(`config/set?${queryString}`, {
          requires_restart: 0,
        })
        .then((res) => {
          if (res.status === 200) {
            toast.success(
              `${polygon.name || "Object Mask"} has been saved. Restart Frigate to apply changes.`,
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

    saveToConfig(values as ObjectMaskFormValuesType);
    if (onSave) {
      onSave();
    }
  }

  useEffect(() => {
    document.title = "Edit Object Mask - Frigate";
  }, []);

  if (!polygon) {
    return;
  }

  return (
    <>
      <Toaster position="top-center" closeButton={true} />
      <Heading as="h3" className="my-2">
        {polygon.name.length ? "Edit" : "New"} Object Mask
      </Heading>
      <div className="my-2 text-sm text-muted-foreground">
        <p>
          Object filter masks are used to filter out false positives for a given
          object type based on location.
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
          />
        </div>
      )}
      <div className="mb-3 text-sm text-muted-foreground">
        Click to draw a polygon on the image.
      </div>

      <Separator className="my-3 bg-secondary" />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col space-y-6"
        >
          <div>
            <FormField
              control={form.control}
              name="polygon.name"
              render={() => (
                <FormItem>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="objects"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objects</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={polygon.name.length != 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an object type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <ZoneObjectSelector camera={polygon.camera} />
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The object type that that applies to this object mask.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="polygon.isFinished"
              render={() => (
                <FormItem>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex flex-1 flex-col justify-end">
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
          </div>
        </form>
      </Form>
    </>
  );
}

type ZoneObjectSelectorProps = {
  camera: string;
};

export function ZoneObjectSelector({ camera }: ZoneObjectSelectorProps) {
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
    if (!config || !cameraConfig) {
      return [];
    }

    const labels = new Set<string>();

    Object.values(config.cameras).forEach((camera) => {
      camera.objects.track.forEach((label) => {
        if (!attributeLabels.includes(label)) {
          labels.add(label);
        }
      });
    });

    cameraConfig.objects.track.forEach((label) => {
      if (!attributeLabels.includes(label)) {
        labels.add(label);
      }
    });

    return [...labels].sort();
  }, [config, cameraConfig, attributeLabels]);

  return (
    <>
      <SelectGroup>
        <SelectItem value="all_labels">All object types</SelectItem>
        <SelectSeparator className="bg-secondary" />
        {allLabels.map((item) => (
          <SelectItem key={item} value={item}>
            {item.replaceAll("_", " ").charAt(0).toUpperCase() + item.slice(1)}
          </SelectItem>
        ))}
      </SelectGroup>
    </>
  );
}
