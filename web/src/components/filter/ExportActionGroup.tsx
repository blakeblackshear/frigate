import { useCallback, useMemo, useState } from "react";
import axios from "axios";
import { Button, buttonVariants } from "../ui/button";
import { isDesktop } from "react-device-detect";
import { HiTrash } from "react-icons/hi";
import { LuFolderPlus, LuFolderX } from "react-icons/lu";
import { Export, ExportCase } from "@/types/export";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/use-is-admin";
import OptionAndInputDialog from "../overlay/dialog/OptionAndInputDialog";

type ExportActionGroupProps = {
  selectedExports: Export[];
  setSelectedExports: (exports: Export[]) => void;
  context: "uncategorized" | "case";
  cases?: ExportCase[];
  currentCaseId?: string;
  mutate: () => void;
};
export default function ExportActionGroup({
  selectedExports,
  setSelectedExports,
  context,
  cases,
  currentCaseId,
  mutate,
}: ExportActionGroupProps) {
  const { t } = useTranslation(["views/exports", "common"]);
  const isAdmin = useIsAdmin();

  const onClearSelected = useCallback(() => {
    setSelectedExports([]);
  }, [setSelectedExports]);

  // ── Delete ──────────────────────────────────────────────────────

  const onDelete = useCallback(() => {
    const ids = selectedExports.map((e) => e.id);
    axios
      .post("exports/delete", { ids })
      .then((resp) => {
        if (resp.status === 200) {
          toast.success(t("bulkToast.success.delete"), {
            position: "top-center",
          });
          setSelectedExports([]);
          mutate();
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(t("bulkToast.error.deleteFailed", { errorMessage }), {
          position: "top-center",
        });
      });
  }, [selectedExports, setSelectedExports, mutate, t]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bypassDialog, setBypassDialog] = useState(false);

  useKeyboardListener(["Shift"], (_, modifiers) => {
    setBypassDialog(modifiers.shift);
    return false;
  });

  const handleDelete = useCallback(() => {
    if (bypassDialog) {
      onDelete();
    } else {
      setDeleteDialogOpen(true);
    }
  }, [bypassDialog, onDelete]);

  // ── Remove from case ────────────────────────────────────────────

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [deleteExportsOnRemove, setDeleteExportsOnRemove] = useState(false);

  const handleRemoveFromCase = useCallback(() => {
    const ids = selectedExports.map((e) => e.id);

    const request = deleteExportsOnRemove
      ? axios.post("exports/delete", { ids })
      : axios.post("exports/reassign", { ids, export_case_id: null });

    request
      .then((resp) => {
        if (resp.status === 200) {
          toast.success(t("bulkToast.success.remove"), {
            position: "top-center",
          });
          setSelectedExports([]);
          mutate();
          setRemoveDialogOpen(false);
          setDeleteExportsOnRemove(false);
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(t("bulkToast.error.reassignFailed", { errorMessage }), {
          position: "top-center",
        });
      });
  }, [selectedExports, deleteExportsOnRemove, setSelectedExports, mutate, t]);

  // ── Case picker ─────────────────────────────────────────────────

  const [casePickerOpen, setCasePickerOpen] = useState(false);

  const caseOptions = useMemo(
    () => [
      ...(cases ?? [])
        .filter((c) => c.id !== currentCaseId)
        .map((c) => ({
          value: c.id,
          label: c.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      {
        value: "new",
        label: t("caseDialog.newCaseOption"),
      },
    ],
    [cases, currentCaseId, t],
  );

  const handleAssignToCase = useCallback(
    async (caseId: string) => {
      const ids = selectedExports.map((e) => e.id);
      try {
        await axios.post("exports/reassign", {
          ids,
          export_case_id: caseId,
        });
        toast.success(t("bulkToast.success.reassign"), {
          position: "top-center",
        });
        setSelectedExports([]);
        mutate();
      } catch (error) {
        const apiError = error as {
          response?: { data?: { message?: string; detail?: string } };
        };
        const errorMessage =
          apiError.response?.data?.message ||
          apiError.response?.data?.detail ||
          "Unknown error";
        toast.error(t("bulkToast.error.reassignFailed", { errorMessage }), {
          position: "top-center",
        });
        throw error;
      }
    },
    [selectedExports, setSelectedExports, mutate, t],
  );

  const handleCreateNewCase = useCallback(
    async (name: string, description: string) => {
      const ids = selectedExports.map((e) => e.id);
      try {
        const createResp = await axios.post("cases", { name, description });
        const newCaseId: string | undefined = createResp.data?.id;

        if (newCaseId) {
          await axios.post("exports/reassign", {
            ids,
            export_case_id: newCaseId,
          });
        }

        toast.success(t("bulkToast.success.reassign"), {
          position: "top-center",
        });
        setSelectedExports([]);
        mutate();
      } catch (error) {
        const apiError = error as {
          response?: { data?: { message?: string; detail?: string } };
        };
        const errorMessage =
          apiError.response?.data?.message ||
          apiError.response?.data?.detail ||
          "Unknown error";
        toast.error(t("bulkToast.error.reassignFailed", { errorMessage }), {
          position: "top-center",
        });
        throw error;
      }
    },
    [selectedExports, setSelectedExports, mutate, t],
  );

  return (
    <>
      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={() => setDeleteDialogOpen(!deleteDialogOpen)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bulkDelete.title")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            {t("bulkDelete.desc", { count: selectedExports.length })}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("button.cancel", { ns: "common" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={onDelete}
            >
              {t("button.delete", { ns: "common" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove from case dialog */}
      {context === "case" && (
        <AlertDialog
          open={removeDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setRemoveDialogOpen(false);
              setDeleteExportsOnRemove(false);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("bulkRemoveFromCase.title")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("bulkRemoveFromCase.desc", {
                  count: selectedExports.length,
                })}{" "}
                {deleteExportsOnRemove
                  ? t("bulkRemoveFromCase.descDeleteExports")
                  : t("bulkRemoveFromCase.descKeepExports")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex items-center justify-start gap-6">
              <Label
                htmlFor="bulk-delete-exports-switch"
                className="cursor-pointer text-sm"
              >
                {t("bulkRemoveFromCase.deleteExports")}
              </Label>
              <Switch
                id="bulk-delete-exports-switch"
                checked={deleteExportsOnRemove}
                onCheckedChange={setDeleteExportsOnRemove}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t("button.cancel", { ns: "common" })}
              </AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: "destructive" })}
                onClick={handleRemoveFromCase}
              >
                {t("button.delete", { ns: "common" })}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Case picker dialog */}
      <OptionAndInputDialog
        open={casePickerOpen}
        title={t("caseDialog.title")}
        description={t("caseDialog.description")}
        setOpen={setCasePickerOpen}
        options={caseOptions}
        nameLabel={t("caseDialog.nameLabel")}
        descriptionLabel={t("caseDialog.descriptionLabel")}
        initialValue={caseOptions[0]?.value}
        newValueKey="new"
        onSave={handleAssignToCase}
        onCreateNew={handleCreateNewCase}
      />

      {/* Action bar */}
      <div className="flex w-full items-center justify-end gap-2">
        <div className="mx-1 flex items-center justify-center text-sm text-muted-foreground">
          <div className="p-1">
            {t("selected", { count: selectedExports.length })}
          </div>
          <div className="p-1">{"|"}</div>
          <div
            className="cursor-pointer p-2 text-primary hover:rounded-lg hover:bg-secondary"
            onClick={onClearSelected}
          >
            {t("button.unselect", { ns: "common" })}
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 md:gap-2">
            {/* Add to Case / Move to Case */}
            <Button
              className="flex items-center gap-2 p-2"
              aria-label={
                context === "case"
                  ? t("bulkActions.moveToCase")
                  : t("bulkActions.addToCase")
              }
              size="sm"
              onClick={() => setCasePickerOpen(true)}
            >
              <LuFolderPlus className="text-secondary-foreground" />
              {isDesktop && (
                <div className="text-primary">
                  {context === "case"
                    ? t("bulkActions.moveToCase")
                    : t("bulkActions.addToCase")}
                </div>
              )}
            </Button>

            {/* Remove from Case (case context only) */}
            {context === "case" && (
              <Button
                className="flex items-center gap-2 p-2"
                aria-label={t("bulkActions.removeFromCase")}
                size="sm"
                onClick={() => setRemoveDialogOpen(true)}
              >
                <LuFolderX className="text-secondary-foreground" />
                {isDesktop && (
                  <div className="text-primary">
                    {t("bulkActions.removeFromCase")}
                  </div>
                )}
              </Button>
            )}

            {/* Delete */}
            <Button
              className="flex items-center gap-2 p-2"
              aria-label={t("button.delete", { ns: "common" })}
              size="sm"
              onClick={handleDelete}
            >
              <HiTrash className="text-secondary-foreground" />
              {isDesktop && (
                <div className="text-primary">
                  {bypassDialog
                    ? t("bulkActions.deleteNow")
                    : t("bulkActions.delete")}
                </div>
              )}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
