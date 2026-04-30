import { RecordingPlaybackPreference } from "@/types/record";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

type RecordingPlaybackPreferenceSelectProps = {
  className?: string;
  onValueChange: (value: RecordingPlaybackPreference) => void;
  value: RecordingPlaybackPreference;
};

export default function RecordingPlaybackPreferenceSelect({
  className,
  onValueChange,
  value,
}: RecordingPlaybackPreferenceSelectProps) {
  const { t } = useTranslation(["components/player"]);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="auto">{t("playbackPreference.auto")}</SelectItem>
        <SelectItem value="main">{t("playbackPreference.main")}</SelectItem>
        <SelectItem value="sub">{t("playbackPreference.sub")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
