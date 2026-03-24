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
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { StatusBarMessagesContext } from "@/context/statusbar-provider";
import { FrigateConfig } from "@/types/frigateConfig";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import cloneDeep from "lodash/cloneDeep";
import isEqual from "lodash/isEqual";
import set from "lodash/set";
import type { ConfigSectionData, JsonObject } from "@/types/configForm";
import { sanitizeSectionData } from "@/utils/configUtil";
import type { SectionRendererProps } from "./registry";

const NOTIFICATION_SERVICE_WORKER = "/notification-worker.js";
import {
  SettingsGroupCard,
  SPLIT_ROW_CLASS_NAME,
  CONTROL_COLUMN_CLASS_NAME,
} from "@/components/card/SettingsGroupCard";

export default function NotificationsSettingsExtras({
  formContext,
}: SectionRendererProps) {
  const { t } = useTranslation([
    "views/settings",
    "common",
    "components/filter",
  ]);
  const { getLocaleDocUrl } = useDocDomain();

  // roles
  const isAdmin = useIsAdmin();

  // status bar
  const { addMessage, removeMessage } = useContext(StatusBarMessagesContext)!;

  // config
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  const allCameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.cameras)
      .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order)
      .filter((c) => c.enabled_in_config);
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

  // notification state
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>();
  const [cameraSelectionTouched, setCameraSelectionTouched] = useState(false);

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
  const formSchema = z.object({
    allEnabled: z.boolean(),
    email: z.string(),
    cameras: z.array(z.string()),
  });

  const pendingDataBySection = useMemo(
    () => formContext?.pendingDataBySection ?? {},
    [formContext?.pendingDataBySection],
  );
  const pendingCameraOverrides = useMemo(() => {
    const overrides: Record<string, boolean> = {};
    Object.entries(pendingDataBySection).forEach(([key, data]) => {
      if (!key.endsWith("::notifications")) {
        return;
      }
      const cameraName = key.slice(0, key.indexOf("::"));
      const enabled = (data as JsonObject | undefined)?.enabled;
      if (typeof enabled === "boolean") {
        overrides[cameraName] = enabled;
      }
    });
    return overrides;
  }, [pendingDataBySection]);

  const defaultValues = useMemo(() => {
    const formData = formContext?.formData as JsonObject | undefined;
    const enabledValue =
      typeof formData?.enabled === "boolean"
        ? formData.enabled
        : (config?.notifications.enabled ?? false);
    const emailValue =
      typeof formData?.email === "string"
        ? formData.email
        : (config?.notifications.email ?? "");
    const baseEnabledSet = new Set(
      notificationCameras.map((camera) => camera.name),
    );
    const selectedCameras = enabledValue
      ? []
      : allCameras
          .filter((camera) => {
            const pendingEnabled = pendingCameraOverrides[camera.name];
            if (typeof pendingEnabled === "boolean") {
              return pendingEnabled;
            }
            return baseEnabledSet.has(camera.name);
          })
          .map((camera) => camera.name);

    return {
      allEnabled: Boolean(enabledValue),
      email: typeof emailValue === "string" ? emailValue : "",
      cameras: selectedCameras,
    };
  }, [
    allCameras,
    config?.notifications.email,
    config?.notifications.enabled,
    formContext?.formData,
    notificationCameras,
    pendingCameraOverrides,
  ]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues,
  });

  const watchAllEnabled = form.watch("allEnabled");
  const watchCameras = form.watch("cameras");
  const watchEmail = form.watch("email");
  const pendingCameraOverridesRef = useRef<Set<string>>(new Set());

  const resetFormState = useCallback(
    (values: z.infer<typeof formSchema>) => {
      form.reset(values);
      setCameraSelectionTouched(false);
      pendingCameraOverridesRef.current.clear();
    },
    [form],
  );

  // pending changes sync (Undo All / Save All)
  const hasPendingNotifications = useMemo(
    () =>
      Object.keys(pendingDataBySection).some(
        (key) => key === "notifications" || key.endsWith("::notifications"),
      ),
    [pendingDataBySection],
  );
  const hasPendingNotificationsRef = useRef(hasPendingNotifications);

  useEffect(() => {
    if (!config || form.formState.isDirty || hasPendingNotifications) {
      return;
    }
    resetFormState(defaultValues);
  }, [
    config,
    defaultValues,
    form.formState.isDirty,
    hasPendingNotifications,
    resetFormState,
  ]);

  useEffect(() => {
    const hadPending = hasPendingNotificationsRef.current;
    hasPendingNotificationsRef.current = hasPendingNotifications;

    if (hadPending && !hasPendingNotifications) {
      resetFormState(defaultValues);
    }
  }, [hasPendingNotifications, defaultValues, resetFormState]);

  useEffect(() => {
    if (!formContext?.onFormDataChange) {
      return;
    }
    const baseData =
      (formContext.formData as JsonObject | undefined) ??
      (config?.notifications as JsonObject | undefined);
    if (!baseData) {
      return;
    }
    const nextData = cloneDeep(baseData);
    const normalizedEmail = watchEmail?.trim() ? watchEmail : null;
    set(nextData, "enabled", Boolean(watchAllEnabled));
    set(nextData, "email", normalizedEmail);
    formContext.onFormDataChange(nextData as ConfigSectionData);
  }, [config, formContext, watchAllEnabled, watchEmail]);

  // camera selection overrides
  const baselineCameraSelection = useMemo(() => {
    if (!config) {
      return [] as string[];
    }
    return config.notifications.enabled
      ? []
      : notificationCameras.map((camera) => camera.name);
  }, [config, notificationCameras]);

  const cameraSelectionDirty = useMemo(() => {
    const current = Array.isArray(watchCameras) ? watchCameras : [];
    return !isEqual([...current].sort(), [...baselineCameraSelection].sort());
  }, [watchCameras, baselineCameraSelection]);

  useEffect(() => {
    formContext?.setExtraHasChanges?.(cameraSelectionDirty);
  }, [cameraSelectionDirty, formContext]);

  useEffect(() => {
    const onPendingDataChange = formContext?.onPendingDataChange;
    if (!onPendingDataChange || !config) {
      return;
    }

    if (!cameraSelectionTouched) {
      return;
    }

    if (!cameraSelectionDirty) {
      pendingCameraOverridesRef.current.forEach((cameraName) => {
        onPendingDataChange("notifications", cameraName, null);
      });
      pendingCameraOverridesRef.current.clear();
      setCameraSelectionTouched(false);
      return;
    }

    const selectedCameras = Array.isArray(watchCameras) ? watchCameras : [];

    allCameras.forEach((camera) => {
      const desiredEnabled = watchAllEnabled
        ? true
        : selectedCameras.includes(camera.name);
      const currentNotifications = config.cameras[camera.name]?.notifications;
      const currentEnabled = currentNotifications?.enabled;

      if (desiredEnabled === currentEnabled) {
        if (pendingCameraOverridesRef.current.has(camera.name)) {
          onPendingDataChange("notifications", camera.name, null);
          pendingCameraOverridesRef.current.delete(camera.name);
        }
        return;
      }

      if (!currentNotifications) {
        return;
      }

      const nextNotifications = cloneDeep(
        currentNotifications as JsonObject,
      ) as JsonObject;
      set(nextNotifications, "enabled", desiredEnabled);
      const sanitizedNotifications = sanitizeSectionData(
        nextNotifications as ConfigSectionData,
        ["enabled_in_config", "email"],
      );
      onPendingDataChange("notifications", camera.name, sanitizedNotifications);
      pendingCameraOverridesRef.current.add(camera.name);
    });
  }, [
    allCameras,
    cameraSelectionDirty,
    cameraSelectionTouched,
    config,
    formContext,
    watchAllEnabled,
    watchCameras,
  ]);

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
    (workerRegistration: ServiceWorkerRegistration) => {
      if (!workerRegistration) {
        return;
      }

      addMessage(
        "notification_settings",
        t("notification.unsavedRegistrations"),
        undefined,
        "registration",
      );

      workerRegistration.pushManager
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
              workerRegistration.unregister();
              setRegistration(null);
            });
          toast.success(t("notification.toast.success.registered"), {
            position: "top-center",
          });
        });
    },
    [addMessage, publicKey, t],
  );

  useEffect(() => {
    if (watchCameras.length > 0) {
      form.setValue("allEnabled", false);
    }
  }, [watchCameras, allCameras, form]);

  useEffect(() => {
    document.title = t("documentTitle.notifications");
  }, [t]);

  if (formContext?.level && formContext.level !== "global") {
    return null;
  }

  if (!config) {
    return <ActivityIndicator />;
  }

  if (!("Notification" in window) || !window.isSecureContext) {
    return (
      <div className="scrollbar-container order-last mb-2 mt-2 flex h-full w-full flex-col overflow-y-auto pb-2 md:order-none">
        <div className="w-full max-w-5xl">
          <SettingsGroupCard
            title={t("notification.notificationSettings.title")}
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-2 text-sm text-primary-variant">
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
          </SettingsGroupCard>
        </div>
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col md:flex-row">
      <Toaster position="top-center" closeButton={true} />
      <div className="scrollbar-container order-last mb-2 mt-2 flex h-full w-full flex-col overflow-y-auto px-2 md:order-none">
        <div className={cn("w-full max-w-5xl space-y-6")}>
          {isAdmin && (
            <SettingsGroupCard
              title={t("notification.notificationSettings.title")}
            >
              <div className="space-y-6">
                <Form {...form}>
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className={SPLIT_ROW_CLASS_NAME}>
                          <div className="space-y-1.5">
                            <FormLabel htmlFor="notification-email">
                              {t("notification.email.title")}
                            </FormLabel>
                            <FormDescription className="hidden md:block">
                              {t("notification.email.desc")}
                            </FormDescription>
                          </div>

                          <div
                            className={`${CONTROL_COLUMN_CLASS_NAME} space-y-1.5`}
                          >
                            <FormControl>
                              <Input
                                id="notification-email"
                                className="text-md w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark] md:w-72"
                                placeholder={t(
                                  "notification.email.placeholder",
                                )}
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="md:hidden">
                              {t("notification.email.desc")}
                            </FormDescription>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cameras"
                      render={({ field }) => (
                        <FormItem className={SPLIT_ROW_CLASS_NAME}>
                          <div className="space-y-1.5">
                            <FormLabel className="text-base">
                              {t("notification.cameras.title")}
                            </FormLabel>
                            <FormDescription className="hidden md:block">
                              {t("notification.cameras.desc")}
                            </FormDescription>
                          </div>

                          <div
                            className={`${CONTROL_COLUMN_CLASS_NAME} space-y-1.5`}
                          >
                            {allCameras.length > 0 ? (
                              <div className="w-full space-y-2 rounded-lg bg-secondary p-4">
                                <FormField
                                  control={form.control}
                                  name="allEnabled"
                                  render={({ field: allEnabledField }) => (
                                    <FilterSwitch
                                      label={t("cameras.all.title", {
                                        ns: "components/filter",
                                      })}
                                      isChecked={allEnabledField.value}
                                      onCheckedChange={(checked) => {
                                        setCameraSelectionTouched(true);
                                        if (checked) {
                                          form.setValue("cameras", []);
                                        }
                                        allEnabledField.onChange(checked);
                                      }}
                                    />
                                  )}
                                />
                                {allCameras.map((camera) => {
                                  const currentCameras = Array.isArray(
                                    field.value,
                                  )
                                    ? field.value
                                    : [];
                                  return (
                                    <FilterSwitch
                                      key={camera.name}
                                      label={camera.name}
                                      type="camera"
                                      isChecked={currentCameras.includes(
                                        camera.name,
                                      )}
                                      onCheckedChange={(checked) => {
                                        setCameraSelectionTouched(true);
                                        const newCameras = checked
                                          ? Array.from(
                                              new Set([
                                                ...currentCameras,
                                                camera.name,
                                              ]),
                                            )
                                          : currentCameras.filter(
                                              (value) => value !== camera.name,
                                            );
                                        field.onChange(newCameras);
                                        form.setValue("allEnabled", false);
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="font-normal text-destructive">
                                {t("notification.cameras.noCameras")}
                              </div>
                            )}
                            <FormDescription className="md:hidden">
                              {t("notification.cameras.desc")}
                            </FormDescription>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>
              </div>
            </SettingsGroupCard>
          )}

          <div className="space-y-6">
            <SettingsGroupCard title={t("notification.deviceSpecific")}>
              <div className={cn("space-y-2", isAdmin && "md:max-w-[50%]")}>
                <Button
                  aria-label={t("notification.registerDevice")}
                  className="w-full md:w-auto"
                  disabled={!shouldFetchPubKey || publicKey == undefined}
                  onClick={() => {
                    if (registration == null) {
                      Notification.requestPermission().then((permission) => {
                        if (permission === "granted") {
                          navigator.serviceWorker
                            .register(NOTIFICATION_SERVICE_WORKER)
                            .then((workerRegistration) => {
                              setRegistration(workerRegistration);

                              if (workerRegistration.active) {
                                subscribeToNotifications(workerRegistration);
                              } else {
                                setTimeout(
                                  () =>
                                    subscribeToNotifications(
                                      workerRegistration,
                                    ),
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
                    className="w-full md:w-auto"
                    aria-label={t("notification.sendTestNotification")}
                    onClick={() => sendTestNotification("notification_test")}
                  >
                    {t("notification.sendTestNotification")}
                  </Button>
                )}
              </div>
            </SettingsGroupCard>

            {isAdmin && notificationCameras.length > 0 && (
              <SettingsGroupCard title={t("notification.globalSettings.title")}>
                <div className="space-y-4">
                  <div className="flex max-w-xl flex-col gap-2 text-sm text-primary-variant">
                    <p>{t("notification.globalSettings.desc")}</p>
                  </div>
                  <div className="w-full rounded-lg bg-secondary p-5 md:max-w-2xl">
                    <div className="grid gap-6">
                      {notificationCameras.map((item) => (
                        <CameraNotificationSwitch
                          key={item.name}
                          config={config}
                          camera={item.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </SettingsGroupCard>
            )}
          </div>
        </div>
      </div>
    </div>
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
