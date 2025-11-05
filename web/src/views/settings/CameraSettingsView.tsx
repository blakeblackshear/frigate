import Heading from "@/components/ui/heading";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { Checkbox } from "@/components/ui/checkbox";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { StatusBarMessagesContext } from "@/context/statusbar-provider";
import axios from "axios";
import { Link } from "react-router-dom";
import { LuExternalLink } from "react-icons/lu";
import { MdCircle } from "react-icons/md";
import { cn } from "@/lib/utils";
import { Trans, useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { getTranslatedLabel } from "@/utils/i18n";
import {
  useAlertsState,
  useDetectionsState,
  useObjectDescriptionState,
  useReviewDescriptionState,
} from "@/api/ws";
import CameraEditForm from "@/components/settings/CameraEditForm";
import CameraWizardDialog from "@/components/settings/CameraWizardDialog";
import { IoMdArrowRoundBack } from "react-icons/io";
import { isDesktop } from "react-device-detect";
import { useCameraFriendlyName } from "@/hooks/use-camera-friendly-name";
import { resolveZoneName } from "@/hooks/use-zone-friendly-name";

type CameraSettingsViewProps = {
  selectedCamera: string;
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
};

type CameraReviewSettingsValueType = {
  alerts_zones: string[];
  detections_zones: string[];
};

export default function CameraSettingsView({
  selectedCamera,
  setUnsavedChanges,
}: CameraSettingsViewProps) {
  const { t } = useTranslation(["views/settings"]);
  const { getLocaleDocUrl } = useDocDomain();

  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");

  const cameraConfig = useMemo(() => {
    if (config && selectedCamera) {
      return config.cameras[selectedCamera];
    }
  }, [config, selectedCamera]);

  const [changedValue, setChangedValue] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectDetections, setSelectDetections] = useState(false);
  const [viewMode, setViewMode] = useState<"settings" | "add" | "edit">(
    "settings",
  ); // Control view state
  const [editCameraName, setEditCameraName] = useState<string | undefined>(
    undefined,
  ); // Track camera being edited
  const [showWizard, setShowWizard] = useState(false);

  const { addMessage, removeMessage } = useContext(StatusBarMessagesContext)!;

  const selectCameraName = useCameraFriendlyName(selectedCamera);

  // zones and labels

  const getZoneName = useCallback(
    (zoneId: string, cameraId?: string) =>
      resolveZoneName(config, zoneId, cameraId),
    [config],
  );

  const zones = useMemo(() => {
    if (cameraConfig) {
      return Object.entries(cameraConfig.zones).map(([name, zoneData]) => ({
        camera: cameraConfig.name,
        name,
        friendly_name: getZoneName(name, cameraConfig.name),
        objects: zoneData.objects,
        color: zoneData.color,
      }));
    }
  }, [cameraConfig, getZoneName]);

  const alertsLabels = useMemo(() => {
    return cameraConfig?.review.alerts.labels
      ? cameraConfig.review.alerts.labels
          .map((label) =>
            getTranslatedLabel(
              label,
              cameraConfig?.audio?.listen?.includes(label) ? "audio" : "object",
            ),
          )
          .join(", ")
      : "";
  }, [cameraConfig]);

  const detectionsLabels = useMemo(() => {
    return cameraConfig?.review.detections.labels
      ? cameraConfig.review.detections.labels
          .map((label) =>
            getTranslatedLabel(
              label,
              cameraConfig?.audio?.listen?.includes(label) ? "audio" : "object",
            ),
          )
          .join(", ")
      : "";
  }, [cameraConfig]);

  // form

  const formSchema = z.object({
    alerts_zones: z.array(z.string()),
    detections_zones: z.array(z.string()),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      alerts_zones: cameraConfig?.review.alerts.required_zones || [],
      detections_zones: cameraConfig?.review.detections.required_zones || [],
    },
  });

  const watchedAlertsZones = form.watch("alerts_zones");
  const watchedDetectionsZones = form.watch("detections_zones");

  const { payload: alertsState, send: sendAlerts } =
    useAlertsState(selectedCamera);
  const { payload: detectionsState, send: sendDetections } =
    useDetectionsState(selectedCamera);

  const { payload: objDescState, send: sendObjDesc } =
    useObjectDescriptionState(selectedCamera);
  const { payload: revDescState, send: sendRevDesc } =
    useReviewDescriptionState(selectedCamera);

  const handleCheckedChange = useCallback(
    (isChecked: boolean) => {
      if (!isChecked) {
        form.reset({
          alerts_zones: watchedAlertsZones,
          detections_zones: [],
        });
      }
      setChangedValue(true);
      setSelectDetections(isChecked as boolean);
    },
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [watchedAlertsZones],
  );

  const saveToConfig = useCallback(
    async (
      { alerts_zones, detections_zones }: CameraReviewSettingsValueType, // values submitted via the form
    ) => {
      const createQuery = (zones: string[], type: "alerts" | "detections") =>
        zones.length
          ? zones
              .map(
                (zone) =>
                  `&cameras.${selectedCamera}.review.${type}.required_zones=${zone}`,
              )
              .join("")
          : cameraConfig?.review[type]?.required_zones &&
              cameraConfig?.review[type]?.required_zones.length > 0
            ? `&cameras.${selectedCamera}.review.${type}.required_zones`
            : "";

      const alertQueries = createQuery(alerts_zones, "alerts");
      const detectionQueries = createQuery(detections_zones, "detections");

      axios
        .put(`config/set?${alertQueries}${detectionQueries}`, {
          requires_restart: 0,
        })
        .then((res) => {
          if (res.status === 200) {
            toast.success(
              t("cameraReview.reviewClassification.toast.success"),
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
    [updateConfig, setIsLoading, selectedCamera, cameraConfig, t],
  );

  const onCancel = useCallback(() => {
    if (!cameraConfig) {
      return;
    }

    setChangedValue(false);
    setUnsavedChanges(false);
    removeMessage(
      "camera_settings",
      `review_classification_settings_${selectedCamera}`,
    );
    form.reset({
      alerts_zones: cameraConfig?.review.alerts.required_zones ?? [],
      detections_zones: cameraConfig?.review.detections.required_zones || [],
    });
    setSelectDetections(
      !!cameraConfig?.review.detections.required_zones?.length,
    );
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removeMessage, selectedCamera, setUnsavedChanges, cameraConfig]);

  useEffect(() => {
    onCancel();
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera]);

  useEffect(() => {
    if (changedValue) {
      addMessage(
        "camera_settings",
        t("cameraReview.reviewClassification.unsavedChanges", {
          camera: selectedCamera,
        }),
        undefined,
        `review_classification_settings_${selectedCamera}`,
      );
    } else {
      removeMessage(
        "camera_settings",
        `review_classification_settings_${selectedCamera}`,
      );
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedValue, selectedCamera]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    saveToConfig(values as CameraReviewSettingsValueType);
  }

  useEffect(() => {
    document.title = t("documentTitle.cameraReview");
  }, [t]);

  // Handle back navigation from add/edit form
  const handleBack = useCallback(() => {
    setViewMode("settings");
    setEditCameraName(undefined);
    updateConfig();
  }, [updateConfig]);

  if (!cameraConfig && !selectedCamera && viewMode === "settings") {
    return <ActivityIndicator />;
  }

  return (
    <>
      <div className="flex size-full flex-col md:flex-row">
        <Toaster position="top-center" closeButton={true} />
        <div className="scrollbar-container order-last mb-10 mt-2 flex h-full w-full flex-col overflow-y-auto pb-2 md:order-none">
          {viewMode === "settings" ? (
            <>
              <Heading as="h4" className="mb-2">
                {t("cameraReview.title")}
              </Heading>

              <Heading as="h4" className="my-2">
                <Trans ns="views/settings">cameraReview.review.title</Trans>
              </Heading>

              <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 space-y-3 text-sm text-primary-variant">
                <div className="flex flex-row items-center">
                  <Switch
                    id="alerts-enabled"
                    className="mr-3"
                    checked={alertsState == "ON"}
                    onCheckedChange={(isChecked) => {
                      sendAlerts(isChecked ? "ON" : "OFF");
                    }}
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="alerts-enabled">
                      <Trans ns="views/settings">
                        cameraReview.review.alerts
                      </Trans>
                    </Label>
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="flex flex-row items-center">
                    <Switch
                      id="detections-enabled"
                      className="mr-3"
                      checked={detectionsState == "ON"}
                      onCheckedChange={(isChecked) => {
                        sendDetections(isChecked ? "ON" : "OFF");
                      }}
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="detections-enabled">
                        <Trans ns="views/settings">
                          camera.review.detections
                        </Trans>
                      </Label>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    <Trans ns="views/settings">cameraReview.review.desc</Trans>
                  </div>
                </div>
              </div>
              {cameraConfig?.objects?.genai?.enabled_in_config && (
                <>
                  <Separator className="my-2 flex bg-secondary" />

                  <Heading as="h4" className="my-2">
                    <Trans ns="views/settings">
                      cameraReview.object_descriptions.title
                    </Trans>
                  </Heading>

                  <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 space-y-3 text-sm text-primary-variant">
                    <div className="flex flex-row items-center">
                      <Switch
                        id="alerts-enabled"
                        className="mr-3"
                        checked={objDescState == "ON"}
                        onCheckedChange={(isChecked) => {
                          sendObjDesc(isChecked ? "ON" : "OFF");
                        }}
                      />
                      <div className="space-y-0.5">
                        <Label htmlFor="genai-enabled">
                          <Trans>button.enabled</Trans>
                        </Label>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-muted-foreground">
                      <Trans ns="views/settings">
                        cameraReview.object_descriptions.desc
                      </Trans>
                    </div>
                  </div>
                </>
              )}

              {cameraConfig?.review?.genai?.enabled_in_config && (
                <>
                  <Separator className="my-2 flex bg-secondary" />

                  <Heading as="h4" className="my-2">
                    <Trans ns="views/settings">
                      cameraReview.review_descriptions.title
                    </Trans>
                  </Heading>

                  <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 space-y-3 text-sm text-primary-variant">
                    <div className="flex flex-row items-center">
                      <Switch
                        id="alerts-enabled"
                        className="mr-3"
                        checked={revDescState == "ON"}
                        onCheckedChange={(isChecked) => {
                          sendRevDesc(isChecked ? "ON" : "OFF");
                        }}
                      />
                      <div className="space-y-0.5">
                        <Label htmlFor="genai-enabled">
                          <Trans>button.enabled</Trans>
                        </Label>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-muted-foreground">
                      <Trans ns="views/settings">
                        cameraReview.review_descriptions.desc
                      </Trans>
                    </div>
                  </div>
                </>
              )}

              <Separator className="my-2 flex bg-secondary" />

              <Heading as="h4" className="my-2">
                <Trans ns="views/settings">
                  cameraReview.reviewClassification.title
                </Trans>
              </Heading>

              <div className="max-w-6xl">
                <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 text-sm text-primary-variant">
                  <p>
                    <Trans ns="views/settings">
                      cameraReview.reviewClassification.desc
                    </Trans>
                  </p>
                  <div className="flex items-center text-primary">
                    <Link
                      to={getLocaleDocUrl("configuration/review")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline"
                    >
                      {t("readTheDocumentation", { ns: "common" })}
                      <LuExternalLink className="ml-2 inline-flex size-3" />
                    </Link>
                  </div>
                </div>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="mt-2 space-y-6"
                >
                  <div
                    className={cn(
                      "w-full max-w-5xl space-y-0",
                      zones &&
                        zones?.length > 0 &&
                        "grid items-start gap-5 md:grid-cols-2",
                    )}
                  >
                    <FormField
                      control={form.control}
                      name="alerts_zones"
                      render={() => (
                        <FormItem>
                          {zones && zones?.length > 0 ? (
                            <>
                              <div className="mb-2">
                                <FormLabel className="flex flex-row items-center text-base">
                                  <Trans ns="views/settings">
                                    camera.review.alerts
                                  </Trans>
                                  <MdCircle className="ml-3 size-2 text-severity_alert" />
                                </FormLabel>
                                <FormDescription>
                                  <Trans ns="views/settings">
                                    cameraReview.reviewClassification.selectAlertsZones
                                  </Trans>
                                </FormDescription>
                              </div>
                              <div className="max-w-md rounded-lg bg-secondary p-4 md:max-w-full">
                                {zones?.map((zone) => (
                                  <FormField
                                    key={zone.name}
                                    control={form.control}
                                    name="alerts_zones"
                                    render={({ field }) => (
                                      <FormItem
                                        key={zone.name}
                                        className="mb-3 flex flex-row items-center space-x-3 space-y-0 last:mb-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            className="size-5 text-white accent-white data-[state=checked]:bg-selected data-[state=checked]:text-white"
                                            checked={field.value?.includes(
                                              zone.name,
                                            )}
                                            onCheckedChange={(checked) => {
                                              setChangedValue(true);
                                              return checked
                                                ? field.onChange([
                                                    ...field.value,
                                                    zone.name,
                                                  ])
                                                : field.onChange(
                                                    field.value?.filter(
                                                      (value) =>
                                                        value !== zone.name,
                                                    ),
                                                  );
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal smart-capitalize">
                                          {zone.friendly_name}
                                        </FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="font-normal text-destructive">
                              <Trans ns="views/settings">
                                cameraReview.reviewClassification.noDefinedZones
                              </Trans>
                            </div>
                          )}
                          <FormMessage />
                          <div className="text-sm">
                            {watchedAlertsZones && watchedAlertsZones.length > 0
                              ? t(
                                  "cameraReview.reviewClassification.zoneObjectAlertsTips",
                                  {
                                    alertsLabels,
                                    zone: watchedAlertsZones.map((zone) =>
                                      getZoneName(zone),
                                    ),
                                    cameraName: selectCameraName,
                                  },
                                )
                              : t(
                                  "cameraReview.reviewClassification.objectAlertsTips",
                                  {
                                    alertsLabels,
                                    cameraName: selectCameraName,
                                  },
                                )}
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="detections_zones"
                      render={() => (
                        <FormItem>
                          {zones && zones?.length > 0 && (
                            <>
                              <div className="mb-2">
                                <FormLabel className="flex flex-row items-center text-base">
                                  <Trans ns="views/settings">
                                    camera.review.detections
                                  </Trans>
                                  <MdCircle className="ml-3 size-2 text-severity_detection" />
                                </FormLabel>
                                {selectDetections && (
                                  <FormDescription>
                                    <Trans ns="views/settings">
                                      cameraReview.reviewClassification.selectDetectionsZones
                                    </Trans>
                                  </FormDescription>
                                )}
                              </div>

                              {selectDetections && (
                                <div className="max-w-md rounded-lg bg-secondary p-4 md:max-w-full">
                                  {zones?.map((zone) => (
                                    <FormField
                                      key={zone.name}
                                      control={form.control}
                                      name="detections_zones"
                                      render={({ field }) => (
                                        <FormItem
                                          key={zone.name}
                                          className="mb-3 flex flex-row items-center space-x-3 space-y-0 last:mb-0"
                                        >
                                          <FormControl>
                                            <Checkbox
                                              className="size-5 text-white accent-white data-[state=checked]:bg-selected data-[state=checked]:text-white"
                                              checked={field.value?.includes(
                                                zone.name,
                                              )}
                                              onCheckedChange={(checked) => {
                                                return checked
                                                  ? field.onChange([
                                                      ...field.value,
                                                      zone.name,
                                                    ])
                                                  : field.onChange(
                                                      field.value?.filter(
                                                        (value) =>
                                                          value !== zone.name,
                                                      ),
                                                    );
                                              }}
                                            />
                                          </FormControl>
                                          <FormLabel className="font-normal smart-capitalize">
                                            {zone.friendly_name}
                                          </FormLabel>
                                        </FormItem>
                                      )}
                                    />
                                  ))}
                                </div>
                              )}
                              <FormMessage />

                              <div className="mb-0 flex flex-row items-center gap-2">
                                <Checkbox
                                  id="select-detections"
                                  className="size-5 text-white accent-white data-[state=checked]:bg-selected data-[state=checked]:text-white"
                                  checked={selectDetections}
                                  onCheckedChange={handleCheckedChange}
                                />
                                <div className="grid gap-1.5 leading-none">
                                  <label
                                    htmlFor="select-detections"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    <Trans ns="views/settings">
                                      cameraReview.reviewClassification.limitDetections
                                    </Trans>
                                  </label>
                                </div>
                              </div>
                            </>
                          )}

                          <div className="text-sm">
                            {watchedDetectionsZones &&
                            watchedDetectionsZones.length > 0 ? (
                              !selectDetections ? (
                                <Trans
                                  i18nKey="cameraReview.reviewClassification.zoneObjectDetectionsTips.text"
                                  values={{
                                    detectionsLabels,
                                    zone: watchedDetectionsZones.map((zone) =>
                                      getZoneName(zone),
                                    ),
                                    cameraName: selectCameraName,
                                  }}
                                  ns="views/settings"
                                />
                              ) : (
                                <Trans
                                  i18nKey="cameraReview.reviewClassification.zoneObjectDetectionsTips.notSelectDetections"
                                  values={{
                                    detectionsLabels,
                                    zone: watchedDetectionsZones.map((zone) =>
                                      getZoneName(zone),
                                    ),
                                    cameraName: selectCameraName,
                                  }}
                                  ns="views/settings"
                                />
                              )
                            ) : (
                              <Trans
                                i18nKey="cameraReview.reviewClassification.objectDetectionsTips"
                                values={{
                                  detectionsLabels,
                                  cameraName: selectCameraName,
                                }}
                                ns="views/settings"
                              />
                            )}
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <Separator className="my-2 flex bg-secondary" />

                  <div className="flex w-full flex-row items-center gap-2 pt-2 md:w-[25%]">
                    <Button
                      className="flex flex-1"
                      aria-label={t("button.reset", { ns: "common" })}
                      onClick={onCancel}
                      type="button"
                    >
                      <Trans>button.reset</Trans>
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
                          <span>
                            <Trans>button.saving</Trans>
                          </span>
                        </div>
                      ) : (
                        <Trans>button.save</Trans>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2">
                <Button
                  className={`flex items-center gap-2.5 rounded-lg`}
                  aria-label={t("label.back", { ns: "common" })}
                  size="sm"
                  onClick={handleBack}
                >
                  <IoMdArrowRoundBack className="size-5 text-secondary-foreground" />
                  {isDesktop && (
                    <div className="text-primary">
                      {t("button.back", { ns: "common" })}
                    </div>
                  )}
                </Button>
              </div>
              <div className="md:max-w-5xl">
                <CameraEditForm
                  cameraName={viewMode === "edit" ? editCameraName : undefined}
                  onSave={handleBack}
                  onCancel={handleBack}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <CameraWizardDialog
        open={showWizard}
        onClose={() => setShowWizard(false)}
      />
    </>
  );
}
