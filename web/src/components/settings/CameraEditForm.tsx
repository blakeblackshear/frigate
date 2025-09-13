import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input, MultiSelectInput } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
import { toast, Toaster } from "sonner";
import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { LuTrash2, LuPlus } from "react-icons/lu";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import i18n from "@/utils/i18n";
import { TooltipPortal } from "@radix-ui/react-tooltip";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ConfigSetBody = {
  requires_restart: number;
  // TODO: type this better
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config_data: any;
  update_topic?: string;
};
const generateFixedHash = (name: string): string => {
  const encoded = encodeURIComponent(name);
  const base64 = btoa(encoded);
  const cleanHash = base64.replace(/[^a-zA-Z0-9]/g, "").substring(0, 8);
  return `cam_${cleanHash.toLowerCase()}`;
};

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
  const { data: config } = useSWR<FrigateConfig>("config");
  const [isLoading, setIsLoading] = useState(false);

  const go2rtc_ffmpegOptions = [
    {
      id: "codec",
      name: t("camera.cameraConfig.ffmpeg.go2rtc.compatibility.codec.title"),
      description: t(
        "camera.cameraConfig.ffmpeg.go2rtc.compatibility.codec.description",
      ),
      options: [
        {
          value: "#video=h264",
          label: t(
            "camera.cameraConfig.ffmpeg.go2rtc.compatibility.codec.h264",
          ),
        },
        {
          value: "#video=h265",
          label: t(
            "camera.cameraConfig.ffmpeg.go2rtc.compatibility.codec.h265",
          ),
        },
        {
          value: "#video=copy",
          label: t(
            "camera.cameraConfig.ffmpeg.go2rtc.compatibility.codec.copy",
          ),
        },
      ],
    },
    {
      id: "audio",
      name: t("camera.cameraConfig.ffmpeg.go2rtc.compatibility.audio.title"),
      description: t(
        "camera.cameraConfig.ffmpeg.go2rtc.compatibility.audio.description",
      ),
      options: [
        {
          value: "#audio=aac",
          label: t("camera.cameraConfig.ffmpeg.go2rtc.compatibility.audio.aac"),
        },
        {
          value: "#audio=opus",
          label: t(
            "camera.cameraConfig.ffmpeg.go2rtc.compatibility.audio.opus",
          ),
        },
        {
          value: "#audio=copy",
          label: t(
            "camera.cameraConfig.ffmpeg.go2rtc.compatibility.audio.copy",
          ),
        },
      ],
    },
    {
      id: "rotate",
      name: t("camera.cameraConfig.ffmpeg.go2rtc.compatibility.rotate.title"),
      description: t(
        "camera.cameraConfig.ffmpeg.go2rtc.compatibility.rotate.description",
      ),
      options: [
        {
          value: "#rotate=90",
          label: t("camera.cameraConfig.ffmpeg.go2rtc.compatibility.rotate.90"),
        },
        {
          value: "#rotate=180",
          label: t(
            "camera.cameraConfig.ffmpeg.go2rtc.compatibility.rotate.180",
          ),
        },
        {
          value: "#rotate=270",
          label: t(
            "camera.cameraConfig.ffmpeg.go2rtc.compatibility.rotate.270",
          ),
        },
      ],
    },
    {
      id: "hardware",
      name: t("camera.cameraConfig.ffmpeg.go2rtc.compatibility.hardware.title"),
      description: t(
        "camera.cameraConfig.ffmpeg.go2rtc.compatibility.hardware.description",
      ),
      options: [
        {
          value: "#hardware",
          label: t(
            "camera.cameraConfig.ffmpeg.go2rtc.compatibility.hardware.useHardware",
          ),
        },
      ],
    },
  ];
  const formSchema = useMemo(
    () =>
      z.object({
        cameraName: z
          .string()
          .min(1, { message: t("camera.cameraConfig.nameRequired") }),
        enabled: z.boolean(),
        ffmpeg: z.object({
          inputs: z
            .array(
              z.object({
                path: z.string().min(1, {
                  message: t("camera.cameraConfig.ffmpeg.pathRequired"),
                }),
                roles: z.array(RoleEnum).min(1, {
                  message: t("camera.cameraConfig.ffmpeg.rolesRequired"),
                }),
                go2rtc: z.boolean(),
                go2rtc_ffmpeg: z.string().optional(),
              }),
            )
            .min(1, {
              message: t("camera.cameraConfig.ffmpeg.inputsRequired"),
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
                message: t("camera.cameraConfig.ffmpeg.rolesUnique"),
                path: ["inputs"],
              },
            ),
        }),
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
      };
    }

    const camera = config.cameras[cameraName];
    const roles = new Set<Role>();

    camera.ffmpeg?.inputs?.forEach((input) => {
      input.roles.forEach((role) => roles.add(role as Role));
    });

    return {
      friendly_name: camera?.friendly_name || cameraName,
      name: cameraName,
      roles,
    };
  }, [cameraName, config]);

  const defaultValues: FormValues = {
    cameraName: cameraInfo?.friendly_name || cameraName || "",
    enabled: true,
    ffmpeg: {
      inputs: [
        {
          go2rtc: false,
          go2rtc_ffmpeg: "",
          path: "",
          roles: cameraInfo.roles.has("detect") ? [] : ["detect"],
        },
      ],
    },
  };

  // Load existing camera config if editing
  if (cameraName && config?.cameras[cameraName]) {
    const camera = config.cameras[cameraName];
    defaultValues.enabled = camera.enabled ?? true;
    defaultValues.ffmpeg.inputs = camera.ffmpeg?.inputs
      ? camera.ffmpeg.inputs.map((input) => {
          const isGo2rtcPath = input.path.match(
            /^rtsp:\/\/127\.0\.0\.1:8554\/(.+)$/,
          );
          const go2rtcStreamName = isGo2rtcPath ? isGo2rtcPath[1] : null;

          let originalPath = input.path;
          let ffmpegParams = "";

          if (go2rtcStreamName && config.go2rtc?.streams) {
            Object.entries(config.go2rtc.streams).forEach(
              ([streamKey, streamConfig]) => {
                if (streamKey === go2rtcStreamName) {
                  if (Array.isArray(streamConfig) && streamConfig.length >= 1) {
                    originalPath = streamConfig[0] || "";
                    ffmpegParams = streamConfig[1] || "";
                  }
                }
              },
            );

            if (
              originalPath === input.path &&
              config.go2rtc.streams[go2rtcStreamName]
            ) {
              const streamConfig = config.go2rtc.streams[go2rtcStreamName];
              if (Array.isArray(streamConfig) && streamConfig.length >= 1) {
                originalPath = streamConfig[0] || "";
                ffmpegParams = streamConfig[1] || "";
              }
            }
          }

          return {
            path: isGo2rtcPath ? originalPath : input.path,
            roles: input.roles as Role[],
            go2rtc: !!isGo2rtcPath,
            go2rtc_ffmpeg: isGo2rtcPath
              ? ffmpegParams
              : config.go2rtc?.streams?.[cameraName]?.[1] || "",
          };
        })
      : defaultValues.ffmpeg.inputs;
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ffmpeg.inputs",
  });

  // Watch ffmpeg.inputs to track used roles
  const watchedInputs = form.watch("ffmpeg.inputs");

  const saveCameraConfig = (values: FormValues) => {
    setIsLoading(true);
    let finalCameraName = values.cameraName;
    let friendly_name: string | undefined = undefined;
    const isValidName = /^[a-zA-Z0-9_-]+$/.test(values.cameraName);
    if (!isValidName) {
      finalCameraName = cameraName
        ? cameraName
        : generateFixedHash(finalCameraName);
      friendly_name = values.cameraName;
    }

    const configData: ConfigSetBody["config_data"] = {
      cameras: {
        [finalCameraName]: {
          enabled: values.enabled,
          ...(friendly_name && { friendly_name }),
          ffmpeg: {
            inputs: values.ffmpeg.inputs.map((input) => ({
              path: input.go2rtc
                ? `rtsp://127.0.0.1:8554/${finalCameraName}_${input.roles.join("_")}`
                : input.path,
              roles: input.roles,
            })),
          },
        },
      },
    };

    const hasGo2rtcEnabled = values.ffmpeg.inputs.some((input) => input.go2rtc);

    if (hasGo2rtcEnabled) {
      const go2rtcStreams: Record<string, string[]> = {};

      values.ffmpeg.inputs.forEach((input) => {
        if (input.go2rtc) {
          const streamName = `${finalCameraName}_${input.roles.join("_")}`;

          go2rtcStreams[streamName] = [input.path, input.go2rtc_ffmpeg || ""];
        }
      });

      configData.go2rtc = {
        streams: go2rtcStreams,
      };
    }

    const requestBody: ConfigSetBody = {
      requires_restart: 1,
      config_data: configData,
    };

    // Add update_topic for new cameras
    if (!cameraName) {
      requestBody.update_topic = `config/cameras/${finalCameraName}/add`;
    } else {
      requestBody.update_topic = `config/cameras/${finalCameraName}/edit`;
    }

    axios
      .put("config/set", requestBody)
      .then((res) => {
        if (res.status === 200) {
          toast.success(
            t("camera.cameraConfig.toast.success", {
              cameraName: values.cameraName,
            }),
            { position: "top-center" },
          );
          if (onSave) onSave();
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
    saveCameraConfig(values);
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
    <>
      <Toaster position="top-center" closeButton />
      <Heading as="h3" className="my-2">
        {cameraName
          ? t("camera.cameraConfig.edit")
          : t("camera.cameraConfig.add")}
      </Heading>
      <div className="my-3 text-sm text-muted-foreground">
        {t("camera.cameraConfig.description")}
      </div>
      <Separator className="my-3 bg-secondary" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="cameraName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("camera.cameraConfig.name")}</FormLabel>
                {cameraName ? (
                  <>
                    <div className="my-3 text-sm text-muted-foreground">
                      {t("camera.cameraConfig.nameOnlyChangeToFriendlyName")}
                    </div>
                  </>
                ) : (
                  ""
                )}
                <FormControl>
                  <Input
                    placeholder={t("camera.cameraConfig.namePlaceholder")}
                    {...field}
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
                <FormLabel>{t("camera.cameraConfig.enabled")}</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <FormLabel>{t("camera.cameraConfig.ffmpeg.inputs")}</FormLabel>
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="mt-2 space-y-4 rounded-md border p-4"
              >
                <FormField
                  control={form.control}
                  name={`ffmpeg.inputs.${index}.path`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("camera.cameraConfig.ffmpeg.path")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t(
                            "camera.cameraConfig.ffmpeg.pathPlaceholder",
                          )}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`ffmpeg.inputs.${index}.roles`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("camera.cameraConfig.ffmpeg.roles.title")}
                      </FormLabel>
                      <FormControl>
                        <div className="flex flex-wrap gap-2">
                          {(["audio", "detect", "record"] as const).map(
                            (role) => (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <label
                                    key={role}
                                    className="flex items-center space-x-2"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={field.value.includes(role)}
                                      onChange={(e) => {
                                        const updatedRoles = e.target.checked
                                          ? [...field.value, role]
                                          : field.value.filter(
                                              (r) => r !== role,
                                            );
                                        field.onChange(updatedRoles);
                                      }}
                                      disabled={
                                        !field.value.includes(role) &&
                                        getUsedRolesExcludingIndex(index).has(
                                          role,
                                        )
                                      }
                                    />
                                    <span>
                                      {i18n.language === "en"
                                        ? role
                                        : t(
                                            `camera.cameraConfig.ffmpeg.roles.${role}.label`,
                                          ) +
                                          "(" +
                                          role +
                                          ")"}
                                    </span>
                                  </label>
                                </TooltipTrigger>
                                <TooltipPortal>
                                  <TooltipContent>
                                    {t(
                                      `camera.cameraConfig.ffmpeg.roles.${role}.info`,
                                    )}
                                  </TooltipContent>
                                </TooltipPortal>
                              </Tooltip>
                            ),
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`ffmpeg.inputs.${index}.go2rtc`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("camera.cameraConfig.ffmpeg.go2rtc.title")}
                        <div className="my-3 text-sm text-muted-foreground">
                          {t("camera.cameraConfig.ffmpeg.go2rtc.description")}
                        </div>
                      </FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <FormLabel>
                            {t("camera.cameraConfig.enabled")}
                          </FormLabel>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`ffmpeg.inputs.${index}.go2rtc_ffmpeg`}
                  render={({ field }) => (
                    <FormItem>
                      {form.watch(`ffmpeg.inputs.${index}.go2rtc`) ? (
                        <>
                          <FormLabel>
                            {t(
                              "camera.cameraConfig.ffmpeg.go2rtc.compatibility.title",
                            )}
                          </FormLabel>
                          <div className="my-3 text-sm text-muted-foreground">
                            {t(
                              "camera.cameraConfig.ffmpeg.go2rtc.compatibility.description",
                            )}
                          </div>
                          <FormControl>
                            <MultiSelectInput
                              parameterGroups={go2rtc_ffmpegOptions}
                              onParameterChange={(params) => {
                                const combinedValue =
                                  Object.values(params).join("");
                                field.onChange(combinedValue);
                              }}
                              parameterPlaceholder={t(
                                "camera.cameraConfig.ffmpeg.go2rtc.compatibility.select",
                              )}
                              inputPlaceholder={t(
                                "camera.cameraConfig.ffmpeg.go2rtc.compatibility.custom",
                              )}
                              {...field}
                              disabled={!!cameraName} // Prevent editing name for existing cameras
                            />
                          </FormControl>
                          <FormMessage />
                        </>
                      ) : null}
                    </FormItem>
                  )}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                >
                  <LuTrash2 className="mr-2 h-4 w-4" />
                  {t("camera.cameraConfig.ffmpeg.removeInput")}
                </Button>
              </div>
            ))}
            <FormMessage>
              {form.formState.errors.ffmpeg?.inputs?.root &&
                form.formState.errors.ffmpeg.inputs.root.message}
            </FormMessage>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() =>
                append({ path: "", roles: getAvailableRoles(), go2rtc: false })
              }
            >
              <LuPlus className="mr-2 h-4 w-4" />
              {t("camera.cameraConfig.ffmpeg.addInput")}
            </Button>
          </div>

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
    </>
  );
}
