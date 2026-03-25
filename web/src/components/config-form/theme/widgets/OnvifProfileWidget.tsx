import type { WidgetProps } from "@rjsf/utils";
import useSWR from "swr";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConfigFormContext } from "@/types/configForm";
import type { CameraPtzInfo } from "@/types/ptz";
import { getSizedFieldClassName } from "../utils";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { cn } from "@/lib/utils";

const AUTO_VALUE = "__auto__";

export function OnvifProfileWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange, schema, options } = props;
  const { t } = useTranslation(["views/settings"]);

  const formContext = props.registry?.formContext as
    | ConfigFormContext
    | undefined;
  const cameraName = formContext?.cameraName;
  const isCameraLevel = formContext?.level === "camera";
  const hasOnvifHost = !!formContext?.fullCameraConfig?.onvif?.host;

  const { data: ptzInfo } = useSWR<CameraPtzInfo>(
    isCameraLevel && cameraName && hasOnvifHost
      ? `${cameraName}/ptz/info`
      : null,
    {
      // ONVIF may not be initialized yet when the settings page loads,
      // so retry until profiles become available
      refreshInterval: (data) =>
        data?.profiles && data.profiles.length > 0 ? 0 : 5000,
    },
  );

  const profiles = ptzInfo?.profiles ?? [];
  const fieldClassName = getSizedFieldClassName(options, "md");
  const hasProfiles = profiles.length > 0;
  const waiting = isCameraLevel && !!cameraName && hasOnvifHost && !hasProfiles;

  const selected = value ?? AUTO_VALUE;

  if (waiting) {
    return (
      <div className={cn("flex items-center gap-2", fieldClassName)}>
        <ActivityIndicator className="size-4" />
        <span className="text-sm text-muted-foreground">
          {t("onvif.profileLoading")}
        </span>
      </div>
    );
  }

  return (
    <Select
      value={String(selected)}
      onValueChange={(val) => {
        onChange(val === AUTO_VALUE ? null : val);
      }}
      disabled={disabled || readonly}
    >
      <SelectTrigger id={id} className={cn("text-left", fieldClassName)}>
        <SelectValue placeholder={schema.title || "Select..."} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={AUTO_VALUE}>{t("onvif.profileAuto")}</SelectItem>
        {profiles.map((p) => (
          <SelectItem key={p.token} value={p.token}>
            {p.name !== p.token ? `${p.name} (${p.token})` : p.token}
          </SelectItem>
        ))}
        {!hasProfiles && value && value !== AUTO_VALUE && (
          <SelectItem value={String(value)}>{String(value)}</SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
