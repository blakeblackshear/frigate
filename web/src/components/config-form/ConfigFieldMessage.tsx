import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LuInfo,
  LuTriangleAlert,
  LuCircleAlert,
  LuExternalLink,
} from "react-icons/lu";
import { useDocDomain } from "@/hooks/use-doc-domain";
import type { MessageSeverity } from "./section-configs/types";

const severityVariantMap: Record<
  MessageSeverity,
  "info" | "warning" | "destructive"
> = {
  info: "info",
  warning: "warning",
  error: "destructive",
};

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "info":
      return <LuInfo className="size-4 shrink-0" />;
    case "warning":
      return <LuTriangleAlert className="size-4 shrink-0" />;
    case "error":
      return <LuCircleAlert className="size-4 shrink-0" />;
    default:
      return <LuInfo className="size-4 shrink-0" />;
  }
}

type ConfigFieldMessageProps = {
  messageKey: string;
  severity: string;
  values?: Record<string, unknown>;
  docLink?: string;
};

export function ConfigFieldMessage({
  messageKey,
  severity,
  values,
  docLink,
}: ConfigFieldMessageProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const { getLocaleDocUrl } = useDocDomain();

  return (
    <Alert
      variant={severityVariantMap[severity as MessageSeverity] ?? "info"}
      className="flex items-center [&>svg+div]:translate-y-0 [&>svg]:static [&>svg~*]:pl-2"
    >
      <SeverityIcon severity={severity} />
      <AlertDescription>
        <div className="flex flex-col gap-1">
          <span>{t(messageKey, values)}</span>
          {docLink && (
            <Link
              to={getLocaleDocUrl(docLink)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center underline"
            >
              {t("readTheDocumentation", { ns: "common" })}
              <LuExternalLink className="ml-2 inline-flex size-3" />
            </Link>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
