import ActivityIndicator from "@/components/indicators/activity-indicator";
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
import Heading from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { StatusBarMessagesContext } from "@/context/statusbar-provider";
import { FrigateConfig } from "@/types/frigateConfig";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { LuCheck, LuExternalLink, LuX } from "react-icons/lu";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import useSWR from "swr";
import { z } from "zod";
import {
  useNotifications,
  useNotificationSuspend,
  useNotificationTest,
} from "@/api/ws";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import FilterSwitch from "@/components/filter/FilterSwitch";

const NOTIFICATION_SERVICE_WORKER = "notifications-worker.js";

type NotificationSettingsValueType = {
  allEnabled: boolean;
  email?: string;
  cameras: string[];
};

type NotificationsSettingsViewProps = {
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
};
export default function NotificationView({
  setUnsavedChanges,
}: NotificationsSettingsViewProps) {
  const { data: config, mutate: updateConfig } = useSWR<FrigateConfig>(
    "config",
    {
      revalidateOnFocus: false,
    },
  );

  const allCameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.cameras).sort(
      (aConf, bConf) => aConf.ui.order - bConf.ui.order,
    );
  }, [config]);

  const notificationCameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.cameras)
      .filter(
        (conf) =>
          conf.enabled &&
          conf.notifications &&
          conf.notifications.enabled_in_config,
      )
      .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
  }, [config]);

  const { send: sendTestNotification } = useNotificationTest();

  // status bar

  const { addMessage, removeMessage } = useContext(StatusBarMessagesContext)!;
  const [changedValue, setChangedValue] = useState(false);

  useEffect(() => {
    if (changedValue) {
      addMessage(
        "notification_settings",
        `Unsaved notification settings`,
        undefined,
        `notification_settings`,
      );
    } else {
      removeMessage("notification_settings", `notification_settings`);
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedValue]);

  // notification key handling

  const { data: publicKey } = useSWR(
    config?.notifications?.enabled ? "notifications/pubkey" : null,
    { revalidateOnFocus: false },
  );

  const subscribeToNotifications = useCallback(
    (registration: ServiceWorkerRegistration) => {
      if (registration) {
        addMessage(
          "notification_settings",
          "Unsaved Notification Registrations",
          undefined,
          "registration",
        );

        registration.pushManager
          .subscribe({
            userVisibleOnly: true,
            applicationServerKey: publicKey,
          })
          .then((pushSubscription) => {
            axios
              .post("notifications/register", {
                sub: pushSubscription,
              })
              .catch(() => {
                toast.error("Failed to save notification registration.", {
                  position: "top-center",
                });
                pushSubscription.unsubscribe();
                registration.unregister();
                setRegistration(null);
              });
            toast.success(
              "Successfully registered for notifications. Restarting Frigate is required before any notifications (including a test notification) can be sent.",
              {
                position: "top-center",
              },
            );
          });
      }
    },
    [publicKey, addMessage],
  );

  // notification state

  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>();

  useEffect(() => {
    navigator.serviceWorker
      .getRegistration(NOTIFICATION_SERVICE_WORKER)
      .then((worker) => {
        if (worker) {
          setRegistration(worker);
        } else {
          setRegistration(null);
        }
      })
      .catch(() => {
        setRegistration(null);
      });
  }, []);

  // form

  const [isLoading, setIsLoading] = useState(false);
  const formSchema = z.object({
    allEnabled: z.boolean(),
    email: z.string(),
    cameras: z.array(z.string()),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      allEnabled: config?.notifications.enabled,
      email: config?.notifications.email,
      cameras: config?.notifications.enabled
        ? []
        : notificationCameras.map((c) => c.name),
    },
  });

  const watchCameras = form.watch("cameras");

  useEffect(() => {
    if (watchCameras.length > 0) {
      form.setValue("allEnabled", false);
    }
  }, [watchCameras, allCameras, form]);

  const onCancel = useCallback(() => {
    if (!config) {
      return;
    }

    setUnsavedChanges(false);
    setChangedValue(false);
    form.reset({
      allEnabled: config.notifications.enabled,
      email: config.notifications.email || "",
      cameras: config?.notifications.enabled
        ? []
        : notificationCameras.map((c) => c.name),
    });
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, removeMessage, setUnsavedChanges]);

  const saveToConfig = useCallback(
    async (
      { allEnabled, email, cameras }: NotificationSettingsValueType, // values submitted via the form
    ) => {
      const allCameraNames = allCameras.map((cam) => cam.name);

      const enabledCameraQueries = cameras
        .map((cam) => `&cameras.${cam}.notifications.enabled=True`)
        .join("");

      const disabledCameraQueries = allCameraNames
        .filter((cam) => !cameras.includes(cam))
        .map(
          (cam) =>
            `&cameras.${cam}.notifications.enabled=${allEnabled ? "True" : "False"}`,
        )
        .join("");

      const allCameraQueries = enabledCameraQueries + disabledCameraQueries;

      axios
        .put(
          `config/set?notifications.enabled=${allEnabled ? "True" : "False"}&notifications.email=${email}${allCameraQueries}`,
          {
            requires_restart: 0,
          },
        )
        .then((res) => {
          if (res.status === 200) {
            toast.success("Notification settings have been saved.", {
              position: "top-center",
            });
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
    [updateConfig, setIsLoading, allCameras],
  );

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    saveToConfig(values as NotificationSettingsValueType);
  }

  return (
    <>
      <div className="flex size-full flex-col md:flex-row">
        <Toaster position="top-center" closeButton={true} />
        <div className="scrollbar-container order-last mb-10 mt-2 flex h-full w-full flex-col overflow-y-auto rounded-lg border-[1px] border-secondary-foreground bg-background_alt p-2 md:order-none md:mb-0 md:mr-2 md:mt-0">
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            <div className="col-span-1">
              <Heading as="h3" className="my-2">
                Notification Settings
              </Heading>

              <div className="max-w-6xl">
                <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 text-sm text-primary-variant">
                  <p>
                    Frigate can natively send push notifications to your device
                    when it is running in the browser or installed as a PWA.
                  </p>
                  <div className="flex items-center text-primary">
                    <Link
                      to="https://docs.frigate.video/configuration/notifications"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline"
                    >
                      Read the Documentation{" "}
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
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            className="text-md w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark] md:w-72"
                            placeholder="example@email.com"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Entering a valid email is required, as this is used by
                          the push server in case problems occur.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cameras"
                    render={({ field }) => (
                      <FormItem>
                        {allCameras && allCameras?.length > 0 ? (
                          <>
                            <div className="mb-2">
                              <FormLabel className="flex flex-row items-center text-base">
                                Cameras
                              </FormLabel>
                            </div>
                            <div className="max-w-md space-y-2 rounded-lg bg-secondary p-4">
                              <FormField
                                control={form.control}
                                name="allEnabled"
                                render={({ field }) => (
                                  <FilterSwitch
                                    label="All Cameras"
                                    isChecked={field.value}
                                    onCheckedChange={(checked) => {
                                      setChangedValue(true);
                                      if (checked) {
                                        form.setValue("cameras", []);
                                      }
                                      field.onChange(checked);
                                    }}
                                  />
                                )}
                              />
                              {allCameras?.map((camera) => (
                                <FilterSwitch
                                  key={camera.name}
                                  label={camera.name.replaceAll("_", " ")}
                                  isChecked={field.value?.includes(camera.name)}
                                  onCheckedChange={(checked) => {
                                    setChangedValue(true);
                                    let newCameras;
                                    if (checked) {
                                      newCameras = [
                                        ...field.value,
                                        camera.name,
                                      ];
                                    } else {
                                      newCameras = field.value?.filter(
                                        (value) => value !== camera.name,
                                      );
                                    }
                                    field.onChange(newCameras);
                                    form.setValue("allEnabled", false);
                                  }}
                                />
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="font-normal text-destructive">
                            No cameras available.
                          </div>
                        )}

                        <FormMessage />
                        <FormDescription>
                          Select the cameras to enable notifications for.
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <div className="flex w-full flex-row items-center gap-2 pt-2 md:w-[50%]">
                    <Button
                      className="flex flex-1"
                      aria-label="Cancel"
                      onClick={onCancel}
                      type="button"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="select"
                      disabled={isLoading}
                      className="flex flex-1"
                      aria-label="Save"
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
            </div>

            <div className="col-span-1">
              <div className="mt-4 gap-2 space-y-6">
                <div className="flex flex-col gap-2 md:max-w-[50%]">
                  <Separator className="my-2 flex bg-secondary md:hidden" />
                  <Heading as="h4" className="my-2">
                    Device-Specific Settings
                  </Heading>
                  <Button
                    aria-label="Register or unregister notifications for this device"
                    disabled={
                      !config?.notifications.enabled || publicKey == undefined
                    }
                    onClick={() => {
                      if (registration == null) {
                        Notification.requestPermission().then((permission) => {
                          if (permission === "granted") {
                            navigator.serviceWorker
                              .register(NOTIFICATION_SERVICE_WORKER)
                              .then((registration) => {
                                setRegistration(registration);

                                if (registration.active) {
                                  subscribeToNotifications(registration);
                                } else {
                                  setTimeout(
                                    () =>
                                      subscribeToNotifications(registration),
                                    1000,
                                  );
                                }
                              });
                          }
                        });
                      } else {
                        registration.pushManager
                          .getSubscription()
                          .then((pushSubscription) => {
                            pushSubscription?.unsubscribe();
                            registration.unregister();
                            setRegistration(null);
                            removeMessage(
                              "notification_settings",
                              "registration",
                            );
                          });
                      }
                    }}
                  >
                    {`${registration != null ? "Unregister" : "Register"} for notifications on this device`}
                  </Button>
                  {registration != null && registration.active && (
                    <Button
                      aria-label="Send a test notification"
                      onClick={() => sendTestNotification("notification_test")}
                    >
                      Send a test notification
                    </Button>
                  )}
                </div>
              </div>
              {notificationCameras.length > 0 && (
                <div className="mt-4 gap-2 space-y-6">
                  <div className="space-y-3">
                    <Separator className="my-2 flex bg-secondary" />
                    <Heading as="h4" className="my-2">
                      Global Settings
                    </Heading>
                    <div className="max-w-xl">
                      <div className="mb-5 mt-2 flex flex-col gap-2 text-sm text-primary-variant">
                        <p>
                          Temporarily suspend notifications for specific cameras
                          on all registered devices.
                        </p>
                      </div>
                    </div>

                    <div className="flex max-w-2xl flex-col gap-2.5">
                      <div className="rounded-lg bg-secondary p-5">
                        <div className="grid gap-6">
                          {notificationCameras.map((item) => (
                            <CameraNotificationSwitch
                              config={config}
                              camera={item.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

type CameraNotificationSwitchProps = {
  config?: FrigateConfig;
  camera: string;
};

export function CameraNotificationSwitch({
  config,
  camera,
}: CameraNotificationSwitchProps) {
  const { payload: notificationState, send: sendNotification } =
    useNotifications(camera);
  const { payload: notificationSuspendUntil, send: sendNotificationSuspend } =
    useNotificationSuspend(camera);
  const [isSuspended, setIsSuspended] = useState<boolean>(false);

  useEffect(() => {
    if (notificationSuspendUntil) {
      setIsSuspended(
        notificationSuspendUntil !== "0" || notificationState === "OFF",
      );
    }
  }, [notificationSuspendUntil, notificationState]);

  const handleSuspend = (duration: string) => {
    setIsSuspended(true);
    if (duration == "off") {
      sendNotification("OFF");
    } else {
      sendNotificationSuspend(parseInt(duration));
    }
  };

  const handleCancelSuspension = () => {
    sendNotification("ON");
    sendNotificationSuspend(0);
  };

  const formatSuspendedUntil = (timestamp: string) => {
    if (timestamp === "0") return "Frigate restarts.";

    return formatUnixTimestampToDateTime(parseInt(timestamp), {
      time_style: "medium",
      date_style: "medium",
      timezone: config?.ui.timezone,
      strftime_fmt: `%b %d, ${config?.ui.time_format == "24hour" ? "%H:%M" : "%I:%M %p"}`,
    });
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-col items-start justify-start">
        <div className="flex flex-row items-center justify-start gap-3">
          {!isSuspended ? (
            <LuCheck className="size-6 text-success" />
          ) : (
            <LuX className="size-6 text-danger" />
          )}
          <div className="flex flex-col">
            <Label
              className="text-md cursor-pointer capitalize text-primary"
              htmlFor="camera"
            >
              {camera.replaceAll("_", " ")}
            </Label>

            {!isSuspended ? (
              <div className="flex flex-row items-center gap-2 text-sm text-success">
                Notifications Active
              </div>
            ) : (
              <div className="flex flex-row items-center gap-2 text-sm text-danger">
                Notifications suspended until{" "}
                {formatSuspendedUntil(notificationSuspendUntil)}
              </div>
            )}
          </div>
        </div>
      </div>

      {!isSuspended ? (
        <Select onValueChange={handleSuspend}>
          <SelectTrigger className="w-auto">
            <SelectValue placeholder="Suspend" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">Suspend for 5 minutes</SelectItem>
            <SelectItem value="10">Suspend for 10 minutes</SelectItem>
            <SelectItem value="30">Suspend for 30 minutes</SelectItem>
            <SelectItem value="60">Suspend for 1 hour</SelectItem>
            <SelectItem value="840">Suspend for 12 hours</SelectItem>
            <SelectItem value="1440">Suspend for 24 hours</SelectItem>
            <SelectItem value="off">Suspend until restart</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Button
          variant="destructive"
          size="sm"
          onClick={handleCancelSuspension}
        >
          Cancel Suspension
        </Button>
      )}
    </div>
  );
}
