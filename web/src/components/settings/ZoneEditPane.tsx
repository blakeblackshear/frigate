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
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LuExternalLink } from "react-icons/lu";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { getTranslatedLabel } from "@/utils/i18n";
import NameAndIdFields from "../input/NameAndIdFields";
import { useZoneState } from "@/api/ws";

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
  const { t } = useTranslation(["views/settings"]);
  const { getLocaleDocUrl } = useDocDomain();
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

  const { send: sendZoneState } = useZoneState(
    polygon?.camera || "",
    polygon?.name || "",
  );

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
          message: t(
            "masksAndZones.form.zoneName.error.mustBeAtLeastTwoCharacters",
          ),
        })
        .transform((val: string) => val.trim().replace(/\s+/g, "_"))
        .refine(
          (value: string) => {
            return !cameras.map((cam) => cam.name).includes(value);
          },
          {
            message: t(
              "masksAndZones.form.zoneName.error.mustNotBeSameWithCamera",
            ),
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
            message: t("masksAndZones.form.zoneName.error.alreadyExists"),
          },
        )
        .refine(
          (value: string) => {
            return !value.includes(".");
          },
          {
            message: t(
              "masksAndZones.form.zoneName.error.mustNotContainPeriod",
            ),
          },
        ),
      friendly_name: z
        .string()
        .min(2, {
          message: t(
            "masksAndZones.form.zoneName.error.mustBeAtLeastTwoCharacters",
          ),
        })
        .refine(
          (value: string) => {
            return !cameras.map((cam) => cam.name).includes(value);
          },
          {
            message: t(
              "masksAndZones.form.zoneName.error.mustNotBeSameWithCamera",
            ),
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
            message: t("masksAndZones.form.zoneName.error.alreadyExists"),
          },
        ),
      enabled: z.boolean().default(true),
      inertia: z.coerce
        .number()
        .min(1, {
          message: t("masksAndZones.form.inertia.error.mustBeAboveZero"),
        })
        .or(z.literal("")),
      loitering_time: z.coerce
        .number()
        .min(0, {
          message: t(
            "masksAndZones.form.loiteringTime.error.mustBeGreaterOrEqualZero",
          ),
        })
        .optional()
        .or(z.literal("")),
      isFinished: z.boolean().refine(() => polygon?.isFinished === true, {
        message: t("masksAndZones.form.polygonDrawing.error.mustBeFinished"),
      }),
      objects: z.array(z.string()).optional(),
      review_alerts: z.boolean().default(false).optional(),
      review_detections: z.boolean().default(false).optional(),
      speedEstimation: z.boolean().default(false),
      lineA: z.coerce
        .number()
        .min(0.1, {
          message: t("masksAndZones.form.distance.error.text"),
        })
        .optional()
        .or(z.literal("")),
      lineB: z.coerce
        .number()
        .min(0.1, {
          message: t("masksAndZones.form.distance.error.text"),
        })
        .optional()
        .or(z.literal("")),
      lineC: z.coerce
        .number()
        .min(0.1, {
          message: t("masksAndZones.form.distance.error.text"),
        })
        .optional()
        .or(z.literal("")),
      lineD: z.coerce
        .number()
        .min(0.1, {
          message: t("masksAndZones.form.distance.error.text"),
        })
        .optional()
        .or(z.literal("")),
      speed_threshold: z.coerce
        .number()
        .min(0.1, {
          message: t("masksAndZones.form.speed.error.mustBeGreaterOrEqualTo"),
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
        message: t("masksAndZones.form.distance.error.mustBeFilled"),
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
        message: t(
          "masksAndZones.zones.speedThreshold.toast.error.loiteringTimeError",
        ),
        path: ["loitering_time"],
      },
    );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      name: polygon?.name ?? "",
      friendly_name: polygon?.friendly_name ?? polygon?.name ?? "",
      enabled:
        polygon?.camera &&
        polygon?.name &&
        config?.cameras[polygon.camera]?.zones[polygon.name]?.enabled !==
          undefined
          ? config?.cameras[polygon.camera]?.zones[polygon.name]?.enabled
          : (polygon?.enabled ?? true),
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
        t("masksAndZones.zones.speedThreshold.toast.error.pointLengthError"),
      );
      form.setValue("speedEstimation", false);
    }
  }, [polygon, form, t]);

  const saveToConfig = useCallback(
    async (
      {
        name: zoneName,
        friendly_name,
        enabled,
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
              update_topic: `config/cameras/${polygon.camera}/zones`,
            },
          );

          // Wait for the config to be updated
          mutatedConfig = await updateConfig();
        } catch (error) {
          toast.error(t("toast.save.error.noMessage", { ns: "common" }), {
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

      let friendlyNameQuery = "";
      if (friendly_name && friendly_name !== zoneName) {
        friendlyNameQuery = `&cameras.${polygon?.camera}.zones.${zoneName}.friendly_name=${encodeURIComponent(friendly_name)}`;
      }

      const enabledQuery = `&cameras.${polygon?.camera}.zones.${zoneName}.enabled=${enabled ? "True" : "False"}`;

      axios
        .put(
          `config/set?cameras.${polygon?.camera}.zones.${zoneName}.coordinates=${coordinates}${enabledQuery}${inertiaQuery}${loiteringTimeQuery}${speedThresholdQuery}${distancesQuery}${objectQueries}${friendlyNameQuery}${alertQueries}${detectionQueries}`,
          {
            requires_restart: 0,
            update_topic: `config/cameras/${polygon.camera}/zones`,
          },
        )
        .then((res) => {
          if (res.status === 200) {
            toast.success(
              t("masksAndZones.zones.toast.success", {
                zoneName: friendly_name || zoneName,
              }),
              {
                position: "top-center",
              },
            );
            updateConfig();
            // Publish the enabled state through websocket
            sendZoneState(enabled ? "ON" : "OFF");
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
      config,
      updateConfig,
      polygon,
      scaledWidth,
      scaledHeight,
      setIsLoading,
      cameraConfig,
      t,
      sendZoneState,
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
    document.title = t("masksAndZones.zones.documentTitle");
  }, [t]);

  if (!polygon) {
    return;
  }

  return (
    <>
      <Toaster position="top-center" closeButton={true} />
      <Heading as="h3" className="my-2">
        {polygon.name.length
          ? t("masksAndZones.zones.edit")
          : t("masksAndZones.zones.add")}
      </Heading>
      <div className="my-2 text-sm text-muted-foreground">
        <p>{t("masksAndZones.zones.desc.title")}</p>
      </div>
      <Separator className="my-3 bg-secondary" />
      {polygons && activePolygonIndex !== undefined && (
        <div className="my-2 flex w-full flex-row justify-between text-sm">
          <div className="my-1 inline-flex">
            {t("masksAndZones.zones.point", {
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
        {t("masksAndZones.zones.clickDrawPolygon")}
      </div>

      <Separator className="my-3 bg-secondary" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-2 space-y-6">
          <NameAndIdFields
            type="zone"
            control={form.control}
            nameField="friendly_name"
            idField="name"
            idVisible={(polygon && polygon.name.length > 0) ?? false}
            nameLabel={t("masksAndZones.zones.name.title")}
            nameDescription={t("masksAndZones.zones.name.tips")}
            placeholderName={t("masksAndZones.zones.name.inputPlaceHolder")}
          />
          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <FormLabel>
                    {t("masksAndZones.zones.enabled.title")}
                  </FormLabel>
                  <FormDescription>
                    {t("masksAndZones.zones.enabled.description")}
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

          <Separator className="my-2 flex bg-secondary" />
          <FormField
            control={form.control}
            name="inertia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("masksAndZones.zones.inertia.title")}</FormLabel>
                <FormControl>
                  <Input
                    className="text-md w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                    placeholder="3"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  <Trans ns="views/settings">
                    masksAndZones.zones.inertia.desc
                  </Trans>
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
                <FormLabel>
                  {t("masksAndZones.zones.loiteringTime.title")}
                </FormLabel>
                <FormControl>
                  <Input
                    className="text-md w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                    placeholder="0"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  <Trans ns="views/settings">
                    masksAndZones.zones.loiteringTime.desc
                  </Trans>
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Separator className="my-2 flex bg-secondary" />
          <FormItem>
            <FormLabel>{t("masksAndZones.zones.objects.title")}</FormLabel>
            <FormDescription>
              {t("masksAndZones.zones.objects.desc")}
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
                        {t("masksAndZones.zones.speedEstimation.title")}
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
                              t(
                                "masksAndZones.zones.speedThreshold.toast.error.pointLengthError",
                              ),
                            );
                            return;
                          }
                          const loiteringTime =
                            form.getValues("loitering_time");

                          if (checked && loiteringTime && loiteringTime > 0) {
                            toast.error(
                              t(
                                "masksAndZones.zones.speedThreshold.toast.error.loiteringTimeError",
                              ),
                            );
                          }
                          field.onChange(checked);
                        }}
                      />
                    </div>
                  </FormControl>
                </div>
                <FormDescription>
                  {t("masksAndZones.zones.speedEstimation.desc")}
                  <div className="mt-2 flex items-center text-primary">
                    <Link
                      to={getLocaleDocUrl(
                        "configuration/zones#speed-estimation",
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline"
                    >
                      {t("readTheDocumentation", { ns: "common" })}
                      <LuExternalLink className="ml-2 inline-flex size-3" />
                    </Link>
                  </div>
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("speedEstimation") &&
            polygons &&
            activePolygonIndex !== undefined &&
            polygons[activePolygonIndex].points.length === 4 && (
              <>
                <FormField
                  control={form.control}
                  name="lineA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t(
                          "masksAndZones.zones.speedEstimation.lineADistance",
                          {
                            unit:
                              config?.ui.unit_system == "imperial"
                                ? t("unit.length.feet", { ns: "common" })
                                : t("unit.length.meters", { ns: "common" }),
                          },
                        )}
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
                        {t(
                          "masksAndZones.zones.speedEstimation.lineBDistance",
                          {
                            unit:
                              config?.ui.unit_system == "imperial"
                                ? t("unit.length.feet", { ns: "common" })
                                : t("unit.length.meters", { ns: "common" }),
                          },
                        )}
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
                        {t(
                          "masksAndZones.zones.speedEstimation.lineCDistance",
                          {
                            unit:
                              config?.ui.unit_system == "imperial"
                                ? t("unit.length.feet", { ns: "common" })
                                : t("unit.length.meters", { ns: "common" }),
                          },
                        )}
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
                        {t(
                          "masksAndZones.zones.speedEstimation.lineDDistance",
                          {
                            unit:
                              config?.ui.unit_system == "imperial"
                                ? t("unit.length.feet", { ns: "common" })
                                : t("unit.length.meters", { ns: "common" }),
                          },
                        )}
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
                        {t("masksAndZones.zones.speedThreshold.title", {
                          ns: "views/settings",
                          unit:
                            config?.ui.unit_system == "imperial"
                              ? t("unit.speed.mph", { ns: "common" })
                              : t("unit.speed.kph", { ns: "common" }),
                        })}
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="text-md w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("masksAndZones.zones.speedThreshold.desc")}
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
  const { t } = useTranslation(["views/settings"]);
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
            {t("masksAndZones.zones.allObjects")}
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
                className="w-full cursor-pointer text-primary smart-capitalize"
                htmlFor={item}
              >
                {getTranslatedLabel(item)}
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
