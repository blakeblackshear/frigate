import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LuExternalLink } from "react-icons/lu";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { StatusBarMessagesContext } from "@/context/statusbar-provider";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import Heading from "@/components/ui/heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import type { FrigateConfig } from "@/types/frigateConfig";
import type { SettingsPageProps } from "@/views/settings/SingleSectionPage";
import type { ConfigSectionData } from "@/types/configForm";

type ModelTab = "plus" | "custom";

type PageState = {
  detectors: ConfigSectionData;
  modelTab: ModelTab;
  plusModelId: string | undefined;
  customModel: ConfigSectionData;
};

const STATUS_BAR_KEY = "detectors_and_model";

const deriveInitialState = (config: FrigateConfig): PageState => {
  const modelPath = config.model?.path;
  const plusEnabled = Boolean(config.plus?.enabled);
  let modelTab: ModelTab;
  if (typeof modelPath === "string" && modelPath.startsWith("plus://")) {
    modelTab = "plus";
  } else if (typeof modelPath === "string" && modelPath.length > 0) {
    modelTab = "custom";
  } else if (plusEnabled) {
    modelTab = "plus";
  } else {
    modelTab = "custom";
  }

  const plusModelId = config.model?.plus?.id;
  const { plus: _plus, ...modelWithoutPlus } = (config.model ?? {}) as Record<
    string,
    unknown
  >;

  return {
    detectors: (config.detectors ?? {}) as ConfigSectionData,
    modelTab,
    plusModelId: plusModelId ?? undefined,
    customModel: modelWithoutPlus as ConfigSectionData,
  };
};

export default function DetectorsAndModelSettingsView(
  _props: SettingsPageProps,
) {
  const { t } = useTranslation(["views/settings", "common"]);
  const { getLocaleDocUrl } = useDocDomain();
  const { data: config } = useSWR<FrigateConfig>("config");
  const { addMessage, removeMessage } = useContext(StatusBarMessagesContext)!;

  const [snapshot, setSnapshot] = useState<PageState | null>(null);
  const [state, setState] = useState<PageState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!config || snapshot !== null) return;
    const initial = deriveInitialState(config);
    setSnapshot(initial);
    setState(initial);
  }, [config, snapshot]);

  const isDirty = useMemo(() => {
    if (!state || !snapshot) return false;
    return JSON.stringify(state) !== JSON.stringify(snapshot);
  }, [state, snapshot]);

  useEffect(() => {
    if (isDirty) {
      addMessage(
        STATUS_BAR_KEY,
        t("detectorsAndModel.unsavedChanges"),
        undefined,
        STATUS_BAR_KEY,
      );
    } else {
      removeMessage(STATUS_BAR_KEY, STATUS_BAR_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  useEffect(() => {
    document.title = `${t("detectorsAndModel.title")} - Frigate`;
  }, [t]);

  const onSave = useCallback(async () => {
    // implemented in Task 9
    setIsSaving(true);
    setIsSaving(false);
  }, []);

  const onUndo = useCallback(() => {
    if (snapshot) setState(snapshot);
  }, [snapshot]);

  if (!config || !state) {
    return <ActivityIndicator />;
  }

  const saveDisabled = !isDirty || isSaving;

  return (
    <div className="flex size-full flex-col md:pr-2">
      <Toaster position="top-center" closeButton={true} />
      <div className="w-full max-w-5xl space-y-6 pt-2">
        <div className="mb-1 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <Heading as="h4">{t("detectorsAndModel.title")}</Heading>
            <div className="my-1 text-sm text-muted-foreground">
              {t("detectorsAndModel.description")}
            </div>
            <div className="flex items-center text-sm text-primary-variant">
              <Link
                to={getLocaleDocUrl("/configuration/object_detectors")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline"
              >
                {t("readTheDocumentation", { ns: "common" })}
                <LuExternalLink className="ml-2 inline-flex size-3" />
              </Link>
            </div>
          </div>
          {isDirty && (
            <Badge
              variant="secondary"
              className="cursor-default bg-unsaved text-xs text-black hover:bg-unsaved"
            >
              {t("button.modified", { ns: "common", defaultValue: "Modified" })}
            </Badge>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
            {t("detectorsAndModel.cardTitles.detector")} — placeholder, filled
            in Task 5.
          </div>
          <div className="rounded-lg border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
            {t("detectorsAndModel.cardTitles.model")} — placeholder, filled in
            Tasks 6–8.
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-50 mt-6 w-full border-t border-secondary bg-background pt-0">
        <div
          className={cn(
            "flex flex-col items-center gap-4 pt-2 md:flex-row",
            isDirty ? "justify-between" : "justify-end",
          )}
        >
          {isDirty && (
            <span className="text-sm text-unsaved">
              {t("unsavedChanges", { ns: "views/settings" })}
            </span>
          )}
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
            {isDirty && (
              <Button
                onClick={onUndo}
                variant="outline"
                disabled={isSaving}
                className="flex min-w-36 flex-1 gap-2"
              >
                {t("button.undo", { ns: "common" })}
              </Button>
            )}
            <Button
              onClick={onSave}
              variant="select"
              disabled={saveDisabled}
              className="flex min-w-36 flex-1 gap-2"
            >
              {isSaving ? (
                <>
                  <ActivityIndicator className="h-4 w-4" />
                  {t("button.saving", { ns: "common" })}
                </>
              ) : (
                t("button.save", { ns: "common" })
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
