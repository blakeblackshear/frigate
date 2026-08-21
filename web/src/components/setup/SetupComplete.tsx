import Logo from "@/components/Logo";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import axios from "axios";
import { FaCircleCheck } from "react-icons/fa6";

type ConfiguredItem = {
  key: string;
  label: string;
  value: string | null;
};

type SetupCompleteProps = {
  cameraNames: string[];
  configuredSteps: {
    camera: boolean;
    hwaccel: boolean;
    detector: boolean;
    recording: boolean;
  };
  restartRequired: boolean;
  onBack: () => void;
};

export default function SetupComplete({
  cameraNames,
  configuredSteps,
  restartRequired,
  onBack,
}: SetupCompleteProps) {
  const { t } = useTranslation(["views/setup"]);
  const [restarting, setRestarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cameraItems: ConfiguredItem[] =
    configuredSteps.camera && cameraNames.length > 0
      ? cameraNames.map((name) => ({
          key: `camera-${name}`,
          label: t("setupWizard.complete.camera"),
          value: name,
        }))
      : [
          {
            key: "camera",
            label: t("setupWizard.complete.camera"),
            value: null,
          },
        ];

  const items: ConfiguredItem[] = [
    ...cameraItems,
    {
      key: "hwaccel",
      label: t("setupWizard.complete.hwaccel"),
      value: configuredSteps.hwaccel
        ? t("setupWizard.complete.configured")
        : null,
    },
    {
      key: "detector",
      label: t("setupWizard.complete.detector"),
      value: configuredSteps.detector
        ? t("setupWizard.complete.configured")
        : null,
    },
    {
      key: "recording",
      label: t("setupWizard.complete.recording"),
      value: configuredSteps.recording
        ? t("setupWizard.complete.configured")
        : null,
    },
  ];

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  const handleFinish = useCallback(async () => {
    setFinishing(true);
    try {
      await axios.put("config/set", {
        config_data: {
          onboarding: { setup_complete: true },
        },
        requires_restart: 0,
      });

      // camera adds were applied live, so nothing is waiting on a restart
      if (!restartRequired) {
        window.location.href = window.baseUrl || "/";
        return;
      }

      setRestarting(true);

      await axios.post("restart");

      let retries = 0;
      const maxRetries = 60; // 2 minutes max
      pollRef.current = setInterval(async () => {
        retries++;
        if (retries > maxRetries) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
          }
          window.location.href = window.baseUrl || "/";
          return;
        }
        try {
          const resp = await axios.get("version", { timeout: 2000 });
          if (resp.status === 200) {
            if (pollRef.current) {
              clearInterval(pollRef.current);
            }
            window.location.href = window.baseUrl || "/";
          }
        } catch {
          // not back yet
        }
      }, 2000);
    } catch {
      setRestarting(false);
      setFinishing(false);
      toast.error(t("setupWizard.errors.saveFailed"));
    }
  }, [restartRequired, t]);

  if (restarting) {
    return (
      <div className="flex flex-col items-center gap-6 py-12">
        <Logo className="h-12 w-12" />
        <ActivityIndicator />
        <div className="text-center">
          <p className="font-semibold">
            {t("setupWizard.complete.restarting")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("setupWizard.complete.restartingDescription")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <div>
        <h2 className="text-xl font-semibold">
          {t("setupWizard.complete.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("setupWizard.complete.description")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <span className="text-sm font-medium">{item.label}</span>
            <div className="flex items-center gap-2">
              {item.value && <FaCircleCheck className="size-4 text-success" />}
              <span
                className={`text-sm ${item.value ? "" : "text-muted-foreground"}`}
              >
                {item.value ?? t("setupWizard.complete.notConfigured")}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {t("setupWizard.complete.nextSteps")}
      </p>

      {restartRequired && (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          {t("setupWizard.complete.restartNotice")}
        </p>
      )}

      <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:justify-end sm:gap-4">
        <Button type="button" onClick={onBack}>
          {t("setupWizard.actions.back")}
        </Button>
        <div className="flex flex-1 justify-end">
          <Button
            type="button"
            variant="select"
            onClick={handleFinish}
            disabled={finishing}
          >
            {restartRequired
              ? t("setupWizard.complete.applyAndRestart")
              : t("setupWizard.complete.goToLiveView")}
          </Button>
        </div>
      </div>
    </div>
  );
}
