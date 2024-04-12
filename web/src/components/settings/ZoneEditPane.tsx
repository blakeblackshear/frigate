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
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { useEffect, useMemo, useState } from "react";
import { GeneralFilterContent } from "../filter/ReviewFilterGroup";
import { FaObjectGroup } from "react-icons/fa";
import { ATTRIBUTES, FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import { isMobile } from "react-device-detect";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Polygon } from "@/types/canvas";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

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
    zoneLabels,
  );

  useEffect(() => {
    updateLabelFilter(currentLabels);
  }, [currentLabels, updateLabelFilter]);

  return (
    <>
      <div className="h-auto overflow-y-auto overflow-x-hidden">
        <div className="flex justify-between items-center my-2.5">
          <Label
            className="mx-2 text-primary cursor-pointer"
            htmlFor="allLabels"
          >
            All Labels
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
                className="w-full mx-2 text-primary capitalize cursor-pointer"
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

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Zone name must be at least 2 characters.",
  }),
  inertia: z.number(),
  loitering_time: z.number(),
});

type ZoneEditPaneProps = {
  polygons: Polygon[];
  activePolygonIndex?: number;
  onCancel: () => void;
};

export function ZoneEditPane({
  polygons,
  activePolygonIndex,
  onCancel,
}: ZoneEditPaneProps) {
  const polygon = useMemo(() => {
    if (polygons && activePolygonIndex !== undefined) {
      return polygons[activePolygonIndex];
    } else {
      return null;
    }
  }, [polygons, activePolygonIndex]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      inertia: 3,
      loitering_time: 10,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  if (!polygon) {
    return;
  }

  return (
    <>
      <Heading as="h3">Edit Zone</Heading>
      <div className="flex my-3">
        <Separator className="bg-secondary" />
      </div>

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
                    placeholder={polygon.name ?? "Enter a name..."}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex my-3">
            <Separator className="bg-secondary" />
          </div>
          <FormField
            control={form.control}
            name="inertia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inertia</FormLabel>
                <FormControl>
                  <Input placeholder="" {...field} />
                </FormControl>
                <FormDescription>
                  Specifies how many frames that an object must be in a zone
                  before they are considered in the zone.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex my-3">
            <Separator className="bg-secondary" />
          </div>
          <FormField
            control={form.control}
            name="loitering_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loitering Time</FormLabel>
                <FormControl>
                  <Input placeholder="" {...field} />
                </FormControl>
                <FormDescription>
                  Sets a minimum amount of time in seconds that the object must
                  be in the zone for it to activate.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex my-3">
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
          <div className="flex flex-row gap-2">
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
