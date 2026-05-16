import { ReactNode } from "react";
import {
  SettingsGroupCard,
  SplitCardRow,
} from "@/components/card/SettingsGroupCard";
import type { FrigateConfig } from "@/types/frigateConfig";
import { useTranslation } from "react-i18next";

type FrigatePlusCurrentModelSummaryProps = {
  plusModel: FrigateConfig["model"]["plus"];
  action?: ReactNode;
};

export default function FrigatePlusCurrentModelSummary({
  plusModel,
  action,
}: FrigatePlusCurrentModelSummaryProps) {
  const { t } = useTranslation("views/settings");

  const title = action ? (
    <div className="flex items-center justify-between gap-3">
      <span>{t("frigatePlus.cardTitles.currentModel")}</span>
      {action}
    </div>
  ) : (
    t("frigatePlus.cardTitles.currentModel")
  );

  return (
    <SettingsGroupCard title={title}>
      {!plusModel && (
        <p className="text-muted-foreground">
          {t("frigatePlus.modelInfo.noModelLoaded")}
        </p>
      )}
      {plusModel && (
        <div className="space-y-6">
          <SplitCardRow
            label={t("frigatePlus.modelInfo.baseModel")}
            content={
              <p>
                {plusModel.baseModel} (
                {plusModel.isBaseModel
                  ? t("frigatePlus.modelInfo.plusModelType.baseModel")
                  : t("frigatePlus.modelInfo.plusModelType.userModel")}
                )
              </p>
            }
          />
          <SplitCardRow
            label={t("frigatePlus.modelInfo.trainDate")}
            content={<p>{new Date(plusModel.trainDate).toLocaleString()}</p>}
          />
          <SplitCardRow
            label={t("frigatePlus.modelInfo.modelType")}
            content={
              <p>
                {plusModel.name} ({plusModel.width + "x" + plusModel.height})
              </p>
            }
          />
          <SplitCardRow
            label={t("frigatePlus.modelInfo.supportedDetectors")}
            content={<p>{plusModel.supportedDetectors.join(", ")}</p>}
          />
        </div>
      )}
    </SettingsGroupCard>
  );
}
