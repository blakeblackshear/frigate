import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LuSettings } from "react-icons/lu";
import useSWR from "swr";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { ConfigSectionTemplate } from "@/components/config-form/sections/ConfigSectionTemplate";
import { Button } from "@/components/ui/button";
import { PlatformAwareSheet } from "@/components/overlay/dialog/PlatformAwareDialog";
import { useConfigSchema } from "@/hooks/use-config-schema";
import type { FrigateConfig } from "@/types/frigateConfig";

type DebugReplayConfigSheetProps = {
  replayCamera: string | undefined;
};

export function DebugReplayConfigSheet({
  replayCamera,
}: DebugReplayConfigSheetProps) {
  const { t } = useTranslation(["views/replay"]);
  const configSchema = useConfigSchema();
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const [open, setOpen] = useState(false);

  return (
    <PlatformAwareSheet
      trigger={
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <LuSettings className="size-4" />
          <span className="hidden md:inline">{t("page.configuration")}</span>
        </Button>
      }
      title={t("page.configuration")}
      titleClassName="text-lg font-semibold"
      contentClassName="scrollbar-container flex flex-col gap-0 overflow-y-auto px-6 pb-6 sm:max-w-xl md:max-w-2xl xl:max-w-3xl"
      content={
        <>
          <p className="mb-5 text-sm text-muted-foreground">
            {t("page.configurationDesc")}
          </p>
          {configSchema == null ? (
            <div className="flex h-40 items-center justify-center">
              <ActivityIndicator />
            </div>
          ) : (
            <div className="space-y-6">
              <ConfigSectionTemplate
                sectionKey="detect"
                level="replay"
                cameraName={replayCamera}
                skipSave
                noStickyButtons
                requiresRestart={false}
                collapsible
                defaultCollapsed={false}
                showTitle
                showOverrideIndicator={false}
              />
              <ConfigSectionTemplate
                sectionKey="motion"
                level="replay"
                cameraName={replayCamera}
                skipSave
                noStickyButtons
                requiresRestart={false}
                collapsible
                defaultCollapsed={false}
                showTitle
                showOverrideIndicator={false}
              />
              <ConfigSectionTemplate
                sectionKey="objects"
                level="replay"
                cameraName={replayCamera}
                skipSave
                noStickyButtons
                requiresRestart={false}
                collapsible
                defaultCollapsed={false}
                showTitle
                showOverrideIndicator={false}
              />
              {config?.face_recognition?.enabled && (
                <ConfigSectionTemplate
                  sectionKey="face_recognition"
                  level="replay"
                  cameraName={replayCamera}
                  skipSave
                  noStickyButtons
                  requiresRestart={false}
                  collapsible
                  defaultCollapsed={false}
                  showTitle
                  showOverrideIndicator={false}
                />
              )}
              {config?.lpr?.enabled && (
                <ConfigSectionTemplate
                  sectionKey="lpr"
                  level="replay"
                  cameraName={replayCamera}
                  skipSave
                  noStickyButtons
                  requiresRestart={false}
                  collapsible
                  defaultCollapsed={false}
                  showTitle
                  showOverrideIndicator={false}
                />
              )}
            </div>
          )}
        </>
      }
      open={open}
      onOpenChange={setOpen}
    />
  );
}
