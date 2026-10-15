import TextEntryDialog from "@/components/overlay/dialog/TextEntryDialog";
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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePtzPresetActions } from "@/hooks/use-ptz-presets";
import { FrigateConfig } from "@/types/frigateConfig";
import { PtzPreset } from "@/types/ptz";
import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { LuSave, LuTrash2 } from "react-icons/lu";
import { MdOutlineNearMe } from "react-icons/md";
import useSWR from "swr";

// 1-64 characters once surrounding whitespace is trimmed, matching the API;
// the u flag counts characters like emoji once, as Python does
const PRESET_NAME_PATTERN = /^\s*\S(?:.{0,62}\S)?\s*$/u;

type PtzPresetsDialogProps = {
  camera: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  presets: PtzPreset[];
  maxPresets?: number | null;
  canSetHome: boolean;
  onGoto: (preset: PtzPreset) => void;
};

export default function PtzPresetsDialog({
  camera,
  open,
  setOpen,
  presets,
  maxPresets,
  canSetHome,
  onGoto,
}: PtzPresetsDialogProps) {
  const { t } = useTranslation(["views/live", "common"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const { overwritePreset, deletePreset, setHome, isSaving } =
    usePtzPresetActions(camera);

  const [createOpen, setCreateOpen] = useState(false);
  // the targets outlive their open flags so the dialogs keep their text
  // through the close animation
  const [overwriteTarget, setOverwriteTarget] = useState<PtzPreset>();
  const [overwriteOpen, setOverwriteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PtzPreset>();
  const [deleteOpen, setDeleteOpen] = useState(false);

  // autotracking recalls its return preset by name, so renaming or deleting it
  // silently breaks the return after tracking ends
  const returnPreset =
    config?.cameras[camera]?.onvif?.autotracking?.return_preset?.toLowerCase();
  const isReturnPreset = (preset?: PtzPreset) =>
    !!preset && !!returnPreset && preset.name.toLowerCase() === returnPreset;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[80dvh] overflow-y-auto"
          // focusing the first preset action on open would show its tooltip
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t("ptz.presetManagement.title")}</DialogTitle>
            <DialogDescription>
              {t("ptz.presetManagement.desc")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1">
            {presets.length === 0 && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                {t("ptz.presetManagement.empty")}
              </div>
            )}
            {presets.map((preset) => (
              <div
                key={preset.token}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-secondary"
              >
                <span className="truncate text-sm">{preset.name}</span>
                <div className="flex shrink-0 items-center gap-1">
                  <PresetAction
                    label={t("ptz.presetManagement.goto")}
                    onClick={() => onGoto(preset)}
                  >
                    <MdOutlineNearMe />
                  </PresetAction>
                  <PresetAction
                    label={t("ptz.presetManagement.overwrite.label")}
                    disabled={isSaving}
                    onClick={() => {
                      setOverwriteTarget(preset);
                      setOverwriteOpen(true);
                    }}
                  >
                    <LuSave />
                  </PresetAction>
                  <PresetAction
                    label={t("button.delete", { ns: "common" })}
                    disabled={isSaving}
                    onClick={() => {
                      setDeleteTarget(preset);
                      setDeleteOpen(true);
                    }}
                  >
                    <LuTrash2 />
                  </PresetAction>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {maxPresets
                ? t("ptz.presetManagement.count", {
                    count: presets.length,
                    max: maxPresets,
                  })
                : null}
            </span>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {canSetHome && (
                <Button disabled={isSaving} onClick={() => setHome()}>
                  {t("ptz.home.set")}
                </Button>
              )}
              <Button
                variant="select"
                disabled={isSaving}
                onClick={() => setCreateOpen(true)}
              >
                {t("ptz.presetManagement.create.label")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PtzPresetCreateDialog
        camera={camera}
        open={createOpen}
        setOpen={setCreateOpen}
      />

      <TextEntryDialog
        open={overwriteOpen}
        setOpen={setOverwriteOpen}
        title={t("ptz.presetManagement.overwrite.title", {
          name: overwriteTarget?.name,
        })}
        description={
          isReturnPreset(overwriteTarget)
            ? `${t("ptz.presetManagement.overwrite.desc")} ${t("ptz.presetManagement.returnPresetWarning.rename")}`
            : t("ptz.presetManagement.overwrite.desc")
        }
        defaultValue={overwriteTarget?.name}
        regexPattern={PRESET_NAME_PATTERN}
        regexErrorMessage={t("ptz.presetManagement.invalidName")}
        isSaving={isSaving}
        onSave={async (text) => {
          if (!overwriteTarget) return;
          const name = text.trim();
          const ok = await overwritePreset(
            overwriteTarget.token,
            name === overwriteTarget.name ? null : name,
          );
          if (ok) setOverwriteOpen(false);
        }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("ptz.presetManagement.delete.title", {
                name: deleteTarget?.name,
              })}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            {t("ptz.presetManagement.delete.desc")}
            {isReturnPreset(deleteTarget) &&
              ` ${t("ptz.presetManagement.returnPresetWarning.delete")}`}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("button.cancel", { ns: "common" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => {
                if (deleteTarget) deletePreset(deleteTarget.token);
              }}
            >
              {t("button.delete", { ns: "common" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function PtzPresetCreateDialog({
  camera,
  open,
  setOpen,
}: {
  camera: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const { t } = useTranslation(["views/live"]);
  const { createPreset, isSaving } = usePtzPresetActions(camera);

  return (
    <TextEntryDialog
      open={open}
      setOpen={setOpen}
      title={t("ptz.presetManagement.create.title")}
      description={t("ptz.presetManagement.create.desc")}
      placeholder={t("ptz.presetManagement.create.placeholder")}
      regexPattern={PRESET_NAME_PATTERN}
      regexErrorMessage={t("ptz.presetManagement.invalidName")}
      isSaving={isSaving}
      onSave={async (text) => {
        if (await createPreset(text.trim())) setOpen(false);
      }}
    />
  );
}

function PresetAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      {/* portaled so the tooltip cannot widen the scrollable dialog body */}
      <TooltipPortal>
        <TooltipContent>{label}</TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}
