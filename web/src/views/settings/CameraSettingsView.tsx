import Heading from "@/components/ui/heading";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";
import { toast } from "sonner";
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
import { Separator } from "../../components/ui/separator";
import { Button } from "../../components/ui/button";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { Checkbox } from "@/components/ui/checkbox";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { StatusBarMessagesContext } from "@/context/statusbar-provider";
import { reviewQueries } from "@/utils/zoneEdutUtil";
import axios from "axios";
import { Link } from "react-router-dom";
import { LuExternalLink } from "react-icons/lu";
import { capitalizeFirstLetter } from "@/utils/stringUtil";
import { MdCircle } from "react-icons/md";

type CameraSettingsViewProps = {
  selectedCamera: string;
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function CameraSettingsView({
  selectedCamera,
  setUnsavedChanges,
}: CameraSettingsViewProps) {
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

  const { addMessage, removeMessage } = useContext(StatusBarMessagesContext)!;

  const zones = useMemo(() => {
    if (cameraConfig) {
      return Object.entries(cameraConfig.zones).map(([name, zoneData]) => ({
        camera: cameraConfig.name,
        name,
        objects: zoneData.objects,
        color: zoneData.color,
      }));
    }
  }, [cameraConfig]);

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

  useEffect(() => {
    form.reset({
      alerts_zones: cameraConfig?.review.alerts.required_zones ?? [],
      detections_zones: cameraConfig?.review.detections.required_zones || [],
    });
    setSelectDetections(
      !!cameraConfig?.review.detections.required_zones?.length,
    );
  }, [cameraConfig, form]);

  const handleCheckedChange = useCallback(
    (isChecked: boolean) => {
      if (!isChecked) {
        form.reset({
          alerts_zones: watchedAlertsZones,
          detections_zones:
            cameraConfig?.review.detections.required_zones || [],
        });
      }
      setSelectDetections(isChecked as boolean);
    },
    [watchedAlertsZones, cameraConfig, form],
  );

  const alertsLabels = useMemo(() => {
    return cameraConfig?.review.alerts.labels
      ? cameraConfig.review.alerts.labels.join(", ")
      : "";
  }, [cameraConfig]);

  const detectionsLabels = useMemo(() => {
    return cameraConfig?.review.detections.labels
      ? cameraConfig.review.detections.labels.join(", ")
      : "";
  }, [cameraConfig]);

  const saveToConfig = useCallback(
    async (
      {
        name: zoneName,
        review_alerts,
        review_detections,
      }: CameraSettingsValuesType, // values submitted via the form
    ) => {
      if (!zoneName) {
        return;
      }
      let mutatedConfig = config;

      const { alertQueries, detectionQueries } = reviewQueries(
        zoneName,
        review_alerts,
        review_detections,
        selectedCamera,
        mutatedConfig?.cameras[selectedCamera]?.review.alerts.required_zones ||
          [],
        mutatedConfig?.cameras[selectedCamera]?.review.detections
          .required_zones || [],
      );

      axios
        .put(
          `config/set?cameras.${selectedCamera}.zones.${zoneName}?????${alertQueries}${detectionQueries}`,
          { requires_restart: 0 },
        )
        .then((res) => {
          if (res.status === 200) {
            toast.success(
              `Zone (${zoneName}) has been saved. Restart Frigate to apply changes.`,
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
    [config, updateConfig, setIsLoading, selectedCamera],
  );

  const onCancel = useCallback(() => {
    setChangedValue(false);
    removeMessage(
      "camera_settings",
      `alert_detection_settings_${selectedCamera}`,
    );
  }, [removeMessage, selectedCamera]);

  useEffect(() => {
    if (changedValue) {
      addMessage(
        "motion_tuner",
        `Unsaved changes to alert/detection settings for (${selectedCamera})`,
        undefined,
        `alert_detection_settings_${selectedCamera}`,
      );
    } else {
      removeMessage(
        "camera_settings",
        `alert_detection_settings_${selectedCamera}`,
      );
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedValue, selectedCamera]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    saveToConfig(values as CameraSettingsValuesType);
  }

  useEffect(() => {
    document.title = "Camera Settings - Frigate";
  }, []);

  if (!cameraConfig && !selectedCamera) {
    return <ActivityIndicator />;
  }

  return (
    <>
      <div className="flex size-full flex-col md:flex-row">
        <Toaster position="top-center" closeButton={true} />
        <div className="scrollbar-container order-last mb-10 mt-2 flex h-full w-full flex-col overflow-y-auto rounded-lg border-[1px] border-secondary-foreground bg-background_alt p-2 md:order-none md:mb-0 md:mr-2 md:mt-0">
          <Heading as="h3" className="my-2">
            Camera Settings
          </Heading>

          <Separator className="my-2 flex bg-secondary" />

          <Heading as="h4" className="my-2">
            Review Classification
          </Heading>

          <div className="mb-5 mt-2 flex flex-col gap-2 text-sm text-primary-variant">
            <p>
              Not every segment of video captured by Frigate may be of the same
              level of interest to you. Frigate categorizes review items as
              alerts and detections. By default, all <em>person</em> and{" "}
              <em>car</em> objects are considered alerts. You can refine
              categorization of your review items by configuring required zones
              for them.
            </p>
            <div className="flex items-center text-primary">
              <Link
                to="https://docs.frigate.video/configuration/review"
                target="_blank"
                rel="noopener noreferrer"
                className="inline"
              >
                Read the Documentation{" "}
                <LuExternalLink className="ml-2 inline-flex size-3" />
              </Link>
            </div>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-2 space-y-6"
            >
              <div className="grid items-start gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="alerts_zones"
                  render={() => (
                    <FormItem>
                      {zones && zones?.length > 0 ? (
                        <>
                          <div className="mb-2">
                            <FormLabel className="flex flex-row items-center text-base">
                              Alerts{" "}
                              <MdCircle className="ml-3 size-2 text-severity_alert" />
                            </FormLabel>
                            <FormDescription>
                              Select zones for Alerts
                            </FormDescription>
                          </div>
                          <div className="rounded-lg bg-secondary p-4">
                            {zones?.map((zone) => (
                              <FormField
                                key={zone.name}
                                control={form.control}
                                name="alerts_zones"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={zone.name}
                                      className="mb-3 flex flex-row items-start space-x-3 space-y-0 last:mb-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          className="data-[state=checked]:bg-selected data-[state=checked]:text-primary"
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
                                      <FormLabel className="font-normal capitalize">
                                        {zone.name.replaceAll("_", " ")}
                                      </FormLabel>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="font-normal">
                          No zones are defined for this camera.
                        </div>
                      )}
                      <FormMessage />
                      <div className="flex flex-row text-sm">
                        All {alertsLabels} objects
                        {watchedAlertsZones && watchedAlertsZones.length > 0
                          ? ` detected in ${watchedAlertsZones.map((zone) => capitalizeFirstLetter(zone)).join(", ")}`
                          : ""}{" "}
                        on{" "}
                        {capitalizeFirstLetter(
                          cameraConfig?.name ?? "",
                        ).replaceAll("_", " ")}{" "}
                        will be shown as Alerts.
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="detections_zones"
                  render={() => (
                    <FormItem>
                      {zones && zones?.length > 0 ? (
                        <>
                          <div className="items-top flex flex-col space-x-0">
                            <div className="mb-4">
                              <FormLabel className="flex flex-row items-center text-base">
                                Detections{" "}
                                <MdCircle className="ml-3 size-2 text-severity_detection" />
                              </FormLabel>
                            </div>
                            <div className="mb-1 flex flex-row gap-2">
                              <Checkbox
                                id="select-detections"
                                className="data-[state=checked]:bg-selected data-[state=checked]:text-primary"
                                checked={selectDetections}
                                onCheckedChange={handleCheckedChange}
                              />
                              <div className="grid gap-1.5 leading-none">
                                <label
                                  htmlFor="select-detections"
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  Limit detections to specific zones
                                </label>
                              </div>
                            </div>
                          </div>

                          {selectDetections && (
                            <div className="mb-4">
                              <FormDescription className="mb-2">
                                Select zones for Detections
                              </FormDescription>
                            </div>
                          )}

                          {selectDetections && (
                            <div className="rounded-lg bg-secondary p-4">
                              {zones?.map((zone) => (
                                <FormField
                                  key={zone.name}
                                  control={form.control}
                                  name="detections_zones"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={zone.name}
                                        className="mb-3 flex flex-row items-start space-x-3 space-y-0 last:mb-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            className="data-[state=checked]:bg-selected data-[state=checked]:text-primary"
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
                                        <FormLabel className="font-normal capitalize">
                                          {zone.name.replaceAll("_", " ")}
                                        </FormLabel>
                                      </FormItem>
                                    );
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          <FormMessage />
                        </>
                      ) : (
                        ""
                      )}

                      <div className="flex flex-row text-sm">
                        All {detectionsLabels} objects not classified as Alerts{" "}
                        {watchedDetectionsZones &&
                        watchedDetectionsZones.length > 0
                          ? ` that are detected in ${watchedDetectionsZones.map((zone) => capitalizeFirstLetter(zone)).join(", ")}`
                          : ""}{" "}
                        on{" "}
                        {capitalizeFirstLetter(
                          cameraConfig?.name ?? "",
                        ).replaceAll("_", " ")}{" "}
                        will be shown as Detections
                        {!selectDetections && ", regardless of zone"}.
                      </div>
                    </FormItem>
                  )}
                />
              </div>

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
            </form>
          </Form>

          <Separator className="my-2 flex bg-secondary" />
        </div>
      </div>
    </>
  );
}
