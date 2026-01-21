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
import { useCallback, useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod";
import PolygonEditControls from "./PolygonEditControls";
import { FaCheckCircle } from "react-icons/fa";
import { MotionMaskFormValuesType, Polygon } from "@/types/canvas";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { flattenPoints, interpolatePoints } from "@/utils/canvasUtil";
import axios from "axios";
import { toast } from "sonner";
import { Toaster } from "../ui/sonner";
import ActivityIndicator from "../indicators/activity-indicator";
import { Link } from "react-router-dom";
import { LuExternalLink } from "react-icons/lu";
import { Trans, useTranslation } from "react-i18next";
import { useDocDomain } from "@/hooks/use-doc-domain";
import NameAndIdFields from "../input/NameAndIdFields";
import { Switch } from "../ui/switch";
import { useMotionMaskState } from "@/api/ws";

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
  snapPoints: boolean;
  setSnapPoints: React.Dispatch<React.SetStateAction<boolean>>;
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
  snapPoints,
  setSnapPoints,
}: MotionMaskEditPaneProps) {
  const { t } = useTranslation(["views/settings"]);
  const { getLocaleDocUrl } = useDocDomain();
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");

  const polygon = useMemo(() => {
    if (polygons && activePolygonIndex !== undefined) {
      return polygons[activePolygonIndex];
    } else {
      return null;
    }
  }, [polygons, activePolygonIndex]);

  const { send: sendMotionMaskState } = useMotionMaskState(
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

    const count = polygons.filter((poly) => poly.type == "motion_mask").length;

    return t("masksAndZones.motionMasks.defaultName", {
      number: count,
    });
  }, [polygons, t]);

  const defaultId = useMemo(() => {
    if (!polygons) {
      return "";
    }

    const count = polygons.filter((poly) => poly.type == "motion_mask").length;

    return `motion_mask_${count}`;
  }, [polygons]);

  const polygonArea = useMemo(() => {
    if (polygon && polygon.isFinished && scaledWidth && scaledHeight) {
      const points = interpolatePoints(
        polygon.points,
        scaledWidth,
        scaledHeight,
        1,
        1,
      );

      const n = points.length;
      let area = 0;

      for (let i = 0; i < n; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % n];
        area += x1 * y2 - y1 * x2;
      }

      return Math.abs(area) / 2;
    }
  }, [polygon, scaledWidth, scaledHeight]);

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
          // Check if mask ID already exists
          const existingMaskIds = Object.keys(cameraConfig?.motion.mask || {});
          return !existingMaskIds.includes(value);
        },
        {
          message: t("masksAndZones.form.id.error.alreadyExists"),
        },
      ),
    friendly_name: z.string().min(1, {
      message: t("masksAndZones.form.name.error.mustNotBeEmpty"),
    }),
    enabled: z.boolean(),
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
      isFinished: polygon?.isFinished ?? false,
    },
  });

  const saveToConfig = useCallback(
    async ({
      name: maskId,
      friendly_name,
      enabled,
    }: MotionMaskFormValuesType) => {
      if (!scaledWidth || !scaledHeight || !polygon || !cameraConfig) {
        return;
      }

      const coordinates = flattenPoints(
        interpolatePoints(polygon.points, scaledWidth, scaledHeight, 1, 1),
      ).join(",");

      const editingMask = polygon.name.length > 0;
      const renamingMask = editingMask && maskId !== polygon.name;

      // Build the new mask configuration
      const maskConfig = {
        friendly_name: friendly_name,
        enabled: enabled,
        coordinates: coordinates,
      };

      // If renaming, we need to delete the old mask first
      if (renamingMask) {
        try {
          await axios.put(
            `config/set?cameras.${polygon.camera}.motion.mask.${polygon.name}`,
            {
              requires_restart: 0,
            },
          );
        } catch (error) {
          toast.error(t("toast.save.error.noMessage", { ns: "common" }), {
            position: "top-center",
          });
          setIsLoading(false);
          return;
        }
      }

      // Save the new/updated mask using JSON body
      axios
        .put("config/set", {
          config_data: {
            cameras: {
              [polygon.camera]: {
                motion: {
                  mask: {
                    [maskId]: maskConfig,
                  },
                },
              },
            },
          },
          requires_restart: 0,
          update_topic: `config/cameras/${polygon.camera}/motion`,
        })
        .then((res) => {
          if (res.status === 200) {
            toast.success(
              t("masksAndZones.motionMasks.toast.success.title", {
                polygonName: friendly_name || maskId,
              }),
              {
                position: "top-center",
              },
            );
            updateConfig();
            // Publish the enabled state through websocket
            sendMotionMaskState(enabled ? "ON" : "OFF");
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
            t("toast.save.error.title", { errorMessage, ns: "common" }),
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
      sendMotionMaskState,
    ],
  );

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (activePolygonIndex === undefined || !values || !polygons) {
      return;
    }
    setIsLoading(true);

    saveToConfig(values as MotionMaskFormValuesType);
    if (onSave) {
      onSave();
    }
  }

  useEffect(() => {
    document.title = t("masksAndZones.motionMasks.documentTitle");
  }, [t]);

  if (!polygon) {
    return;
  }

  return (
    <>
      <Toaster position="top-center" closeButton={true} />
      <Heading as="h3" className="my-2">
        {polygon.name.length
          ? t("masksAndZones.motionMasks.edit")
          : t("masksAndZones.motionMasks.add")}
      </Heading>
      <div className="my-3 space-y-3 text-sm text-muted-foreground">
        <p>
          <Trans ns="views/settings">
            masksAndZones.motionMasks.context.title
          </Trans>
        </p>

        <div className="flex items-center text-primary">
          <Link
            to={getLocaleDocUrl("configuration/masks/")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline"
          >
            {t("readTheDocumentation", { ns: "common" })}
            <LuExternalLink className="ml-2 inline-flex size-3" />
          </Link>
        </div>
      </div>
      <Separator className="my-3 bg-secondary" />
      {polygons && activePolygonIndex !== undefined && (
        <div className="my-2 flex w-full flex-row justify-between text-sm">
          <div className="my-1 inline-flex">
            {t("masksAndZones.motionMasks.point", {
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
        {t("masksAndZones.motionMasks.clickDrawPolygon")}
      </div>

      <Separator className="my-3 bg-secondary" />

      {polygonArea && polygonArea >= 0.35 && (
        <>
          <div className="mb-3 text-sm text-danger">
            {t("masksAndZones.motionMasks.polygonAreaTooLarge.title", {
              polygonArea: Math.round(polygonArea * 100),
            })}
          </div>
          <div className="mb-3 text-sm text-primary">
            {t("masksAndZones.motionMasks.polygonAreaTooLarge.tips")}
            <Link
              to="https://github.com/blakeblackshear/frigate/discussions/13040"
              target="_blank"
              rel="noopener noreferrer"
              className="my-3 block"
            >
              {t("readTheDocumentation", { ns: "common" })}{" "}
              <LuExternalLink className="ml-2 inline-flex size-3" />
            </Link>
          </div>
        </>
      )}

      <FormProvider {...form}>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col space-y-6"
          >
            <NameAndIdFields
              type="motion_mask"
              control={form.control}
              nameField="friendly_name"
              idField="name"
              idVisible={(polygon && polygon.name.length > 0) ?? false}
              nameLabel={t("masksAndZones.motionMasks.name.title")}
              nameDescription={t("masksAndZones.motionMasks.name.description")}
              placeholderName={t("masksAndZones.motionMasks.name.placeholder")}
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
              name="isFinished"
              render={() => (
                <FormItem>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                  aria-label={t("button.save", { ns: "common" })}
                  disabled={isLoading}
                  className="flex flex-1"
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
