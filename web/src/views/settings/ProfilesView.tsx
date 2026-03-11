import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import axios from "axios";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { LuChevronDown, LuChevronRight, LuPlus } from "react-icons/lu";
import type { FrigateConfig } from "@/types/frigateConfig";
import type { ProfileState } from "@/types/profile";
import { getProfileColor } from "@/utils/profileColors";
import { PROFILE_ELIGIBLE_SECTIONS } from "@/utils/configUtil";
import { resolveCameraName } from "@/hooks/use-camera-friendly-name";
import { cn } from "@/lib/utils";
import Heading from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ActivityIndicator from "@/components/indicators/activity-indicator";

type ProfilesApiResponse = {
  profiles: string[];
  active_profile: string | null;
};

type ProfilesViewProps = {
  setUnsavedChanges?: React.Dispatch<React.SetStateAction<boolean>>;
  profileState?: ProfileState;
  profilesUIEnabled?: boolean;
  setProfilesUIEnabled?: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function ProfilesView({
  profileState,
  profilesUIEnabled,
  setProfilesUIEnabled,
}: ProfilesViewProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");
  const { data: profilesData, mutate: updateProfiles } =
    useSWR<ProfilesApiResponse>("profiles");

  const [activating, setActivating] = useState(false);
  const [deleteProfile, setDeleteProfile] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(
    new Set(),
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

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

  const validateName = useCallback(
    (name: string): string | null => {
      if (!name.trim()) return null;
      if (!/^[a-z0-9_]+$/.test(name)) {
        return t("profiles.nameInvalid", { ns: "views/settings" });
      }
      if (allProfileNames.includes(name)) {
        return t("profiles.nameDuplicate", { ns: "views/settings" });
      }
      return null;
    },
    [allProfileNames, t],
  );

  const handleAddSubmit = useCallback(() => {
    const name = newProfileName.trim();
    if (!name) return;
    const error = validateName(name);
    if (error) {
      setNameError(error);
      return;
    }
    profileState?.onAddProfile(name);
    setAddDialogOpen(false);
    setNewProfileName("");
    setNameError(null);
  }, [newProfileName, validateName, profileState]);

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
      } catch (err) {
        const message =
          axios.isAxiosError(err) && err.response?.data?.message
            ? String(err.response.data.message)
            : undefined;
        toast.error(
          message || t("profiles.activateFailed", { ns: "views/settings" }),
          { position: "top-center" },
        );
      } finally {
        setActivating(false);
      }
    },
    [updateProfiles, t],
  );

  const handleDeleteProfile = useCallback(async () => {
    if (!deleteProfile || !config) return;

    // If this is an unsaved (new) profile, just remove it from local state
    const isNewProfile = profileState?.newProfiles.includes(deleteProfile);
    if (isNewProfile) {
      profileState?.onRemoveNewProfile(deleteProfile);
      setDeleteProfile(null);
      return;
    }

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
          requires_restart: 0,
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
    } catch (err) {
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : undefined;
      toast.error(
        errorMessage || t("toast.save.error.noMessage", { ns: "common" }),
        { position: "top-center" },
      );
    } finally {
      setDeleting(false);
      setDeleteProfile(null);
    }
  }, [
    deleteProfile,
    activeProfile,
    config,
    profileState,
    updateConfig,
    updateProfiles,
    t,
  ]);

  const toggleExpanded = useCallback((profile: string) => {
    setExpandedProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(profile)) {
        next.delete(profile);
      } else {
        next.add(profile);
      }
      return next;
    });
  }, []);

  if (!config || !profilesData) {
    return null;
  }

  const hasProfiles = allProfileNames.length > 0;

  return (
    <div className="flex size-full max-w-5xl flex-col lg:pr-2">
      <Heading as="h4">{t("profiles.title", { ns: "views/settings" })}</Heading>
      <div className="my-1 text-sm text-muted-foreground">
        {t("profiles.disabledDescription", { ns: "views/settings" })}
      </div>

      {/* Enable Profiles Toggle — shown only when no profiles exist */}
      {!hasProfiles && setProfilesUIEnabled && (
        <div className="my-6 max-w-xl rounded-lg border border-border/70 bg-card/30 p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="profiles-toggle" className="cursor-pointer">
              {t("profiles.enableSwitch", { ns: "views/settings" })}
            </Label>
            <Switch
              id="profiles-toggle"
              checked={profilesUIEnabled ?? false}
              onCheckedChange={setProfilesUIEnabled}
            />
          </div>
        </div>
      )}

      {profilesUIEnabled && !hasProfiles && (
        <p className="mb-5 max-w-xl text-sm text-primary-variant">
          {t("profiles.enabledDescription", { ns: "views/settings" })}
        </p>
      )}

      {/* Active Profile + Add Profile bar */}
      {(hasProfiles || profilesUIEnabled) && (
        <div className="my-4 flex items-center justify-between rounded-lg border border-border/70 bg-card/30 p-4">
          {hasProfiles && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-primary-variant">
                {t("profiles.activeProfile", { ns: "views/settings" })}
              </span>
              <Select
                value={activeProfile ?? "__none__"}
                onValueChange={(v) =>
                  handleActivateProfile(v === "__none__" ? null : v)
                }
                disabled={activating}
              >
                <SelectTrigger className="">
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
              {activating && <ActivityIndicator className="w-auto" size={18} />}
            </div>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={() => setAddDialogOpen(true)}
          >
            <LuPlus className="mr-1.5 size-4" />
            {t("profiles.addProfile", { ns: "views/settings" })}
          </Button>
        </div>
      )}

      {/* Profile List */}
      {!hasProfiles ? (
        profilesUIEnabled ? (
          <p className="text-sm text-muted-foreground">
            {t("profiles.noProfiles", { ns: "views/settings" })}
          </p>
        ) : (
          <div />
        )
      ) : (
        <div className="flex flex-col gap-2">
          {allProfileNames.map((profile) => {
            const color = getProfileColor(profile, allProfileNames);
            const isActive = activeProfile === profile;
            const cameraData = profileOverviewData[profile] ?? {};
            const cameras = Object.keys(cameraData).sort();
            const isExpanded = expandedProfiles.has(profile);

            return (
              <Collapsible
                key={profile}
                open={isExpanded}
                onOpenChange={() => toggleExpanded(profile)}
              >
                <div
                  className={cn(
                    "rounded-lg border",
                    isActive
                      ? "border-selected bg-selected/5"
                      : "border-border/70",
                  )}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-secondary/30">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <LuChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <LuChevronRight className="size-4 text-muted-foreground" />
                        )}
                        <span
                          className={cn(
                            "size-2.5 shrink-0 rounded-full",
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
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {cameras.length > 0
                            ? t("profiles.cameraCount", {
                                ns: "views/settings",
                                count: cameras.length,
                              })
                            : t("profiles.noOverrides", {
                                ns: "views/settings",
                              })}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteProfile(profile);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {cameras.length > 0 ? (
                      <div className="mx-4 mb-3 ml-11 border-l border-border/50 pl-4">
                        {cameras.map((camera) => {
                          const sections = cameraData[camera];
                          return (
                            <div
                              key={camera}
                              className="flex items-baseline gap-3 py-1.5"
                            >
                              <span className="min-w-[120px] shrink-0 truncate text-sm font-medium">
                                {resolveCameraName(config, camera)}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {sections
                                  .map((section) =>
                                    t(`configForm.sections.${section}`, {
                                      ns: "views/settings",
                                      defaultValue: section,
                                    }),
                                  )
                                  .join(", ")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mx-4 mb-3 ml-11 text-sm text-muted-foreground">
                        {t("profiles.noOverrides", { ns: "views/settings" })}
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Add Profile Dialog */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) {
            setNewProfileName("");
            setNameError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>
              {t("profiles.newProfile", { ns: "views/settings" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input
              placeholder={t("profiles.profileNamePlaceholder", {
                ns: "views/settings",
              })}
              value={newProfileName}
              onChange={(e) => {
                setNewProfileName(e.target.value);
                setNameError(validateName(e.target.value));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSubmit();
                }
              }}
              autoFocus
            />
            {nameError && (
              <p className="text-xs text-destructive">{nameError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {t("button.cancel", { ns: "common" })}
            </Button>
            <Button
              variant="select"
              onClick={handleAddSubmit}
              disabled={!newProfileName.trim() || !!nameError}
            >
              {t("button.add", { ns: "common" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
