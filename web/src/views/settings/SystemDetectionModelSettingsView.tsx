import ActivityIndicator from "@/components/indicators/activity-indicator";
import Heading from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";
import type { FrigateConfig } from "@/types/frigateConfig";
import {
  SettingsGroupCard,
  SplitCardRow,
} from "@/components/card/SettingsGroupCard";
import {
  SingleSectionPage,
  type SettingsPageProps,
} from "@/views/settings/SingleSectionPage";
import FrigatePlusCurrentModelSummary from "@/views/settings/components/FrigatePlusCurrentModelSummary";
import { useTranslation } from "react-i18next";

export default function SystemDetectionModelSettingsView(
  props: SettingsPageProps,
) {
  const { t } = useTranslation(["config/global", "views/settings"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const [showModelForm, setShowModelForm] = useState(false);
  const navigate = useNavigate();

  if (!config) {
    return <ActivityIndicator />;
  }

  const isPlusModelActive = Boolean(config?.model?.plus?.id);

  if (!isPlusModelActive || showModelForm) {
    return <SingleSectionPage sectionKey="model" level="global" {...props} />;
  }

  return (
    <div className="flex size-full max-w-5xl flex-col lg:pr-2">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <Heading as="h4">{t("model.label", { ns: "config/global" })}</Heading>
          <div className="my-1 text-sm text-muted-foreground">
            {t("model.description", { ns: "config/global" })}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <SettingsGroupCard
          title={t("detectionModel.plusActive.title", { ns: "views/settings" })}
        >
          <SplitCardRow
            label={t("detectionModel.plusActive.label", {
              ns: "views/settings",
            })}
            description={t("detectionModel.plusActive.description", {
              ns: "views/settings",
            })}
            content={
              <div className="flex flex-col items-start gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate("/settings?page=frigateplus")}
                >
                  {t("detectionModel.plusActive.goToFrigatePlus", {
                    ns: "views/settings",
                  })}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModelForm(true)}
                >
                  {t("detectionModel.plusActive.showModelForm", {
                    ns: "views/settings",
                  })}
                </Button>
              </div>
            }
          />
        </SettingsGroupCard>

        <FrigatePlusCurrentModelSummary plusModel={config.model.plus} />
      </div>
    </div>
  );
}
