import useSWR from "swr";
import { useTranslation } from "react-i18next";

import { useProfileSectionDeltas } from "@/hooks/use-config-override";
import type { FrigateConfig } from "@/types/frigateConfig";
import { OverrideDeltaPopover } from "./OverrideDeltaPopover";

type Props = {
  sectionPath: string;
  cameraName: string;
  profileName: string;
  profileFriendlyName?: string;
  /** Border color class for profile-themed badge (e.g., "border-amber-500") */
  profileBorderColor?: string;
  className?: string;
};

export function ProfileOverridesBadge({
  sectionPath,
  cameraName,
  profileName,
  profileFriendlyName,
  profileBorderColor,
  className,
}: Props) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { t } = useTranslation(["views/settings"]);
  const deltas = useProfileSectionDeltas(
    config,
    cameraName,
    profileName,
    sectionPath,
  );

  const displayProfile = profileFriendlyName ?? profileName;

  return (
    <OverrideDeltaPopover
      sectionPath={sectionPath}
      deltas={deltas}
      badgeLabel={t("button.overriddenBaseConfig", {
        ns: "views/settings",
        defaultValue: "Overridden (Base Config)",
      })}
      ariaLabel={t("button.overriddenBaseConfigTooltip", {
        ns: "views/settings",
        profile: displayProfile,
      })}
      heading={t("button.overriddenBaseConfigHeading", {
        ns: "views/settings",
        profile: displayProfile,
        count: deltas.length,
      })}
      noDeltasMessage={t("button.overriddenBaseConfigNoDeltas", {
        ns: "views/settings",
        profile: displayProfile,
      })}
      borderColorClass={profileBorderColor}
      className={className}
    />
  );
}
