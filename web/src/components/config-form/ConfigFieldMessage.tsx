import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LuInfo, LuTriangleAlert, LuCircleAlert } from "react-icons/lu";
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
      return <LuInfo className="size-4" />;
    case "warning":
      return <LuTriangleAlert className="size-4" />;
    case "error":
      return <LuCircleAlert className="size-4" />;
    default:
      return <LuInfo className="size-4" />;
  }
}

type ConfigFieldMessageProps = {
  messageKey: string;
  severity: string;
};

export function ConfigFieldMessage({
  messageKey,
  severity,
}: ConfigFieldMessageProps) {
  const { t } = useTranslation("views/settings");

  return (
    <Alert
      variant={severityVariantMap[severity as MessageSeverity] ?? "info"}
      className="flex items-center [&>svg+div]:translate-y-0 [&>svg]:static [&>svg~*]:pl-2"
    >
      <SeverityIcon severity={severity} />
      <AlertDescription>{t(messageKey)}</AlertDescription>
    </Alert>
  );
}
