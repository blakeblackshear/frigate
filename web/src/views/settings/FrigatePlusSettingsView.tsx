import Heading from "@/components/ui/heading";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { Separator } from "../../components/ui/separator";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { CheckCircle2, XCircle } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { IoIosWarning } from "react-icons/io";
import { Link } from "react-router-dom";
import { LuExternalLink } from "react-icons/lu";

export default function FrigatePlusSettingsView() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { t } = useTranslation("views/settings");

  useEffect(() => {
    document.title = t("documentTitle.frigatePlus");
  }, [t]);

  const needCleanSnapshots = () => {
    if (!config) {
      return false;
    }
    return Object.values(config.cameras).some(
      (camera) => camera.snapshots.enabled && !camera.snapshots.clean_copy,
    );
  };

  return (
    <>
      <div className="flex size-full flex-col md:flex-row">
        <Toaster position="top-center" closeButton={true} />
        <div className="scrollbar-container order-last mb-10 mt-2 flex h-full w-full flex-col overflow-y-auto rounded-lg border-[1px] border-secondary-foreground bg-background_alt p-2 md:order-none md:mb-0 md:mr-2 md:mt-0">
          <Heading as="h3" className="my-2">
            {t("frigatePlus.title")}
          </Heading>

          <Separator className="my-2 flex bg-secondary" />

          <Heading as="h4" className="my-2">
            {t("frigatePlus.apiKey.title")}
          </Heading>

          <div className="mt-2 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {config?.plus?.enabled ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <Label>
                  {config?.plus?.enabled
                    ? t("frigatePlus.apiKey.validated")
                    : t("frigatePlus.apiKey.notValidated")}
                </Label>
              </div>
              <div className="my-2 max-w-5xl text-sm text-muted-foreground">
                <p>{t("frigatePlus.apiKey.desc")}</p>
                {!config?.model.plus && (
                  <>
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
                  </>
                )}
              </div>
            </div>

            {config?.model.plus && (
              <>
                <Separator className="my-2 flex bg-secondary" />
                <div className="mt-2 max-w-2xl">
                  <Heading as="h4" className="my-2">
                    {t("frigatePlus.modelInfo.title")}
                  </Heading>
                  <div className="mt-2 space-y-3">
                    {!config?.model?.plus && (
                      <p className="text-muted-foreground">
                        {t("frigatePlus.modelInfo.loading")}
                      </p>
                    )}
                    {config?.model?.plus === null && (
                      <p className="text-danger">
                        {t("frigatePlus.modelInfo.error")}
                      </p>
                    )}
                    {config?.model?.plus && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">
                            {t("frigatePlus.modelInfo.modelType")}
                          </Label>
                          <p>{config.model.plus.name}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">
                            {t("frigatePlus.modelInfo.trainDate")}
                          </Label>
                          <p>
                            {new Date(
                              config.model.plus.trainDate,
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">
                            {t("frigatePlus.modelInfo.modelId")}
                          </Label>
                          <p>{config.model.plus.id}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">
                            {t("frigatePlus.modelInfo.baseModel")}
                          </Label>
                          <p>{config.model.plus.baseModel}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">
                            {t("frigatePlus.modelInfo.supportedDetectors")}
                          </Label>
                          <p>
                            {config.model.plus.supportedDetectors.join(", ")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator className="my-2 flex bg-secondary" />

            <div className="mt-2 max-w-5xl">
              <Heading as="h4" className="my-2">
                {t("frigatePlus.snapshotConfig.title")}
              </Heading>
              <div className="mt-2 space-y-3">
                <div className="my-2 text-sm text-muted-foreground">
                  <p>
                    <Trans ns="views/settings">
                      frigatePlus.snapshotConfig.desc
                    </Trans>
                  </p>
                  <div className="mt-2 flex items-center text-primary-variant">
                    <Link
                      to="https://docs.frigate.video/configuration/plus/faq"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline"
                    >
                      {t("frigatePlus.snapshotConfig.documentation")}
                      <LuExternalLink className="ml-2 inline-flex size-3" />
                    </Link>
                  </div>
                </div>
                {config && (
                  <div className="overflow-x-auto">
                    <table className="max-w-2xl text-sm">
                      <thead>
                        <tr className="border-b border-secondary">
                          <th className="px-4 py-2 text-left">
                            {t("frigatePlus.snapshotConfig.table.camera")}
                          </th>
                          <th className="px-4 py-2 text-center">
                            {t("frigatePlus.snapshotConfig.table.snapshots")}
                          </th>
                          <th className="px-4 py-2 text-center">
                            <Trans ns="views/settings">
                              frigatePlus.snapshotConfig.table.cleanCopySnapshots
                            </Trans>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(config.cameras).map(
                          ([name, camera]) => (
                            <tr
                              key={name}
                              className="border-b border-secondary"
                            >
                              <td className="px-4 py-2">{name}</td>
                              <td className="px-4 py-2 text-center">
                                {camera.snapshots.enabled ? (
                                  <CheckCircle2 className="mx-auto size-5 text-green-500" />
                                ) : (
                                  <XCircle className="mx-auto size-5 text-danger" />
                                )}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {camera.snapshots?.enabled &&
                                camera.snapshots?.clean_copy ? (
                                  <CheckCircle2 className="mx-auto size-5 text-green-500" />
                                ) : (
                                  <XCircle className="mx-auto size-5 text-danger" />
                                )}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                {needCleanSnapshots() && (
                  <div className="mt-2 max-w-xl rounded-lg border border-secondary-foreground bg-secondary p-4 text-sm text-danger">
                    <div className="flex items-center gap-2">
                      <IoIosWarning className="mr-2 size-5 text-danger" />
                      <div className="max-w-[85%] text-sm">
                        <Trans ns="views/settings">
                          frigatePlus.snapshotConfig.cleanCopyWarning
                        </Trans>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
