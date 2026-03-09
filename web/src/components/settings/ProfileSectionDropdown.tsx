import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProfileColor } from "@/utils/profileColors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProfileSectionDropdownProps = {
  cameraName: string;
  sectionKey: string;
  allProfileNames: string[];
  editingProfile: string | null;
  hasProfileData: (profileName: string) => boolean;
  onSelectProfile: (profileName: string | null) => void;
  onAddProfile: (name: string) => void;
  onDeleteProfileSection: (profileName: string) => void;
};

export function ProfileSectionDropdown({
  cameraName,
  sectionKey,
  allProfileNames,
  editingProfile,
  hasProfileData,
  onSelectProfile,
  onAddProfile,
  onDeleteProfileSection,
}: ProfileSectionDropdownProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirmProfile, setDeleteConfirmProfile] = useState<
    string | null
  >(null);
  const [newProfileName, setNewProfileName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const validateName = useCallback(
    (name: string): string | null => {
      if (!name.trim()) return null;
      if (!/^[a-z0-9_]+$/.test(name)) {
        return t("profiles.nameInvalid", {
          ns: "views/settings",
          defaultValue: "Only lowercase letters, numbers, and underscores",
        });
      }
      if (allProfileNames.includes(name)) {
        return t("profiles.nameDuplicate", {
          ns: "views/settings",
          defaultValue: "Profile already exists",
        });
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
    onAddProfile(name);
    onSelectProfile(name);
    setAddDialogOpen(false);
    setNewProfileName("");
    setNameError(null);
  }, [newProfileName, validateName, onAddProfile, onSelectProfile]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteConfirmProfile) return;
    onDeleteProfileSection(deleteConfirmProfile);
    if (editingProfile === deleteConfirmProfile) {
      onSelectProfile(null);
    }
    setDeleteConfirmProfile(null);
  }, [
    deleteConfirmProfile,
    editingProfile,
    onDeleteProfileSection,
    onSelectProfile,
  ]);

  const activeColor = editingProfile
    ? getProfileColor(editingProfile, allProfileNames)
    : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs font-normal"
          >
            {editingProfile ? (
              <>
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    activeColor?.dot,
                  )}
                />
                {editingProfile}
              </>
            ) : (
              t("profiles.baseConfig", {
                ns: "views/settings",
                defaultValue: "Base Config",
              })
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
                {t("profiles.baseConfig", {
                  ns: "views/settings",
                  defaultValue: "Base Config",
                })}
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
                className="group flex items-center justify-between gap-2"
                onClick={() => onSelectProfile(profile)}
              >
                <div className="flex items-center gap-2">
                  {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      color.dot,
                      !isActive && "ml-[22px]",
                    )}
                  />
                  <span>{profile}</span>
                  {!hasData && (
                    <span className="text-xs text-muted-foreground">
                      {t("profiles.noOverrides", {
                        ns: "views/settings",
                        defaultValue: "no overrides",
                      })}
                    </span>
                  )}
                </div>
                {hasData && (
                  <button
                    className="invisible rounded p-0.5 text-muted-foreground group-hover:visible hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmProfile(profile);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setNewProfileName("");
              setNameError(null);
              setAddDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            {t("profiles.addProfile", {
              ns: "views/settings",
              defaultValue: "Add Profile...",
            })}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>
              {t("profiles.newProfile", {
                ns: "views/settings",
                defaultValue: "New Profile",
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input
              placeholder={t("profiles.profileNamePlaceholder", {
                ns: "views/settings",
                defaultValue: "e.g., armed, away, night",
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
              {t("button.create", { ns: "common", defaultValue: "Create" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteConfirmProfile}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmProfile(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("profiles.deleteSection", {
                ns: "views/settings",
                defaultValue: "Delete Section Overrides",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("profiles.deleteSectionConfirm", {
                ns: "views/settings",
                defaultValue:
                  "Remove {{profile}}'s overrides for {{section}} on {{camera}}?",
                profile: deleteConfirmProfile,
                section: sectionKey,
                camera: cameraName,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("button.cancel", { ns: "common" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              {t("button.delete", { ns: "common", defaultValue: "Delete" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
