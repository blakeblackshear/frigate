import Heading from "../ui/heading";
import { Separator } from "../ui/separator";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useCallback, useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import PolygonEditControls from "./PolygonEditControls";
import { FaCheckCircle } from "react-icons/fa";
import { Polygon } from "@/types/canvas";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import {
  flattenPoints,
  interpolatePoints,
  parseCoordinates,
} from "@/utils/canvasUtil";
import axios from "axios";
import { toast } from "sonner";
import { Toaster } from "../ui/sonner";
import ActivityIndicator from "../indicators/activity-indicator";

type MotionMaskEditPaneProps = {
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

export default function MotionMaskEditPane({
  polygons,
  setPolygons,
  activePolygonIndex,
  scaledWidth,
  scaledHeight,
  isLoading,
  setIsLoading,
  onSave,
  onCancel,
}: MotionMaskEditPaneProps) {
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

    const count = polygons.filter((poly) => poly.type == "motion_mask").length;

    return `Motion Mask ${count + 1}`;
  }, [polygons]);

  const formSchema = z
    .object({
      polygon: z.object({ name: z.string(), isFinished: z.boolean() }),
    })
    .refine(() => polygon?.isFinished === true, {
      message: "The polygon drawing must be finished before saving.",
      path: ["polygon.isFinished"],
    });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      polygon: { isFinished: polygon?.isFinished ?? false, name: defaultName },
    },
  });

  const saveToConfig = useCallback(async () => {
    if (!scaledWidth || !scaledHeight || !polygon || !cameraConfig) {
      return;
    }

    const coordinates = flattenPoints(
      interpolatePoints(polygon.points, scaledWidth, scaledHeight, 1, 1),
    ).join(",");

    let index = Array.isArray(cameraConfig.motion.mask)
      ? cameraConfig.motion.mask.length
      : cameraConfig.motion.mask
        ? 1
        : 0;

    const editingMask = polygon.name.length > 0;

    // editing existing mask, not creating a new one
    if (editingMask) {
      index = polygon.typeIndex;
    }

    const filteredMask = (
      Array.isArray(cameraConfig.motion.mask)
        ? cameraConfig.motion.mask
        : [cameraConfig.motion.mask]
    ).filter((_, currentIndex) => currentIndex !== index);

    filteredMask.splice(index, 0, coordinates);

    const queryString = filteredMask
      .map((pointsArray) => {
        const coordinates = flattenPoints(parseCoordinates(pointsArray)).join(
          ",",
        );
        return `cameras.${polygon?.camera}.motion.mask=${coordinates}&`;
      })
      .join("");

    axios
      .put(`config/set?${queryString}`, {
        requires_restart: 0,
      })
      .then((res) => {
        if (res.status === 200) {
          toast.success(`${polygon.name || "Motion Mask"} has been saved.`, {
            position: "top-center",
          });
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
  }, [
    updateConfig,
    polygon,
    scaledWidth,
    scaledHeight,
    setIsLoading,
    cameraConfig,
  ]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (activePolygonIndex === undefined || !values || !polygons) {
      return;
    }
    setIsLoading(true);

    saveToConfig();
    if (onSave) {
      onSave();
    }
  }

  useEffect(() => {
    document.title = "Edit Motion Mask - Frigate";
  }, []);

  if (!polygon) {
    return;
  }

  return (
    <>
      <Toaster position="top-center" />
      <Heading as="h3" className="my-2">
        {polygon.name.length ? "Edit" : "New"} Motion Mask
      </Heading>
      <div className="text-sm text-muted-foreground my-2">
        <p>
          Motion masks are used to prevent unwanted types of motion from
          triggering detection. Over masking will make it more difficult for
          objects to be tracked.
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
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 flex flex-col flex-1"
        >
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
            name="polygon.isFinished"
            render={() => (
              <FormItem>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-col flex-1 justify-end">
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
