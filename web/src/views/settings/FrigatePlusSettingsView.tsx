import { useCallback, useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import useSWR from "swr";
import axios from "axios";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { LuExternalLink } from "react-icons/lu";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { Button } from "@/components/ui/button";
import Heading from "@/components/ui/heading";
import {
  SettingsGroupCard,
  SplitCardRow,
} from "@/components/card/SettingsGroupCard";
import FrigatePlusCurrentModelSummary from "@/views/settings/components/FrigatePlusCurrentModelSummary";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";
import { FrigateConfig } from "@/types/frigateConfig";
import { isReplayCamera } from "@/utils/cameraUtil";
import type { SettingsPageProps } from "@/views/settings/SingleSectionPage";
import { getPrimaryModel } from "@/utils/modelUtil";
import { useIsAdmin } from "@/hooks/use-is-admin";

type PlusKeyStatus = "valid" | "invalid" | "unreachable" | "not_set";

type PlusValidateResponse = { success: boolean; status: PlusKeyStatus };

export default function FrigatePlusSettingsView(_props: SettingsPageProps) {
  const { t } = useTranslation("views/settings");
  const { getLocaleDocUrl } = useDocDomain();
  const { data: config } = useSWR<FrigateConfig>("config");
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();

  const [isValidating, setIsValidating] = useState(false);
  const [keyStatus, setKeyStatus] = useState<PlusKeyStatus>();

  const validateKey = useCallback(async () => {
    setIsValidating(true);

    try {
      const response = await axios.post<PlusValidateResponse>("plus/validate");
      setKeyStatus(response.data.status);
    } catch {
      setKeyStatus("unreachable");
    } finally {
      setIsValidating(false);
    }
  }, []);

  useEffect(() => {
    document.title = t("documentTitle.frigatePlus");
  }, [t]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex size-full flex-col md:pr-2">
      <div className="w-full max-w-5xl space-y-6 pt-2">
        <div className="flex flex-col gap-0">
          <Heading as="h4" className="mb-2">
            {t("frigatePlus.title")}
          </Heading>
          <p className="text-sm text-muted-foreground">
            {t("frigatePlus.description")}
          </p>
        </div>

        <div className="space-y-6">
          <SettingsGroupCard title={t("frigatePlus.cardTitles.api")}>
            <SplitCardRow
              label={t("frigatePlus.apiKey.title")}
              description={
                <>
                  <p>{t("frigatePlus.apiKey.desc")}</p>
                  {!getPrimaryModel(config)?.plus && (
                    <div className="mt-2 flex items-center text-primary-variant">
                      <Link
                        to="https://frigate.video/plus"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline"
                      >
                        {t("frigatePlus.apiKey.plusLink")}
                        <LuExternalLink className="ml-2 inline-flex size-3" />
                      </Link>
                    </div>
                  )}
                </>
              }
              content={
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    {config?.plus?.enabled ? (
                      <CheckCircle2 className="size-5 shrink-0 text-green-500" />
                    ) : (
                      <XCircle className="size-5 shrink-0 text-red-500" />
                    )}
                    <span className="text-sm">
                      {config?.plus?.enabled
                        ? t("frigatePlus.apiKey.formatValid")
                        : t("frigatePlus.apiKey.formatInvalid")}
                    </span>
                  </div>
                  {config?.plus?.enabled && isAdmin && (
                    <div className="flex flex-col items-start gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isValidating}
                        onClick={validateKey}
                        aria-label={t("frigatePlus.apiKey.validate")}
                      >
                        {isValidating && (
                          <ActivityIndicator className="mr-2" size={16} />
                        )}
                        {isValidating
                          ? t("frigatePlus.apiKey.validating")
                          : t("frigatePlus.apiKey.validate")}
                      </Button>
                      {keyStatus && !isValidating && (
                        <div className="flex items-center gap-2">
                          {keyStatus === "valid" ? (
                            <CheckCircle2 className="size-5 shrink-0 text-green-500" />
                          ) : keyStatus === "unreachable" ? (
                            <AlertTriangle className="size-5 shrink-0 text-yellow-500" />
                          ) : (
                            <XCircle className="size-5 shrink-0 text-red-500" />
                          )}
                          <span className="text-sm">
                            {keyStatus === "valid"
                              ? t("frigatePlus.apiKey.serverValid")
                              : keyStatus === "unreachable"
                                ? t("frigatePlus.apiKey.serverUnreachable")
                                : t("frigatePlus.apiKey.serverInvalid")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              }
            />
          </SettingsGroupCard>

          {config?.plus?.enabled && (
            <FrigatePlusCurrentModelSummary
              plusModel={getPrimaryModel(config)?.plus}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigate("/settings?page=systemDetectorsAndModel")
                  }
                >
                  {t("frigatePlus.changeInDetectorsAndModel")}
                </Button>
              }
            />
          )}

          <SettingsGroupCard title={t("frigatePlus.cardTitles.configuration")}>
            <SplitCardRow
              label={t("frigatePlus.snapshotConfig.title")}
              description={
                <>
                  <p>
                    <Trans ns="views/settings">
                      frigatePlus.snapshotConfig.desc
                    </Trans>
                  </p>
                  <div className="mt-2 flex items-center text-primary-variant">
                    <Link
                      to={getLocaleDocUrl("plus/faq")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline"
                    >
                      {t("readTheDocumentation", { ns: "common" })}
                      <LuExternalLink className="ml-2 inline-flex size-3" />
                    </Link>
                  </div>
                </>
              }
              content={
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-secondary">
                          <th className="px-4 py-2 text-left">
                            {t("frigatePlus.snapshotConfig.table.camera")}
                          </th>
                          <th className="px-4 py-2 text-center">
                            {t("frigatePlus.snapshotConfig.table.snapshots")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(config.cameras)
                          .filter(([name]) => !isReplayCamera(name))
                          .sort(([, a], [, b]) => a.ui.order - b.ui.order)
                          .map(([name, camera]) => (
                            <tr
                              key={name}
                              className="border-b border-secondary"
                            >
                              <td className="px-4 py-2">
                                <CameraNameLabel camera={name} />
                              </td>
                              <td className="px-4 py-2 text-center">
                                {camera.snapshots.enabled ? (
                                  <CheckCircle2 className="mx-auto size-5 text-green-500" />
                                ) : (
                                  <XCircle className="mx-auto size-5 text-danger" />
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              }
            />
          </SettingsGroupCard>
        </div>
      </div>
    </div>
  );
}
