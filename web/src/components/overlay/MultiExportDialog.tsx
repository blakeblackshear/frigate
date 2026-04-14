import { useCallback, useMemo, useState } from "react";
import { isDesktop } from "react-device-detect";
import axios from "axios";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

import {
  BatchExportBody,
  BatchExportResponse,
  BatchExportResult,
  ExportCase,
} from "@/types/export";
import { FrigateConfig } from "@/types/frigateConfig";
import { REVIEW_PADDING, ReviewSegment } from "@/types/review";
import { resolveCameraName } from "@/hooks/use-camera-friendly-name";
import { useDateLocale } from "@/hooks/use-date-locale";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";

type MultiExportDialogProps = {
  selectedReviews: ReviewSegment[];
  onStarted: () => void;
  children: React.ReactNode;
};

const NONE_CASE_OPTION = "none";
const NEW_CASE_OPTION = "new";

export default function MultiExportDialog({
  selectedReviews,
  onStarted,
  children,
}: MultiExportDialogProps) {
  const { t } = useTranslation(["components/dialog", "common"]);
  const locale = useDateLocale();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();

  const { data: config } = useSWR<FrigateConfig>("config");
  // Only admins can attach exports to an existing case (enforced server-side
  // by POST /exports/batch). Skip fetching the case list entirely for
  // non-admins — they can only ever use the "Create new case" branch.
  const { data: cases } = useSWR<ExportCase[]>(isAdmin ? "cases" : null);

  const [open, setOpen] = useState(false);
  const [caseSelection, setCaseSelection] = useState<string>(NONE_CASE_OPTION);
  const [newCaseName, setNewCaseName] = useState("");
  const [newCaseDescription, setNewCaseDescription] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const count = selectedReviews.length;

  // Resolve a failed batch result back to a human-readable label via the
  // client-provided review id when available. Falls back to item_index and
  // finally camera name for defensive compatibility.
  const formatFailureLabel = useCallback(
    (result: BatchExportResult): string => {
      const cameraName = resolveCameraName(config, result.camera);
      if (result.client_item_id) {
        const review = selectedReviews.find(
          (item) => item.id === result.client_item_id,
        );
        if (review) {
          const time = formatUnixTimestampToDateTime(review.start_time, {
            date_style: "short",
            time_style: "short",
            locale,
          });
          return `${cameraName} • ${time}`;
        }
      }
      if (
        typeof result.item_index === "number" &&
        result.item_index >= 0 &&
        result.item_index < selectedReviews.length
      ) {
        const review = selectedReviews[result.item_index];
        const time = formatUnixTimestampToDateTime(review.start_time, {
          date_style: "short",
          time_style: "short",
          locale,
        });
        return `${cameraName} • ${time}`;
      }
      return cameraName;
    },
    [config, locale, selectedReviews],
  );

  const defaultCaseName = useMemo(() => {
    const formattedDate = formatUnixTimestampToDateTime(Date.now() / 1000, {
      date_style: "medium",
      time_style: "short",
      locale,
    });
    return t("export.multi.caseNamePlaceholder", {
      ns: "components/dialog",
      date: formattedDate,
    });
  }, [t, locale]);

  const resetState = useCallback(() => {
    setCaseSelection(NONE_CASE_OPTION);
    setNewCaseName("");
    setNewCaseDescription("");
    setIsExporting(false);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        resetState();
      } else {
        // Freshly reset each time so the default name reflects "now"
        setCaseSelection(NONE_CASE_OPTION);
        setNewCaseName(defaultCaseName);
        setNewCaseDescription("");
        setIsExporting(false);
      }
      setOpen(next);
    },
    [defaultCaseName, resetState],
  );

  const existingCases = useMemo(() => {
    return (cases ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [cases]);

  const isNewCase = caseSelection === NEW_CASE_OPTION;

  const canSubmit = useMemo(() => {
    if (isExporting) return false;
    if (count === 0) return false;
    if (!isAdmin) return true;
    if (isNewCase) {
      return newCaseName.trim().length > 0;
    }
    return caseSelection.length > 0;
  }, [caseSelection, count, isAdmin, isExporting, isNewCase, newCaseName]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    const items = selectedReviews.map((review) => ({
      camera: review.camera,
      start_time: review.start_time - REVIEW_PADDING,
      end_time: (review.end_time ?? Date.now() / 1000) + REVIEW_PADDING,
      image_path: review.thumb_path || undefined,
      client_item_id: review.id,
    }));

    const payload: BatchExportBody = { items };

    if (isAdmin && caseSelection !== NONE_CASE_OPTION) {
      if (isNewCase) {
        payload.new_case_name = newCaseName.trim();
        payload.new_case_description = newCaseDescription.trim() || undefined;
      } else {
        payload.export_case_id = caseSelection;
      }
    }

    setIsExporting(true);
    try {
      const response = await axios.post<BatchExportResponse>(
        "exports/batch",
        payload,
      );

      const results = response.data.results ?? [];
      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      if (successful.length > 0 && failed.length === 0) {
        toast.success(
          t(
            isAdmin
              ? "export.multi.toast.started"
              : "export.multi.toast.startedNoCase",
            {
              ns: "components/dialog",
              count: successful.length,
            },
          ),
          { position: "top-center" },
        );
      } else if (successful.length > 0 && failed.length > 0) {
        // Resolve each failure to its review via item_index so same-camera
        // items are disambiguated by time. Falls back to camera-only if the
        // server didn't populate item_index.
        const failedLabels = failed.map(formatFailureLabel).join(", ");
        toast.success(
          t("export.multi.toast.partial", {
            ns: "components/dialog",
            successful: successful.length,
            total: results.length,
            failedItems: failedLabels,
          }),
          { position: "top-center" },
        );
      } else {
        const failedLabels = failed.map(formatFailureLabel).join(", ");
        toast.error(
          t("export.multi.toast.failed", {
            ns: "components/dialog",
            total: results.length,
            failedItems: failedLabels,
          }),
          { position: "top-center" },
        );
      }

      if (successful.length > 0) {
        onStarted();
        setOpen(false);
        resetState();
        if (response.data.export_case_id) {
          navigate(`/export?caseId=${response.data.export_case_id}`);
        }
      }
    } catch (error) {
      const apiError = error as {
        response?: { data?: { message?: string; detail?: string } };
      };
      const errorMessage =
        apiError.response?.data?.message ||
        apiError.response?.data?.detail ||
        "Unknown error";
      toast.error(
        t("export.toast.error.failed", {
          ns: "components/dialog",
          error: errorMessage,
        }),
        { position: "top-center" },
      );
    } finally {
      setIsExporting(false);
    }
  }, [
    canSubmit,
    caseSelection,
    formatFailureLabel,
    isAdmin,
    isNewCase,
    navigate,
    newCaseDescription,
    newCaseName,
    onStarted,
    resetState,
    selectedReviews,
    t,
  ]);

  // New-case inputs: rendered below the Select when caseSelection === "new",
  // or rendered standalone for non-admins (who never see the Select since
  // they cannot attach to an existing case).
  const newCaseInputs = (
    <div className="space-y-2 pt-1">
      <Input
        className="text-md"
        placeholder={t("export.case.newCaseNamePlaceholder")}
        value={newCaseName}
        onChange={(event) => setNewCaseName(event.target.value)}
        maxLength={100}
        autoFocus={isDesktop}
      />
      <Textarea
        className="text-md"
        placeholder={t("export.case.newCaseDescriptionPlaceholder")}
        value={newCaseDescription}
        onChange={(event) => setNewCaseDescription(event.target.value)}
        rows={2}
      />
    </div>
  );

  const body = (
    <div className="flex flex-col gap-4">
      {isAdmin && (
        <div className="space-y-2">
          <Label className="text-sm text-secondary-foreground">
            {t("export.case.label")}
          </Label>
          <Select
            value={caseSelection}
            onValueChange={(value) => setCaseSelection(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("export.case.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_CASE_OPTION}>
                {t("label.none", { ns: "common" })}
              </SelectItem>
              {existingCases.map((caseItem) => (
                <SelectItem key={caseItem.id} value={caseItem.id}>
                  {caseItem.name}
                </SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem value={NEW_CASE_OPTION}>
                {t("export.case.newCaseOption")}
              </SelectItem>
            </SelectContent>
          </Select>
          {isNewCase && newCaseInputs}
        </div>
      )}
    </div>
  );

  const footer = (
    <>
      <Button
        variant="outline"
        onClick={() => handleOpenChange(false)}
        disabled={isExporting}
      >
        {t("button.cancel", { ns: "common" })}
      </Button>
      <Button
        variant="select"
        onClick={handleSubmit}
        disabled={!canSubmit}
        aria-label={t("export.multi.exportButton", { count })}
      >
        {isExporting
          ? t("export.multi.exportingButton")
          : t("export.multi.exportButton", { count })}
      </Button>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("export.multi.title", { count })}</DialogTitle>
            <DialogDescription>
              {isAdmin
                ? t("export.multi.description")
                : t("export.multi.descriptionNoCase")}
            </DialogDescription>
          </DialogHeader>
          {body}
          <DialogFooter className="gap-2">{footer}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="px-4 pb-6">
        <DrawerHeader className="px-0">
          <DrawerTitle>{t("export.multi.title", { count })}</DrawerTitle>
          <DrawerDescription>
            {isAdmin
              ? t("export.multi.description")
              : t("export.multi.descriptionNoCase")}
          </DrawerDescription>
        </DrawerHeader>
        {body}
        <div className="mt-4 flex flex-col-reverse gap-2">{footer}</div>
      </DrawerContent>
    </Drawer>
  );
}
