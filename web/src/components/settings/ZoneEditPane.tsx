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
import { useEffect, useMemo, useState } from "react";
import { ATTRIBUTES, FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import { isMobile } from "react-device-detect";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Polygon } from "@/types/canvas";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import PolygonEditControls from "./PolygonEditControls";

type ZoneEditPaneProps = {
  polygons?: Polygon[];
  setPolygons: React.Dispatch<React.SetStateAction<Polygon[]>>;
  activePolygonIndex?: number;
  onSave?: () => void;
  onCancel?: () => void;
};

export default function ZoneEditPane({
  polygons,
  setPolygons,
  activePolygonIndex,
  onSave,
  onCancel,
}: ZoneEditPaneProps) {
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
      name: polygon?.name ?? "",
      inertia:
        ((polygon?.camera &&
          polygon?.name &&
          config?.cameras[polygon.camera]?.zones[polygon.name]
            ?.inertia) as number) || 3,
      loitering_time:
        ((polygon?.camera &&
          polygon?.name &&
          config?.cameras[polygon.camera]?.zones[polygon.name]
            ?.loitering_time) as number) || 0,
      polygon: { isFinished: polygon?.isFinished ?? false },
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    polygons[activePolygonIndex].name = values.name;
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
        Zone
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
                  before they are considered in the zone.
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
                  be in the zone for it to activate.
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
              updateLabelFilter={(objects) => {
                // console.log(objects);
              }}
            />
          </FormItem>
          <div className="flex my-2">
            <Separator className="bg-secondary" />
          </div>
          <FormItem>
            <FormLabel>Alerts and Detections</FormLabel>
            <FormDescription>
              When an object enters this zone, ensure it is marked as an alert
              or detection.
            </FormDescription>
            <FormControl>
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-row justify-between items-center">
                  <Label
                    className="text-primary cursor-pointer"
                    htmlFor="mark_alert"
                  >
                    Required for Alert
                  </Label>
                  <Switch
                    className="ml-1"
                    id="mark_alert"
                    checked={false}
                    onCheckedChange={(isChecked) => {
                      if (isChecked) {
                        return;
                      }
                    }}
                  />
                </div>
                <div className="flex flex-row justify-between items-center">
                  <Label
                    className="text-primary cursor-pointer"
                    htmlFor="mark_detection"
                  >
                    Required for Detection
                  </Label>
                  <Switch
                    className="ml-1"
                    id="mark_detection"
                    checked={false}
                    onCheckedChange={(isChecked) => {
                      if (isChecked) {
                        return;
                      }
                    }}
                  />
                </div>
              </div>
            </FormControl>
          </FormItem>
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
  zoneName: string;
  updateLabelFilter: (labels: string[] | undefined) => void;
};

export function ZoneObjectSelector({
  camera,
  zoneName,
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
        if (!ATTRIBUTES.includes(label)) {
          labels.add(label);
        }
      });
    });

    return [...labels].sort();
  }, [config]);

  const zoneLabels = useMemo<string[]>(() => {
    if (!cameraConfig || !zoneName) {
      return [];
    }

    const labels = new Set<string>();

    cameraConfig.objects.track.forEach((label) => {
      if (!ATTRIBUTES.includes(label)) {
        labels.add(label);
      }
    });

    if (cameraConfig.zones[zoneName]) {
      cameraConfig.zones[zoneName].objects.forEach((label) => {
        if (!ATTRIBUTES.includes(label)) {
          labels.add(label);
        }
      });
    }

    return [...labels].sort() || [];
  }, [cameraConfig, zoneName]);

  const [currentLabels, setCurrentLabels] = useState<string[] | undefined>(
    zoneLabels.every((label, index) => label === allLabels[index])
      ? undefined
      : zoneLabels,
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
            checked={currentLabels == undefined}
            onCheckedChange={(isChecked) => {
              if (isChecked) {
                setCurrentLabels(undefined);
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
