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
import { useEffect, useMemo, useState } from "react";
import { ATTRIBUTE_LABELS, FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import { isMobile } from "react-device-detect";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Polygon } from "@/types/canvas";
import PolygonEditControls from "./PolygonEditControls";

type ObjectMaskEditPaneProps = {
  polygons?: Polygon[];
  setPolygons: React.Dispatch<React.SetStateAction<Polygon[]>>;
  activePolygonIndex?: number;
  onSave?: () => void;
  onCancel?: () => void;
};

export default function ObjectMaskEditPane({
  polygons,
  setPolygons,
  activePolygonIndex,
  onSave,
  onCancel,
}: ObjectMaskEditPaneProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

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

  const formSchema = z
    .object({
      objects: z.string(),
      polygon: z.object({ isFinished: z.boolean() }),
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
      polygon: { isFinished: polygon?.isFinished ?? false },
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // polygons[activePolygonIndex].name = values.name;
    console.log("form values", values);
    console.log("active polygon", polygons[activePolygonIndex]);
    // make sure polygon isFinished
    onSave();
  }

  if (!polygon) {
    return;
  }

  return (
    <>
      <Heading as="h3" className="my-2">
        Object Mask
      </Heading>
      <Separator className="my-3 bg-secondary" />
      {polygons && activePolygonIndex !== undefined && (
        <div className="flex flex-row my-2 text-sm w-full justify-between">
          <div className="my-1">
            {polygons[activePolygonIndex].points.length} points
          </div>
          {polygons[activePolygonIndex].isFinished ? <></> : <></>}
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
            name="objects"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Objects</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an object type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <ZoneObjectSelector
                      camera={polygon.camera}
                      updateLabelFilter={(objects) => {
                        // console.log(objects);
                      }}
                    />
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
          <div className="flex flex-row gap-2 pt-5">
            <Button className="flex flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="select" className="flex flex-1" type="submit">
              Save
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}

type ZoneObjectSelectorProps = {
  camera: string;
  updateLabelFilter: (labels: string[] | undefined) => void;
};

export function ZoneObjectSelector({
  camera,
  updateLabelFilter,
}: ZoneObjectSelectorProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const cameraConfig = useMemo(() => {
    if (config && camera) {
      return config.cameras[camera];
    }
  }, [config, camera]);

  const allLabels = useMemo<string[]>(() => {
    if (!config) {
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

    return [...labels].sort();
  }, [config]);

  const cameraLabels = useMemo<string[]>(() => {
    if (!cameraConfig) {
      return [];
    }

    const labels = new Set<string>();

    cameraConfig.objects.track.forEach((label) => {
      if (!ATTRIBUTE_LABELS.includes(label)) {
        labels.add(label);
      }
    });

    return [...labels].sort() || [];
  }, [cameraConfig]);

  const [currentLabels, setCurrentLabels] = useState<string[] | undefined>(
    cameraLabels.every((label, index) => label === allLabels[index])
      ? undefined
      : cameraLabels,
  );

  useEffect(() => {
    updateLabelFilter(currentLabels);
  }, [currentLabels, updateLabelFilter]);

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
