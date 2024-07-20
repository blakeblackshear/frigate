import { Button } from "@/components/ui/button";
import Heading from "@/components/ui/heading";
import { Toaster } from "@/components/ui/sonner";
import { FrigateConfig } from "@/types/frigateConfig";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";

const NOTIFICATION_SERVICE_WORKER = "notifications-worker.ts";

export default function NotificationView() {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  // notification key handling

  const { data: publicKey } = useSWR(
    config?.notifications?.enabled ? "notifications/pubkey" : null,
    { revalidateOnFocus: false },
  );

  const subscribeToNotifications = useCallback(
    (registration: ServiceWorkerRegistration) => {
      if (registration) {
        registration.pushManager
          .subscribe({
            userVisibleOnly: true,
            applicationServerKey: publicKey,
          })
          .then((pushSubscription) => {
            axios.post("notifications/register", {
              sub: pushSubscription,
            });
          });
      }
    },
    [publicKey],
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

  return (
    <>
      <div className="flex size-full flex-col md:flex-row">
        <Toaster position="top-center" closeButton={true} />
        <div className="scrollbar-container order-last mb-10 mt-2 flex h-full w-full flex-col overflow-y-auto rounded-lg border-[1px] border-secondary-foreground bg-background_alt p-2 md:order-none md:mb-0 md:mr-2 md:mt-0">
          <Heading as="h3" className="my-2">
            Notification Settings
          </Heading>

          {config?.notifications.enabled && (
            <div className="mt-2 space-y-6">
              <div className="space-y-3">
                {
                  // TODO need to register the worker before enabling the notifications button
                  // TODO make the notifications button show enable / disable depending on current state
                }
                <Button
                  disabled={publicKey == undefined}
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
                      registration.unregister();
                      setRegistration(null);
                    }
                  }}
                >
                  {`${registration != null ? "Unregister" : "Register"} for Notifications`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
