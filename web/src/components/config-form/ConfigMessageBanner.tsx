import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LuInfo, LuTriangleAlert, LuCircleAlert } from "react-icons/lu";
import type {
  ConditionalMessage,
  MessageSeverity,
} from "./section-configs/types";

const severityVariantMap: Record<
  MessageSeverity,
  "info" | "warning" | "destructive"
> = {
  info: "info",
  warning: "warning",
  error: "destructive",
};

function SeverityIcon({ severity }: { severity: MessageSeverity }) {
  switch (severity) {
    case "info":
      return <LuInfo className="size-4" />;
    case "warning":
      return <LuTriangleAlert className="size-4" />;
    case "error":
      return <LuCircleAlert className="size-4" />;
  }
}

type ConfigMessageBannerProps = {
  messages: ConditionalMessage[];
};

export function ConfigMessageBanner({ messages }: ConfigMessageBannerProps) {
  const { t } = useTranslation("views/settings");

  if (messages.length === 0) return null;

  return (
    <div className="max-w-5xl space-y-2">
      {messages.map((msg) => (
        <Alert
          key={msg.key}
          variant={severityVariantMap[msg.severity]}
          className="flex items-center [&>svg+div]:translate-y-0 [&>svg]:static [&>svg~*]:pl-2"
        >
          <SeverityIcon severity={msg.severity} />
          <AlertDescription>{t(msg.messageKey)}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
