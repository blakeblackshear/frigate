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

type ConfigSetBody = {
  requires_restart: number;
  // TODO: type this better
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config_data: any;
  update_topic?: string;
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

  const formSchema = useMemo(
    () =>
      z.object({
        cameraName: z
          .string()
          .min(1, { message: t("camera.cameraConfig.nameRequired") })
          .regex(/^[a-zA-Z0-9_-]+$/, {
            message: t("camera.cameraConfig.nameInvalid"),
          }),
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

  // Determine available roles for default values
  const usedRoles = useMemo(() => {
    const roles = new Set<Role>();
    if (cameraName && config?.cameras[cameraName]) {
      const camera = config.cameras[cameraName];
      camera.ffmpeg?.inputs?.forEach((input) => {
        input.roles.forEach((role) => roles.add(role as Role));
      });
    }
    return roles;
  }, [cameraName, config]);

  const defaultValues: FormValues = {
    cameraName: cameraName || "",
    enabled: true,
    ffmpeg: {
      inputs: [
        {
          path: "",
          roles: usedRoles.has("detect") ? [] : ["detect"],
        },
      ],
    },
  };

  // Load existing camera config if editing
  if (cameraName && config?.cameras[cameraName]) {
    const camera = config.cameras[cameraName];
    defaultValues.enabled = camera.enabled ?? true;
    defaultValues.ffmpeg.inputs = camera.ffmpeg?.inputs?.length
      ? camera.ffmpeg.inputs.map((input) => ({
          path: input.path,
          roles: input.roles as Role[],
        }))
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
    const configData: ConfigSetBody["config_data"] = {
      cameras: {
        [values.cameraName]: {
          enabled: values.enabled,
          ffmpeg: {
            inputs: values.ffmpeg.inputs.map((input) => ({
              path: input.path,
              roles: input.roles,
            })),
          },
        },
      },
    };

    const requestBody: ConfigSetBody = {
      requires_restart: 1,
      config_data: configData,
    };

    // Add update_topic for new cameras
    if (!cameraName) {
      requestBody.update_topic = `config/cameras/${values.cameraName}/add`;
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
    if (cameraName && values.cameraName !== cameraName) {
      // If camera name changed, delete old camera config
      const deleteRequestBody: ConfigSetBody = {
        requires_restart: 1,
        config_data: {
          cameras: {
            [cameraName]: "",
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
                <FormControl>
                  <Input
                    placeholder={t("camera.cameraConfig.namePlaceholder")}
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
                        {t("camera.cameraConfig.ffmpeg.roles")}
                      </FormLabel>
                      <FormControl>
                        <div className="flex flex-wrap gap-2">
                          {(["audio", "detect", "record"] as const).map(
                            (role) => (
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
                                      : field.value.filter((r) => r !== role);
                                    field.onChange(updatedRoles);
                                  }}
                                  disabled={
                                    !field.value.includes(role) &&
                                    getUsedRolesExcludingIndex(index).has(role)
                                  }
                                />
                                <span>{role}</span>
                              </label>
                            ),
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
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
              onClick={() => append({ path: "", roles: getAvailableRoles() })}
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
