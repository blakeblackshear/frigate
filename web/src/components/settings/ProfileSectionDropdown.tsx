import { useTranslation } from "react-i18next";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProfileColor } from "@/utils/profileColors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type ProfileSectionDropdownProps = {
  allProfileNames: string[];
  profileFriendlyNames: Map<string, string>;
  editingProfile: string | null;
  hasProfileData: (profileName: string) => boolean;
  onSelectProfile: (profileName: string | null) => void;
};

export function ProfileSectionDropdown({
  allProfileNames,
  profileFriendlyNames,
  editingProfile,
  hasProfileData,
  onSelectProfile,
}: ProfileSectionDropdownProps) {
  const { t } = useTranslation(["views/settings"]);

  const activeColor = editingProfile
    ? getProfileColor(editingProfile, allProfileNames)
    : null;

  const editingFriendlyName = editingProfile
    ? (profileFriendlyNames.get(editingProfile) ?? editingProfile)
    : null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 font-normal">
          {editingProfile ? (
            <>
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  activeColor?.dot,
                )}
              />
              {editingFriendlyName}
            </>
          ) : (
            t("profiles.baseConfig", { ns: "views/settings" })
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <DropdownMenuItem onClick={() => onSelectProfile(null)}>
          <div className="flex w-full items-center gap-2">
            {editingProfile === null && (
              <Check className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className={editingProfile === null ? "" : "pl-[22px]"}>
              {t("profiles.baseConfig", { ns: "views/settings" })}
            </span>
          </div>
        </DropdownMenuItem>

        {allProfileNames.length > 0 && <DropdownMenuSeparator />}

        {allProfileNames.map((profile) => {
          const color = getProfileColor(profile, allProfileNames);
          const hasData = hasProfileData(profile);
          const isActive = editingProfile === profile;

          return (
            <DropdownMenuItem
              key={profile}
              className="group flex items-start justify-between gap-2"
              onClick={() => onSelectProfile(profile)}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex w-full flex-row items-center justify-start gap-2">
                  {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      color.dot,
                      !isActive && "ml-[22px]",
                    )}
                  />
                  <span>{profileFriendlyNames.get(profile) ?? profile}</span>
                </div>
                {!hasData && (
                  <span className="ml-[22px] text-xs text-muted-foreground">
                    {t("profiles.noOverrides", { ns: "views/settings" })}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
