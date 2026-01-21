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
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod";
import { ObjectMaskFormValuesType, Polygon } from "@/types/canvas";
import PolygonEditControls from "./PolygonEditControls";
import { FaCheckCircle } from "react-icons/fa";
import { flattenPoints, interpolatePoints } from "@/utils/canvasUtil";
import axios from "axios";
import { toast } from "sonner";
import { Toaster } from "../ui/sonner";
import ActivityIndicator from "../indicators/activity-indicator";
import { useTranslation } from "react-i18next";
import { getTranslatedLabel } from "@/utils/i18n";
import NameAndIdFields from "../input/NameAndIdFields";
import { Switch } from "../ui/switch";
import { useObjectMaskState } from "@/api/ws";

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

  const { send: sendObjectMaskState } = useObjectMaskState(
    polygon?.camera || "",
    polygon?.name || "",
  );

  const cameraConfig = useMemo(() => {
    if (polygon?.camera && config) {
      return config.cameras[polygon.camera];
    }
  }, [polygon, config]);

  const defaultName = useMemo(() => {
    if (!polygons) {
      return "";
    }

    const count = polygons.filter((poly) => poly.type == "object_mask").length;

    return t("masksAndZones.objectMaskLabel", {
      number: count,
    });
  }, [polygons, t]);

  const defaultId = useMemo(() => {
    if (!polygons) {
      return "";
    }

    const count = polygons.filter((poly) => poly.type == "object_mask").length;

    return `object_mask_${count}`;
  }, [polygons]);

  const formSchema = z.object({
    name: z
      .string()
      .min(1, {
        message: t("masksAndZones.form.id.error.mustNotBeEmpty"),
      })
      .refine(
        (value: string) => {
          // When editing, allow the same name
          if (polygon?.name && value === polygon.name) {
            return true;
          }
          // Check if mask ID already exists in global masks or filter masks
          const globalMaskIds = Object.keys(cameraConfig?.objects.mask || {});
          const filterMaskIds = Object.values(
            cameraConfig?.objects.filters || {},
          ).flatMap((filter) => Object.keys(filter.mask || {}));
          return (
            !globalMaskIds.includes(value) && !filterMaskIds.includes(value)
          );
        },
        {
          message: t("masksAndZones.form.id.error.alreadyExists"),
        },
      ),
    friendly_name: z.string().min(1, {
      message: t("masksAndZones.form.name.error.mustNotBeEmpty"),
    }),
    enabled: z.boolean(),
    objects: z.string(),
    isFinished: z.boolean().refine(() => polygon?.isFinished === true, {
      message: t("masksAndZones.form.polygonDrawing.error.mustBeFinished"),
    }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: polygon?.name || defaultId,
      friendly_name: polygon?.friendly_name || defaultName,
      enabled: polygon?.enabled ?? true,
      objects: polygon?.objects[0] ?? "all_labels",
      isFinished: polygon?.isFinished ?? false,
    },
  });

  const saveToConfig = useCallback(
    async ({
      name: maskId,
      friendly_name,
      enabled,
      objects: form_objects,
    }: ObjectMaskFormValuesType) => {
      if (!scaledWidth || !scaledHeight || !polygon || !cameraConfig) {
        return;
      }

      const coordinates = flattenPoints(
        interpolatePoints(polygon.points, scaledWidth, scaledHeight, 1, 1),
      ).join(",");

      const editingMask = polygon.name.length > 0;
      const renamingMask = editingMask && maskId !== polygon.name;
      const globalMask = form_objects === "all_labels";

      // Build the mask configuration
      const maskConfig = {
        friendly_name: friendly_name,
        enabled: enabled,
        coordinates: coordinates,
      };

      // If renaming, delete the old mask first
      if (renamingMask) {
        try {
          // Determine if old mask was global or per-object
          const wasGlobal =
            polygon.objects.length === 0 || polygon.objects[0] === "all_labels";
          const oldPath = wasGlobal
            ? `cameras.${polygon.camera}.objects.mask.${polygon.name}`
            : `cameras.${polygon.camera}.objects.filters.${polygon.objects[0]}.mask.${polygon.name}`;

          await axios.put(`config/set?${oldPath}`, {
            requires_restart: 0,
          });
        } catch (error) {
          toast.error(t("toast.save.error.noMessage", { ns: "common" }), {
            position: "top-center",
          });
          setIsLoading(false);
          return;
        }
      }

      // Build the config structure based on whether it's global or per-object
      let configBody;
      if (globalMask) {
        configBody = {
          config_data: {
            cameras: {
              [polygon.camera]: {
                objects: {
                  mask: {
                    [maskId]: maskConfig,
                  },
                },
              },
            },
          },
          requires_restart: 0,
          update_topic: `config/cameras/${polygon.camera}/objects`,
        };
      } else {
        configBody = {
          config_data: {
            cameras: {
              [polygon.camera]: {
                objects: {
                  filters: {
                    [form_objects]: {
                      mask: {
                        [maskId]: maskConfig,
                      },
                    },
                  },
                },
              },
            },
          },
          requires_restart: 0,
          update_topic: `config/cameras/${polygon.camera}/objects`,
        };
      }

      axios
        .put("config/set", configBody)
        .then((res) => {
          if (res.status === 200) {
            toast.success(
              t("masksAndZones.objectMasks.toast.success.title", {
                polygonName: friendly_name || maskId,
              }),
              {
                position: "top-center",
              },
            );
            updateConfig();
            // Publish the enabled state through websocket
            sendObjectMaskState(enabled ? "ON" : "OFF");
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
      sendObjectMaskState,
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

      <FormProvider {...form}>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col space-y-6"
          >
            <div className="space-y-4">
              <NameAndIdFields
                type="object_mask"
                control={form.control}
                nameField="friendly_name"
                idField="name"
                idVisible={(polygon && polygon.name.length > 0) ?? false}
                nameLabel={t("masksAndZones.objectMasks.name.title")}
                nameDescription={t(
                  "masksAndZones.objectMasks.name.description",
                )}
                placeholderName={t(
                  "masksAndZones.objectMasks.name.placeholder",
                )}
              />
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <FormLabel>
                        {t("masksAndZones.masks.enabled.title")}
                      </FormLabel>
                      <FormDescription>
                        {t("masksAndZones.masks.enabled.description")}
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
                name="isFinished"
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
      </FormProvider>
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
