import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useState, useMemo, useEffect } from "react";
import { LuTrash2, LuPlus } from "react-icons/lu";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import { processCameraName } from "@/utils/cameraUtil";
import { Label } from "@/components/ui/label";
import { ConfigSetBody } from "@/types/cameraWizard";
import { Toaster } from "../ui/sonner";

const RoleEnum = z.enum(["audio", "detect", "record"]);
type Role = z.infer<typeof RoleEnum>;

type CameraEditFormProps = {
  cameraName?: string;
  onSave?: () => void;
  onCancel?: () => void;
};

export default function CameraEditForm({
  cameraName,
  onSave,
  onCancel,
}: CameraEditFormProps) {
  const { t } = useTranslation(["views/settings"]);
  const { data: config, mutate: mutateConfig } =
    useSWR<FrigateConfig>("config");
  const { data: rawPaths, mutate: mutateRawPaths } = useSWR<{
    cameras: Record<
      string,
      { ffmpeg: { inputs: { path: string; roles: string[] }[] } }
    >;
    go2rtc: { streams: Record<string, string | string[]> };
  }>(cameraName ? "config/raw_paths" : null);
  const [isLoading, setIsLoading] = useState(false);

  const formSchema = useMemo(
    () =>
      z.object({
        cameraName: z
          .string()
          .min(1, { message: t("cameraManagement.cameraConfig.nameRequired") }),
        enabled: z.boolean(),
        ffmpeg: z.object({
          inputs: z
            .array(
              z.object({
                path: z.string().min(1, {
                  message: t(
                    "cameraManagement.cameraConfig.ffmpeg.pathRequired",
                  ),
                }),
                roles: z.array(RoleEnum).min(1, {
                  message: t(
                    "cameraManagement.cameraConfig.ffmpeg.rolesRequired",
                  ),
                }),
              }),
            )
            .min(1, {
              message: t("cameraManagement.cameraConfig.ffmpeg.inputsRequired"),
            })
            .refine(
              (inputs) => {
                const roleOccurrences = new Map<Role, number>();
                inputs.forEach((input) => {
                  input.roles.forEach((role) => {
                    roleOccurrences.set(
                      role,
                      (roleOccurrences.get(role) || 0) + 1,
                    );
                  });
                });
                return Array.from(roleOccurrences.values()).every(
                  (count) => count <= 1,
                );
              },
              {
                message: t("cameraManagement.cameraConfig.ffmpeg.rolesUnique"),
                path: ["inputs"],
              },
            ),
        }),
        go2rtcStreams: z.record(z.string(), z.array(z.string())).optional(),
      }),
    [t],
  );

  type FormValues = z.infer<typeof formSchema>;

  const cameraInfo = useMemo(() => {
    if (!cameraName || !config?.cameras[cameraName]) {
      return {
        friendly_name: undefined,
        name: cameraName || "",
        roles: new Set<Role>(),
        go2rtcStreams: {},
      };
    }

    const camera = config.cameras[cameraName];
    const roles = new Set<Role>();

    camera.ffmpeg?.inputs?.forEach((input) => {
      input.roles.forEach((role) => roles.add(role as Role));
    });

    // Load existing go2rtc streams
    const go2rtcStreams = config.go2rtc?.streams || {};

    return {
      friendly_name: camera?.friendly_name || cameraName,
      name: cameraName,
      roles,
      go2rtcStreams,
    };
  }, [cameraName, config]);

  const defaultValues: FormValues = {
    cameraName: cameraInfo?.friendly_name || cameraName || "",
    enabled: true,
    ffmpeg: {
      inputs: [
        {
          path: "",
          roles: cameraInfo.roles.has("detect") ? [] : ["detect"],
        },
      ],
    },
    go2rtcStreams: {},
  };

  // Load existing camera config if editing
  if (cameraName && config?.cameras[cameraName]) {
    const camera = config.cameras[cameraName];
    defaultValues.enabled = camera.enabled ?? true;

    // Use raw paths from the admin endpoint if available, otherwise fall back to masked paths
    const rawCameraData = rawPaths?.cameras?.[cameraName];
    defaultValues.ffmpeg.inputs = rawCameraData?.ffmpeg?.inputs?.length
      ? rawCameraData.ffmpeg.inputs.map((input) => ({
          path: input.path,
          roles: input.roles as Role[],
        }))
      : camera.ffmpeg?.inputs?.length
        ? camera.ffmpeg.inputs.map((input) => ({
            path: input.path,
            roles: input.roles as Role[],
          }))
        : defaultValues.ffmpeg.inputs;

    const go2rtcStreams =
      rawPaths?.go2rtc?.streams || config.go2rtc?.streams || {};
    const cameraStreams: Record<string, string[]> = {};

    // get candidate stream names for this camera. could be the camera's own name,
    // any restream names referenced by this camera, or any keys under live --> streams
    const validNames = new Set<string>();
    validNames.add(cameraName);

    // deduce go2rtc stream names from rtsp restream inputs
    camera.ffmpeg?.inputs?.forEach((input) => {
      // exclude any query strings or trailing slashes from the stream name
      const restreamMatch = input.path.match(
        /^rtsp:\/\/127\.0\.0\.1:8554\/([^?#/]+)(?:[?#].*)?$/,
      );
      if (restreamMatch) {
        const streamName = restreamMatch[1];
        validNames.add(streamName);
      }
    });

    // Include live --> streams keys
    const liveStreams = camera?.live?.streams;
    if (liveStreams) {
      Object.keys(liveStreams).forEach((key) => {
        validNames.add(key);
      });
    }

    // Map only go2rtc entries that match the collected names
    Object.entries(go2rtcStreams).forEach(([name, urls]) => {
      if (validNames.has(name)) {
        cameraStreams[name] = Array.isArray(urls) ? urls : [urls];
      }
    });

    defaultValues.go2rtcStreams = cameraStreams;
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

  // Update form values when rawPaths loads
  useEffect(() => {
    if (
      cameraName &&
      config?.cameras[cameraName] &&
      rawPaths?.cameras?.[cameraName]
    ) {
      const camera = config.cameras[cameraName];
      const rawCameraData = rawPaths.cameras[cameraName];

      // Update ffmpeg inputs with raw paths
      if (rawCameraData.ffmpeg?.inputs?.length) {
        form.setValue(
          "ffmpeg.inputs",
          rawCameraData.ffmpeg.inputs.map((input) => ({
            path: input.path,
            roles: input.roles as Role[],
          })),
        );
      }

      // Update go2rtc streams with raw URLs
      if (rawPaths.go2rtc?.streams) {
        const validNames = new Set<string>();
        validNames.add(cameraName);

        camera.ffmpeg?.inputs?.forEach((input) => {
          const restreamMatch = input.path.match(
            /^rtsp:\/\/127\.0\.0\.1:8554\/([^?#/]+)(?:[?#].*)?$/,
          );
          if (restreamMatch) {
            validNames.add(restreamMatch[1]);
          }
        });

        const liveStreams = camera?.live?.streams;
        if (liveStreams) {
          Object.keys(liveStreams).forEach((key) => validNames.add(key));
        }

        const cameraStreams: Record<string, string[]> = {};
        Object.entries(rawPaths.go2rtc.streams).forEach(([name, urls]) => {
          if (validNames.has(name)) {
            cameraStreams[name] = Array.isArray(urls) ? urls : [urls];
          }
        });

        if (Object.keys(cameraStreams).length > 0) {
          form.setValue("go2rtcStreams", cameraStreams);
        }
      }
    }
  }, [cameraName, config, rawPaths, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ffmpeg.inputs",
  });

  // Watch ffmpeg.inputs to track used roles
  const watchedInputs = form.watch("ffmpeg.inputs");

  // Watch go2rtc streams
  const watchedGo2rtcStreams = form.watch("go2rtcStreams") || {};

  const saveCameraConfig = (values: FormValues) => {
    setIsLoading(true);
    const { finalCameraName, friendlyName } = processCameraName(
      values.cameraName,
    );

    const configData: ConfigSetBody["config_data"] = {
      cameras: {
        [finalCameraName]: {
          enabled: values.enabled,
          ...(friendlyName && { friendly_name: friendlyName }),
          ffmpeg: {
            inputs: values.ffmpeg.inputs.map((input) => ({
              path: input.path,
              roles: input.roles,
            })),
          },
        },
      },
    };

    // Add go2rtc streams if provided
    if (values.go2rtcStreams && Object.keys(values.go2rtcStreams).length > 0) {
      configData.go2rtc = {
        streams: values.go2rtcStreams,
      };
    }

    const requestBody: ConfigSetBody = {
      requires_restart: 1,
      config_data: configData,
    };

    // Add update_topic for new cameras
    if (!cameraName) {
      requestBody.update_topic = `config/cameras/${finalCameraName}/add`;
    }

    axios
      .put("config/set", requestBody)
      .then((res) => {
        if (res.status === 200) {
          // Update running go2rtc instance if streams were configured
          if (
            values.go2rtcStreams &&
            Object.keys(values.go2rtcStreams).length > 0
          ) {
            const updatePromises = Object.entries(values.go2rtcStreams).map(
              ([streamName, urls]) =>
                axios.put(
                  `go2rtc/streams/${streamName}?src=${encodeURIComponent(urls[0])}`,
                ),
            );

            Promise.allSettled(updatePromises).then(() => {
              toast.success(
                t("cameraManagement.cameraConfig.toast.success", {
                  cameraName: values.cameraName,
                }),
                { position: "top-center" },
              );
              mutateConfig();
              mutateRawPaths();
              if (onSave) onSave();
            });
          } else {
            toast.success(
              t("cameraManagement.cameraConfig.toast.success", {
                cameraName: values.cameraName,
              }),
              { position: "top-center" },
            );
            mutateConfig();
            mutateRawPaths();
            if (onSave) onSave();
          }
        } else {
          throw new Error(res.statusText);
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(
          t("toast.save.error.title", { errorMessage, ns: "common" }),
          { position: "top-center" },
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const onSubmit = (values: FormValues) => {
    if (
      cameraName &&
      values.cameraName !== cameraName &&
      values.cameraName !== cameraInfo?.friendly_name
    ) {
      // If camera name changed, delete old camera config
      const deleteRequestBody = {
        requires_restart: 1,
        config_data: {
          cameras: {
            [cameraName]: null,
          },
        },
        update_topic: `config/cameras/${cameraName}/remove`,
      };

      axios
        .put("config/set", deleteRequestBody)
        .then(() => saveCameraConfig(values))
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(
            t("toast.save.error.title", { errorMessage, ns: "common" }),
            { position: "top-center" },
          );
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      saveCameraConfig(values);
    }
  };

  // Determine available roles for new streams
  const getAvailableRoles = (): Role[] => {
    const used = new Set<Role>();
    watchedInputs.forEach((input) => {
      input.roles.forEach((role) => used.add(role));
    });
    return used.has("detect") ? [] : ["detect"];
  };

  const getUsedRolesExcludingIndex = (excludeIndex: number) => {
    const roles = new Set<Role>();
    watchedInputs.forEach((input, idx) => {
      if (idx !== excludeIndex) {
        input.roles.forEach((role) => roles.add(role));
      }
    });
    return roles;
  };

  return (
    <div className="scrollbar-container max-w-4xl overflow-y-auto md:mb-24">
      <Toaster position="top-center" closeButton />
      <Heading as="h3" className="my-2">
        {cameraName
          ? t("cameraManagement.cameraConfig.edit")
          : t("cameraManagement.cameraConfig.add")}
      </Heading>
      <div className="my-3 text-sm text-muted-foreground">
        {t("cameraManagement.cameraConfig.description")}
      </div>
      <Separator className="my-3 bg-secondary" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="cameraName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("cameraManagement.cameraConfig.name")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t(
                      "cameraManagement.cameraConfig.namePlaceholder",
                    )}
                    {...field}
                    disabled={!!cameraName} // Prevent editing name for existing cameras
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>
                  {t("cameraManagement.cameraConfig.enabled")}
                </FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <Label className="text-sm font-medium">
              {t("cameraManagement.cameraConfig.ffmpeg.inputs")}
            </Label>
            {fields.map((field, index) => (
              <Card key={field.id} className="bg-secondary text-primary">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">
                      {t("cameraWizard.step2.streamTitle", {
                        number: index + 1,
                      })}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="text-secondary-foreground hover:text-secondary-foreground"
                    >
                      <LuTrash2 className="size-5" />
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name={`ffmpeg.inputs.${index}.path`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          {t("cameraManagement.cameraConfig.ffmpeg.path")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="h-8"
                            placeholder={t(
                              "cameraManagement.cameraConfig.ffmpeg.pathPlaceholder",
                            )}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {t("cameraManagement.cameraConfig.ffmpeg.roles")}
                    </Label>
                    <div className="rounded-lg bg-background p-3">
                      <div className="flex flex-wrap gap-2">
                        {(["detect", "record", "audio"] as const).map(
                          (role) => {
                            const isUsedElsewhere =
                              getUsedRolesExcludingIndex(index).has(role);
                            const isChecked =
                              watchedInputs[index]?.roles?.includes(role) ||
                              false;
                            return (
                              <div
                                key={role}
                                className="flex w-full items-center justify-between"
                              >
                                <span className="text-sm capitalize">
                                  {role}
                                </span>
                                <Switch
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    const currentRoles =
                                      watchedInputs[index]?.roles || [];
                                    const updatedRoles = checked
                                      ? [...currentRoles, role]
                                      : currentRoles.filter((r) => r !== role);
                                    form.setValue(
                                      `ffmpeg.inputs.${index}.roles`,
                                      updatedRoles,
                                    );
                                  }}
                                  disabled={!isChecked && isUsedElsewhere}
                                />
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <FormMessage>
              {form.formState.errors.ffmpeg?.inputs?.root &&
                form.formState.errors.ffmpeg.inputs.root.message}
            </FormMessage>
            <Button
              type="button"
              onClick={() => append({ path: "", roles: getAvailableRoles() })}
              variant="outline"
              className=""
            >
              <LuPlus className="mr-2 size-4" />
              {t("cameraManagement.cameraConfig.ffmpeg.addInput")}
            </Button>
          </div>

          {/* go2rtc Streams Section */}
          {Object.keys(watchedGo2rtcStreams).length > 0 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">
                {t("cameraManagement.cameraConfig.go2rtcStreams")}
              </Label>
              {Object.entries(watchedGo2rtcStreams).map(
                ([streamName, urls]) => (
                  <Card key={streamName} className="bg-secondary text-primary">
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{streamName}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updatedStreams = { ...watchedGo2rtcStreams };
                            delete updatedStreams[streamName];
                            form.setValue("go2rtcStreams", updatedStreams);
                          }}
                          className="text-secondary-foreground hover:text-secondary-foreground"
                        >
                          <LuTrash2 className="size-5" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          {t("cameraManagement.cameraConfig.streamUrls")}
                        </Label>
                        {(Array.isArray(urls) ? urls : [urls]).map(
                          (url, urlIndex) => (
                            <div
                              key={urlIndex}
                              className="flex items-center gap-2"
                            >
                              <Input
                                className="h-8 flex-1"
                                value={url}
                                onChange={(e) => {
                                  const updatedStreams = {
                                    ...watchedGo2rtcStreams,
                                  };
                                  const currentUrls = Array.isArray(
                                    updatedStreams[streamName],
                                  )
                                    ? updatedStreams[streamName]
                                    : [updatedStreams[streamName]];
                                  currentUrls[urlIndex] = e.target.value;
                                  updatedStreams[streamName] = currentUrls;
                                  form.setValue(
                                    "go2rtcStreams",
                                    updatedStreams,
                                  );
                                }}
                                placeholder="rtsp://username:password@host:port/path"
                              />
                              {(Array.isArray(urls) ? urls : [urls]).length >
                                1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const updatedStreams = {
                                      ...watchedGo2rtcStreams,
                                    };
                                    const currentUrls = Array.isArray(
                                      updatedStreams[streamName],
                                    )
                                      ? updatedStreams[streamName]
                                      : [updatedStreams[streamName]];
                                    currentUrls.splice(urlIndex, 1);
                                    updatedStreams[streamName] = currentUrls;
                                    form.setValue(
                                      "go2rtcStreams",
                                      updatedStreams,
                                    );
                                  }}
                                  className="text-secondary-foreground hover:text-secondary-foreground"
                                >
                                  <LuTrash2 className="size-4" />
                                </Button>
                              )}
                            </div>
                          ),
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const updatedStreams = { ...watchedGo2rtcStreams };
                            const currentUrls = Array.isArray(
                              updatedStreams[streamName],
                            )
                              ? updatedStreams[streamName]
                              : [updatedStreams[streamName]];
                            currentUrls.push("");
                            updatedStreams[streamName] = currentUrls;
                            form.setValue("go2rtcStreams", updatedStreams);
                          }}
                          className="w-fit"
                        >
                          <LuPlus className="mr-2 size-4" />
                          {t("cameraManagement.cameraConfig.addUrl")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ),
              )}
              <Button
                type="button"
                onClick={() => {
                  const streamName = `${cameraName}_stream_${Object.keys(watchedGo2rtcStreams).length + 1}`;
                  const updatedStreams = {
                    ...watchedGo2rtcStreams,
                    [streamName]: [""],
                  };
                  form.setValue("go2rtcStreams", updatedStreams);
                }}
                variant="outline"
                className=""
              >
                <LuPlus className="mr-2 size-4" />
                {t("cameraManagement.cameraConfig.addGo2rtcStream")}
              </Button>
            </div>
          )}

          <div className="flex w-full flex-row items-center gap-2 pt-2 md:w-[50%]">
            <Button
              className="flex flex-1"
              aria-label={t("button.cancel", { ns: "common" })}
              onClick={onCancel}
              type="button"
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
    </div>
  );
}
