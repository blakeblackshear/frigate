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
import { useTranslation } from "react-i18next";
import { getTranslatedLabel } from "@/utils/i18n";

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
  snapPoints: boolean;
  setSnapPoints: React.Dispatch<React.SetStateAction<boolean>>;
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
  snapPoints,
  setSnapPoints,
}: ObjectMaskEditPaneProps) {
  const { t } = useTranslation(["views/settings"]);
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

    return t("masksAndZones.objectMaskLabel", {
      number: count + 1,
      label: getTranslatedLabel(objectType),
    });
  }, [polygons, polygon, t]);

  const formSchema = z
    .object({
      objects: z.string(),
      polygon: z.object({ isFinished: z.boolean(), name: z.string() }),
    })
    .refine(() => polygon?.isFinished === true, {
      message: t("masksAndZones.form.polygonDrawing.error.mustBeFinished"),
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

      // prevent duplicating global masks under specific object filters
      if (!globalMask) {
        const globalObjectMasksArray = Array.isArray(cameraConfig.objects.mask)
          ? cameraConfig.objects.mask
          : cameraConfig.objects.mask
            ? [cameraConfig.objects.mask]
            : [];

        filteredMask = filteredMask.filter(
          (mask) => !globalObjectMasksArray.includes(mask),
        );
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
          update_topic: `config/cameras/${polygon.camera}/objects`,
        })
        .then((res) => {
          if (res.status === 200) {
            toast.success(
              polygon.name
                ? t("masksAndZones.objectMasks.toast.success.title", {
                    polygonName: polygon.name,
                  })
                : t("masksAndZones.objectMasks.toast.success.noName"),
              {
                position: "top-center",
              },
            );
            updateConfig();
          } else {
            toast.error(
              t("toast.save.error.title", {
                errorMessage: res.statusText,
                ns: "common",
              }),
              {
                position: "top-center",
              },
            );
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(
            t("toast.save.error.title", {
              errorMessage,
              ns: "common",
            }),
            {
              position: "top-center",
            },
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
      t,
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
    document.title = t("masksAndZones.objectMasks.documentTitle");
  }, [t]);

  if (!polygon) {
    return;
  }

  return (
    <>
      <Toaster position="top-center" closeButton={true} />
      <Heading as="h3" className="my-2">
        {polygon.name.length
          ? t("masksAndZones.objectMasks.edit")
          : t("masksAndZones.objectMasks.add")}
      </Heading>
      <div className="my-2 text-sm text-muted-foreground">
        <p>{t("masksAndZones.objectMasks.context")}</p>
      </div>
      <Separator className="my-3 bg-secondary" />
      {polygons && activePolygonIndex !== undefined && (
        <div className="my-2 flex w-full flex-row justify-between text-sm">
          <div className="my-1 inline-flex">
            {t("masksAndZones.objectMasks.point", {
              count: polygons[activePolygonIndex].points.length,
            })}
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
        {t("masksAndZones.objectMasks.clickDrawPolygon")}
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
                  <FormLabel>
                    {t("masksAndZones.objectMasks.objects.title")}
                  </FormLabel>
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
                    {t("masksAndZones.objectMasks.objects.desc")}
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
              <Button
                className="flex flex-1"
                aria-label={t("button.cancel", { ns: "common" })}
                onClick={onCancel}
              >
                {t("button.cancel", { ns: "common" })}
              </Button>
              <Button
                variant="select"
                disabled={isLoading}
                className="flex flex-1"
                aria-label={t("button.save", { ns: "common" })}
                type="submit"
              >
                {isLoading ? (
                  <div className="flex flex-row items-center gap-2">
                    <ActivityIndicator />
                    <span>{t("button.saving", { ns: "common" })}</span>
                  </div>
                ) : (
                  t("button.save", { ns: "common" })
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
  const { t } = useTranslation(["views/settings"]);
  const { data: config } = useSWR<FrigateConfig>("config");

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
        labels.add(label);
      });
    });

    cameraConfig.objects.track.forEach((label) => {
      labels.add(label);
    });

    return [...labels].sort();
  }, [config, cameraConfig]);

  return (
    <>
      <SelectGroup>
        <SelectItem value="all_labels">
          {t("masksAndZones.objectMasks.objects.allObjectTypes")}
        </SelectItem>
        <SelectSeparator className="bg-secondary" />
        {allLabels.map((item) => (
          <SelectItem key={item} value={item}>
            {getTranslatedLabel(item)}
          </SelectItem>
        ))}
      </SelectGroup>
    </>
  );
}
