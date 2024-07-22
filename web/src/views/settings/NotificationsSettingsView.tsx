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
import { Switch } from "@/components/ui/switch";
import { StatusBarMessagesContext } from "@/context/statusbar-provider";
import { FrigateConfig } from "@/types/frigateConfig";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useCallback, useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { LuExternalLink } from "react-icons/lu";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import useSWR from "swr";
import { z } from "zod";

const NOTIFICATION_SERVICE_WORKER = "notifications-worker.js";

type NotificationSettingsValueType = {
  enabled: boolean;
  email?: string;
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

  // status bar

  const { addMessage, removeMessage } = useContext(StatusBarMessagesContext)!;

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
              "Successfully registered for notifications. Restart to start receiving notifications.",
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
    enabled: z.boolean(),
    email: z.string(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      enabled: config?.notifications.enabled,
      email: config?.notifications.email,
    },
  });

  const onCancel = useCallback(() => {
    if (!config) {
      return;
    }

    setUnsavedChanges(false);
    form.reset({
      enabled: config.notifications.enabled,
      email: config.notifications.email || "",
    });
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, removeMessage, setUnsavedChanges]);

  const saveToConfig = useCallback(
    async (
      { enabled, email }: NotificationSettingsValueType, // values submitted via the form
    ) => {
      axios
        .put(
          `config/set?notifications.enabled=${enabled}&notifications.email=${email}`,
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
    [updateConfig, setIsLoading],
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
          <Heading as="h3" className="my-2">
            Notification Settings
          </Heading>

          <div className="max-w-6xl">
            <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 text-sm text-primary-variant">
              <p>
                Frigate can natively send push notifications to your device when
                it is running in the browser or installed as a PWA.
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
                name="enabled"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex flex-row items-center justify-start gap-2">
                        <Label className="cursor-pointer" htmlFor="auto-live">
                          Notifications
                        </Label>
                        <Switch
                          id="auto-live"
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            return field.onChange(checked);
                          }}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        className="w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark] md:w-72"
                        placeholder="example@email.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Entering a valid email is required, as this is used by the
                      push server in case problems occur.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex w-full flex-row items-center gap-2 pt-2 md:w-[25%]">
                <Button
                  className="flex flex-1"
                  onClick={onCancel}
                  type="button"
                >
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

          <div className="mt-4 space-y-6">
            <div className="space-y-3">
              <Separator className="my-2 flex bg-secondary" />
              <Button
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
                                () => subscribeToNotifications(registration),
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
                        removeMessage("notification_settings", "registration");
                      });
                  }
                }}
              >
                {`${registration != null ? "Unregister" : "Register"} for notifications on this device`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
