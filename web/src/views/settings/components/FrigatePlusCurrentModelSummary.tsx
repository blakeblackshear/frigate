import {
  SettingsGroupCard,
  SplitCardRow,
} from "@/components/card/SettingsGroupCard";
import type { FrigateConfig } from "@/types/frigateConfig";
import { useTranslation } from "react-i18next";

type FrigatePlusCurrentModelSummaryProps = {
  plusModel: FrigateConfig["model"]["plus"];
};

export default function FrigatePlusCurrentModelSummary({
  plusModel,
}: FrigatePlusCurrentModelSummaryProps) {
  const { t } = useTranslation("views/settings");

  return (
    <SettingsGroupCard title={t("frigatePlus.cardTitles.currentModel")}>
      {plusModel === undefined && (
        <p className="text-muted-foreground">
          {t("frigatePlus.modelInfo.loading")}
        </p>
      )}
      {plusModel === null && (
        <p className="text-danger">{t("frigatePlus.modelInfo.error")}</p>
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
