import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import axios from "axios";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import type { FrigateConfig } from "@/types/frigateConfig";
import type { ProfileState } from "@/types/profile";
import { getProfileColor } from "@/utils/profileColors";
import { PROFILE_ELIGIBLE_SECTIONS } from "@/utils/configUtil";
import { cn } from "@/lib/utils";
import Heading from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ProfilesApiResponse = {
  profiles: string[];
  active_profile: string | null;
};

type ProfilesViewProps = {
  setUnsavedChanges?: React.Dispatch<React.SetStateAction<boolean>>;
  profileState?: ProfileState;
};

export default function ProfilesView({ profileState }: ProfilesViewProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");
  const { data: profilesData, mutate: updateProfiles } =
    useSWR<ProfilesApiResponse>("profiles");

  const [activating, setActivating] = useState(false);
  const [deleteProfile, setDeleteProfile] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.title = t("documentTitle.profiles", {
      ns: "views/settings",
    });
  }, [t]);

  const allProfileNames = useMemo(
    () => profileState?.allProfileNames ?? [],
    [profileState?.allProfileNames],
  );
  const activeProfile = profilesData?.active_profile ?? null;

  // Build overview data: for each profile, which cameras have which sections
  const profileOverviewData = useMemo(() => {
    if (!config || allProfileNames.length === 0) return {};

    const data: Record<string, Record<string, string[]>> = {};
    const cameras = Object.keys(config.cameras).sort();

    for (const profile of allProfileNames) {
      data[profile] = {};
      for (const camera of cameras) {
        const profileData = config.cameras[camera]?.profiles?.[profile];
        if (!profileData) continue;

        const sections: string[] = [];
        for (const section of PROFILE_ELIGIBLE_SECTIONS) {
          if (
            profileData[section as keyof typeof profileData] !== undefined &&
            profileData[section as keyof typeof profileData] !== null
          ) {
            sections.push(section);
          }
        }
        if (profileData.enabled !== undefined && profileData.enabled !== null) {
          sections.push("enabled");
        }
        if (sections.length > 0) {
          data[profile][camera] = sections;
        }
      }
    }
    return data;
  }, [config, allProfileNames]);

  const cameraCount = useMemo(() => {
    if (!config) return 0;
    return Object.keys(profileOverviewData).reduce((max, profile) => {
      const count = Object.keys(profileOverviewData[profile] ?? {}).length;
      return Math.max(max, count);
    }, 0);
  }, [config, profileOverviewData]);

  const handleActivateProfile = useCallback(
    async (profile: string | null) => {
      setActivating(true);
      try {
        await axios.put("profile/set", {
          profile: profile || null,
        });
        await updateProfiles();
        toast.success(
          profile
            ? t("profiles.activated", {
                ns: "views/settings",
                profile,
              })
            : t("profiles.deactivated", { ns: "views/settings" }),
          { position: "top-center" },
        );
      } catch {
        toast.error(t("toast.save.error.title", { ns: "common" }), {
          position: "top-center",
        });
      } finally {
        setActivating(false);
      }
    },
    [updateProfiles, t],
  );

  const handleDeleteProfile = useCallback(async () => {
    if (!deleteProfile || !config) return;
    setDeleting(true);

    try {
      // If this profile is active, deactivate it first
      if (activeProfile === deleteProfile) {
        await axios.put("profile/set", { profile: null });
      }

      // Remove the profile from all cameras via config/set
      const configData: Record<string, unknown> = {};
      for (const camera of Object.keys(config.cameras)) {
        if (config.cameras[camera]?.profiles?.[deleteProfile]) {
          configData[camera] = {
            profiles: { [deleteProfile]: "" },
          };
        }
      }

      if (Object.keys(configData).length > 0) {
        await axios.put("config/set", {
          config_data: { cameras: configData },
        });
      }

      await updateConfig();
      await updateProfiles();

      toast.success(
        t("profiles.deleteSuccess", {
          ns: "views/settings",
          profile: deleteProfile,
        }),
        { position: "top-center" },
      );
    } catch {
      toast.error(t("toast.save.error.title", { ns: "common" }), {
        position: "top-center",
      });
    } finally {
      setDeleting(false);
      setDeleteProfile(null);
    }
  }, [deleteProfile, activeProfile, config, updateConfig, updateProfiles, t]);

  if (!config || !profilesData) {
    return null;
  }

  return (
    <div className="flex size-full flex-col lg:pr-2">
      <Heading as="h4" className="mb-5">
        {t("profiles.title", { ns: "views/settings" })}
      </Heading>

      {/* Active Profile Section */}
      <div className="mb-6 rounded-lg border border-border/70 bg-card/30 p-4">
        <div className="mb-3 text-sm font-semibold text-primary-variant">
          {t("profiles.activeProfile", { ns: "views/settings" })}
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={activeProfile ?? "__none__"}
            onValueChange={(v) =>
              handleActivateProfile(v === "__none__" ? null : v)
            }
            disabled={activating}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                {t("profiles.noActiveProfile", { ns: "views/settings" })}
              </SelectItem>
              {allProfileNames.map((profile) => {
                const color = getProfileColor(profile, allProfileNames);
                return (
                  <SelectItem key={profile} value={profile}>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          color.dot,
                        )}
                      />
                      {profile}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {activeProfile && (
            <Badge
              className={cn(
                "cursor-default",
                getProfileColor(activeProfile, allProfileNames).bg,
                "text-white",
              )}
            >
              {t("profiles.active", { ns: "views/settings" })}
            </Badge>
          )}
        </div>
      </div>

      {/* Profile Cards */}
      {allProfileNames.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p>{t("profiles.noProfiles", { ns: "views/settings" })}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {allProfileNames.map((profile) => {
            const color = getProfileColor(profile, allProfileNames);
            const isActive = activeProfile === profile;
            const cameraData = profileOverviewData[profile] ?? {};
            const cameras = Object.keys(cameraData).sort();

            return (
              <div
                key={profile}
                className={cn(
                  "rounded-lg border p-4",
                  isActive
                    ? "border-selected bg-selected/5"
                    : "border-border/70 bg-card/30",
                )}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full",
                        color.dot,
                      )}
                    />
                    <span className="font-medium">{profile}</span>
                    {isActive && (
                      <Badge
                        variant="secondary"
                        className="text-xs text-primary-variant"
                      >
                        {t("profiles.active", { ns: "views/settings" })}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteProfile(profile)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {cameras.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("profiles.noOverrides", { ns: "views/settings" })}
                  </p>
                ) : (
                  <div
                    className={cn(
                      "grid gap-2",
                      cameraCount <= 3
                        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
                    )}
                  >
                    {cameras.map((camera) => {
                      const sections = cameraData[camera];
                      return (
                        <div
                          key={camera}
                          className="flex items-start gap-2 rounded-md bg-secondary/40 px-3 py-2"
                        >
                          <Camera className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="truncate text-xs font-medium">
                              {camera}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {sections.map((section) => (
                                <span
                                  key={section}
                                  className={cn(
                                    "rounded px-1.5 py-0.5 text-[10px] leading-tight text-white",
                                    color.bg,
                                  )}
                                >
                                  {section}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Profile Confirmation */}
      <AlertDialog
        open={!!deleteProfile}
        onOpenChange={(open) => {
          if (!open) setDeleteProfile(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("profiles.deleteProfile", { ns: "views/settings" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("profiles.deleteProfileConfirm", {
                ns: "views/settings",
                profile: deleteProfile,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {t("button.cancel", { ns: "common" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteProfile}
              disabled={deleting}
            >
              {t("button.delete", { ns: "common" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
