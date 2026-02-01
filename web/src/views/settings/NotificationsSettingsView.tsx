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
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { StatusBarMessagesContext } from "@/context/statusbar-provider";
import { FrigateConfig } from "@/types/frigateConfig";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { LuCheck, LuExternalLink, LuX } from "react-icons/lu";
import { CiCircleAlert } from "react-icons/ci";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trans, useTranslation } from "react-i18next";
import { useDateLocale } from "@/hooks/use-date-locale";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { cn } from "@/lib/utils";

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
  const { t } = useTranslation(["views/settings"]);
  const { getLocaleDocUrl } = useDocDomain();

  // roles

  const isAdmin = useIsAdmin();

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
          conf.enabled_in_config &&
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
        t("notification.unsavedChanges"),
        undefined,
        `notification_settings`,
      );
    } else {
      removeMessage("notification_settings", `notification_settings`);
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedValue]);

  // notification state

  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>();

  useEffect(() => {
    if (!("Notification" in window) || !window.isSecureContext) {
      return;
    }
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

  const watchAllEnabled = form.watch("allEnabled");
  const watchCameras = form.watch("cameras");

  const anyCameraNotificationsEnabled = useMemo(
    () =>
      config &&
      Object.values(config.cameras).some(
        (c) =>
          c.enabled_in_config &&
          c.notifications &&
          c.notifications.enabled_in_config,
      ),
    [config],
  );

  const shouldFetchPubKey = Boolean(
    config &&
      (config.notifications?.enabled || anyCameraNotificationsEnabled) &&
      (watchAllEnabled ||
        (Array.isArray(watchCameras) && watchCameras.length > 0)),
  );

  const { data: publicKey } = useSWR(
    shouldFetchPubKey ? "notifications/pubkey" : null,
    { revalidateOnFocus: false },
  );

  const subscribeToNotifications = useCallback(
    (registration: ServiceWorkerRegistration) => {
      if (registration) {
        addMessage(
          "notification_settings",
          t("notification.unsavedRegistrations"),
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
                toast.error(t("notification.toast.error.registerFailed"), {
                  position: "top-center",
                });
                pushSubscription.unsubscribe();
                registration.unregister();
                setRegistration(null);
              });
            toast.success(t("notification.toast.success.registered"), {
              position: "top-center",
            });
          });
      }
    },
    [publicKey, addMessage, t],
  );

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
            toast.success(t("notification.toast.success.settingSaved"), {
              position: "top-center",
            });
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
    [updateConfig, setIsLoading, allCameras, t],
  );

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    saveToConfig(values as NotificationSettingsValueType);
  }

  useEffect(() => {
    document.title = t("documentTitle.notifications");
  }, [t]);

  if (!("Notification" in window) || !window.isSecureContext) {
    return (
      <div className="scrollbar-container order-last mb-2 mt-2 flex h-full w-full flex-col overflow-y-auto pb-2 md:order-none">
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          <div className="col-span-1">
            <Heading as="h4" className="mb-2">
              {t("notification.notificationSettings.title")}
            </Heading>
            <div className="max-w-6xl">
              <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 text-sm text-primary-variant">
                <p>{t("notification.notificationSettings.desc")}</p>
                <div className="flex items-center text-primary">
                  <Link
                    to={getLocaleDocUrl("configuration/notifications")}
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
            <Alert variant="destructive">
              <CiCircleAlert className="size-5" />
              <AlertTitle>
                {t("notification.notificationUnavailable.title")}
              </AlertTitle>
              <AlertDescription>
                <Trans ns="views/settings">
                  notification.notificationUnavailable.desc
                </Trans>
                <div className="mt-3 flex items-center">
                  <Link
                    to={getLocaleDocUrl("configuration/authentication")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline"
                  >
                    {t("readTheDocumentation", { ns: "common" })}{" "}
                    <LuExternalLink className="ml-2 inline-flex size-3" />
                  </Link>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex size-full flex-col md:flex-row">
        <Toaster position="top-center" closeButton={true} />
        <div className="scrollbar-container order-last mb-2 mt-2 flex h-full w-full flex-col overflow-y-auto px-2 md:order-none">
          <div
            className={cn(
              isAdmin && "grid w-full grid-cols-1 gap-4 md:grid-cols-2",
            )}
          >
            <div className="col-span-1">
              <Heading as="h4" className="mb-2">
                {t("notification.notificationSettings.title")}
              </Heading>

              <div className="max-w-6xl">
                <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 text-sm text-primary-variant">
                  <p>{t("notification.notificationSettings.desc")}</p>
                  <div className="flex items-center text-primary">
                    <Link
                      to={getLocaleDocUrl("configuration/notifications")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline"
                    >
                      {t("readTheDocumentation", { ns: "common" })}{" "}
                      <LuExternalLink className="ml-2 inline-flex size-3" />
                    </Link>
                  </div>
                </div>
              </div>

              {isAdmin && (
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
                          <FormLabel>{t("notification.email.title")}</FormLabel>
                          <FormControl>
                            <Input
                              className="text-md w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark] md:w-72"
                              placeholder={t("notification.email.placeholder")}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {t("notification.email.desc")}
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
                                  {t("notification.cameras.title")}
                                </FormLabel>
                              </div>
                              <div className="max-w-md space-y-2 rounded-lg bg-secondary p-4">
                                <FormField
                                  control={form.control}
                                  name="allEnabled"
                                  render={({ field }) => (
                                    <FilterSwitch
                                      label={t("cameras.all.title", {
                                        ns: "components/filter",
                                      })}
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
                                    label={camera.name}
                                    type={"camera"}
                                    isChecked={field.value?.includes(
                                      camera.name,
                                    )}
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
                              {t("notification.cameras.noCameras")}
                            </div>
                          )}

                          <FormMessage />
                          <FormDescription>
                            {t("notification.cameras.desc")}
                          </FormDescription>
                        </FormItem>
                      )}
                    />

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
              )}
            </div>

            <div className="col-span-1">
              <div className="mt-4 gap-2 space-y-6">
                <div
                  className={cn(
                    isAdmin && "flex flex-col gap-2 md:max-w-[50%]",
                  )}
                >
                  <Separator
                    className={cn(
                      "my-2 flex bg-secondary",
                      isAdmin && "md:hidden",
                    )}
                  />
                  <Heading as="h4" className={cn(isAdmin ? "my-2" : "my-4")}>
                    {t("notification.deviceSpecific")}
                  </Heading>
                  <Button
                    aria-label={t("notification.registerDevice")}
                    disabled={!shouldFetchPubKey || publicKey == undefined}
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
                    {registration != null
                      ? t("notification.unregisterDevice")
                      : t("notification.registerDevice")}
                  </Button>
                  {isAdmin && registration != null && registration.active && (
                    <Button
                      aria-label={t("notification.sendTestNotification")}
                      onClick={() => sendTestNotification("notification_test")}
                    >
                      {t("notification.sendTestNotification")}
                    </Button>
                  )}
                </div>
              </div>
              {isAdmin && notificationCameras.length > 0 && (
                <div className="mt-4 gap-2 space-y-6">
                  <div className="space-y-3">
                    <Separator className="my-2 flex bg-secondary" />
                    <Heading as="h4" className="my-2">
                      {t("notification.globalSettings.title")}
                    </Heading>
                    <div className="max-w-xl">
                      <div className="mb-5 mt-2 flex flex-col gap-2 text-sm text-primary-variant">
                        <p>{t("notification.globalSettings.desc")}</p>
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
  const { t } = useTranslation(["views/settings"]);
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

  const locale = useDateLocale();

  const formatSuspendedUntil = (timestamp: string) => {
    // Some languages require a change in word order
    if (timestamp === "0") return t("time.untilForRestart", { ns: "common" });

    const time = formatUnixTimestampToDateTime(parseInt(timestamp), {
      time_style: "medium",
      date_style: "medium",
      timezone: config?.ui.timezone,
      date_format:
        config?.ui.time_format == "24hour"
          ? t("time.formattedTimestampMonthDayHourMinute.24hour", {
              ns: "common",
            })
          : t("time.formattedTimestampMonthDayHourMinute.12hour", {
              ns: "common",
            }),
      locale: locale,
    });
    return t("time.untilForTime", { ns: "common", time });
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
            <CameraNameLabel
              className="text-md cursor-pointer text-primary smart-capitalize"
              htmlFor="camera"
              camera={camera}
            />

            {!isSuspended ? (
              <div className="flex flex-row items-center gap-2 text-sm text-success">
                {t("notification.active")}
              </div>
            ) : (
              <div className="flex flex-row items-center gap-2 text-sm text-danger">
                {t("notification.suspended", {
                  time: formatSuspendedUntil(notificationSuspendUntil),
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {!isSuspended ? (
        <Select onValueChange={handleSuspend}>
          <SelectTrigger className="w-auto">
            <SelectValue placeholder={t("notification.suspendTime.suspend")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">
              {t("notification.suspendTime.5minutes")}
            </SelectItem>
            <SelectItem value="10">
              {t("notification.suspendTime.10minutes")}
            </SelectItem>
            <SelectItem value="30">
              {t("notification.suspendTime.30minutes")}
            </SelectItem>
            <SelectItem value="60">
              {t("notification.suspendTime.1hour")}
            </SelectItem>
            <SelectItem value="840">
              {t("notification.suspendTime.12hours")}
            </SelectItem>
            <SelectItem value="1440">
              {t("notification.suspendTime.24hours")}
            </SelectItem>
            <SelectItem value="off">
              {t("notification.suspendTime.untilRestart")}
            </SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Button
          variant="destructive"
          size="sm"
          onClick={handleCancelSuspension}
        >
          {t("notification.cancelSuspension")}
        </Button>
      )}
    </div>
  );
}
