import { baseUrl } from "@/api/baseUrl";
import {
  ActiveExportJobCard,
  CaseCard,
  ExportCard,
} from "@/components/card/ExportCard";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Heading from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { useSearchEffect } from "@/hooks/use-overlay-state";
import { useHistoryBack } from "@/hooks/use-history-back";
import { useApiFilterArgs } from "@/hooks/use-api-filter";
import { cn } from "@/lib/utils";
import { useFormattedTimestamp, useTimeFormat } from "@/hooks/use-date-utils";
import {
  DeleteClipType,
  Export,
  ExportCase,
  ExportFilter,
  ExportJob,
} from "@/types/export";
import OptionAndInputDialog from "@/components/overlay/dialog/OptionAndInputDialog";
import axios from "axios";
import { FrigateConfig } from "@/types/frigateConfig";

import {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isMobile, isMobileOnly } from "react-device-detect";
import { useTranslation } from "react-i18next";

import { IoMdArrowRoundBack } from "react-icons/io";
import { LuFolderX } from "react-icons/lu";
import { toast } from "sonner";
import useSWR from "swr";
import ExportFilterGroup from "@/components/filter/ExportFilterGroup";

// always parse these as string arrays
const EXPORT_FILTER_ARRAY_KEYS = ["cameras"];

function Exports() {
  const { t } = useTranslation(["views/exports"]);

  useEffect(() => {
    document.title = t("documentTitle");
  }, [t]);

  // Filters

  const [exportFilter, setExportFilter, exportSearchParams] =
    useApiFilterArgs<ExportFilter>(EXPORT_FILTER_ARRAY_KEYS);

  // Data

  const { data: cases, mutate: updateCases } = useSWR<ExportCase[]>("cases");
  const { data: activeExportJobs } = useSWR<ExportJob[]>("jobs/export", {
    refreshInterval: 2000,
  });
  const { data: rawExports, mutate: updateExports } = useSWR<Export[]>(
    exportSearchParams && Object.keys(exportSearchParams).length > 0
      ? ["exports", exportSearchParams]
      : "exports",
    {
      refreshInterval: (activeExportJobs?.length ?? 0) > 0 ? 2000 : 0,
    },
  );

  const visibleActiveJobs = useMemo<ExportJob[]>(() => {
    const existingExportIds = new Set((rawExports ?? []).map((exp) => exp.id));
    const filteredCameras = exportFilter?.cameras;

    return (activeExportJobs ?? []).filter((job) => {
      if (existingExportIds.has(job.id)) {
        return false;
      }

      if (filteredCameras && filteredCameras.length > 0) {
        return filteredCameras.includes(job.camera);
      }

      return true;
    });
  }, [activeExportJobs, exportFilter?.cameras, rawExports]);

  const activeJobsByCase = useMemo<{ [caseId: string]: ExportJob[] }>(() => {
    const grouped: { [caseId: string]: ExportJob[] } = {};

    visibleActiveJobs.forEach((job) => {
      const caseId = job.export_case_id ?? "none";
      if (!grouped[caseId]) {
        grouped[caseId] = [];
      }

      grouped[caseId].push(job);
    });

    return grouped;
  }, [visibleActiveJobs]);

  const exportsByCase = useMemo<{ [caseId: string]: Export[] }>(() => {
    const grouped: { [caseId: string]: Export[] } = {};
    (rawExports ?? []).forEach((exp) => {
      const caseId = exp.export_case ?? exp.export_case_id ?? "none";
      if (!grouped[caseId]) {
        grouped[caseId] = [];
      }

      grouped[caseId].push(exp);
    });
    return grouped;
  }, [rawExports]);

  const filteredCases = useMemo<ExportCase[]>(() => {
    return cases || [];
  }, [cases]);

  const exports = useMemo<Export[]>(
    () => exportsByCase["none"] || [],
    [exportsByCase],
  );

  const mutate = useCallback(() => {
    updateExports();
    updateCases();
  }, [updateExports, updateCases]);

  // Search

  const [search, setSearch] = useState("");

  // Viewing

  const [selected, setSelected] = useState<Export>();
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>(
    undefined,
  );
  const [selectedAspect, setSelectedAspect] = useState(0.0);

  // Handle browser back button to deselect case before navigating away
  useHistoryBack({
    enabled: true,
    open: selectedCaseId !== undefined,
    onClose: () => setSelectedCaseId(undefined),
  });

  useSearchEffect("id", (id) => {
    if (!rawExports) {
      return false;
    }

    setSelected(rawExports.find((exp) => exp.id == id));
    return true;
  });

  useSearchEffect("caseId", (caseId: string) => {
    if (!filteredCases) {
      return false;
    }

    const exists = filteredCases.some((c) => c.id === caseId);

    if (!exists) {
      return false;
    }

    setSelectedCaseId(caseId);
    return true;
  });

  // Modifying

  const [deleteClip, setDeleteClip] = useState<DeleteClipType | undefined>();
  const [exportToAssign, setExportToAssign] = useState<Export | undefined>();
  const [caseDialog, setCaseDialog] = useState<
    { mode: "create" | "edit"; exportCase?: ExportCase } | undefined
  >();
  const [caseToDelete, setCaseToDelete] = useState<ExportCase | undefined>();
  const [caseForAddExport, setCaseForAddExport] = useState<
    ExportCase | undefined
  >();

  const onHandleDelete = useCallback(() => {
    if (!deleteClip) {
      return;
    }

    axios.delete(`export/${deleteClip.file}`).then((response) => {
      if (response.status == 200) {
        setDeleteClip(undefined);
        mutate();
      }
    });
  }, [deleteClip, mutate]);

  const onHandleRename = useCallback(
    (id: string, update: string) => {
      axios
        .patch(`export/${id}/rename`, {
          name: update,
        })
        .then((response) => {
          if (response.status === 200) {
            setDeleteClip(undefined);
            mutate();
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(t("toast.error.renameExportFailed", { errorMessage }), {
            position: "top-center",
          });
        });
    },
    [mutate, setDeleteClip, t],
  );

  // Keyboard Listener

  const contentRef = useRef<HTMLDivElement | null>(null);
  useKeyboardListener([], undefined, contentRef);

  const selectedCase = useMemo(
    () => cases?.find((c) => c.id === selectedCaseId),
    [cases, selectedCaseId],
  );

  const uncategorizedExports = useMemo(
    () => exportsByCase["none"] || [],
    [exportsByCase],
  );

  const saveCase = useCallback(
    async (
      payload: { name: string; description: string },
      exportCaseId?: string,
    ) => {
      try {
        let savedCaseId = exportCaseId;

        if (exportCaseId) {
          await axios.patch(`cases/${exportCaseId}`, payload);
        } else {
          const response = await axios.post("cases", payload);
          savedCaseId = response.data.id;
        }

        if (savedCaseId) {
          setSelectedCaseId(savedCaseId);
        }

        mutate();
        return true;
      } catch (error) {
        const apiError = error as {
          response?: { data?: { message?: string; detail?: string } };
        };
        const errorMessage =
          apiError.response?.data?.message ||
          apiError.response?.data?.detail ||
          "Unknown error";
        toast.error(t("toast.error.caseSaveFailed", { errorMessage }), {
          position: "top-center",
        });

        return false;
      }
    },
    [mutate, t],
  );

  const handleSaveCase = useCallback(
    async (payload: { name: string; description: string }) => {
      const didSave = await saveCase(
        payload,
        caseDialog?.mode === "edit" ? caseDialog.exportCase?.id : undefined,
      );

      if (didSave) {
        setCaseDialog(undefined);
      }
    },
    [caseDialog, saveCase],
  );

  const handleDeleteCase = useCallback(async () => {
    if (!caseToDelete) {
      return;
    }

    try {
      await axios.delete(`cases/${caseToDelete.id}`);
      if (selectedCaseId === caseToDelete.id) {
        setSelectedCaseId(undefined);
      }
      setCaseToDelete(undefined);
      mutate();
    } catch (error) {
      const apiError = error as {
        response?: { data?: { message?: string; detail?: string } };
      };
      const errorMessage =
        apiError.response?.data?.message ||
        apiError.response?.data?.detail ||
        "Unknown error";
      toast.error(t("toast.error.caseDeleteFailed", { errorMessage }), {
        position: "top-center",
      });
    }
  }, [caseToDelete, mutate, selectedCaseId, t]);

  const handleAssignExportToCase = useCallback(
    async (exportId: string, caseId: string) => {
      try {
        await axios.patch(`export/${exportId}/case`, {
          export_case_id: caseId,
        });
        mutate();
      } catch (error) {
        const apiError = error as {
          response?: { data?: { message?: string; detail?: string } };
        };
        const errorMessage =
          apiError.response?.data?.message ||
          apiError.response?.data?.detail ||
          "Unknown error";
        toast.error(t("toast.error.assignCaseFailed", { errorMessage }), {
          position: "top-center",
        });
      }
    },
    [mutate, t],
  );

  const resetCaseDialog = useCallback(() => {
    setExportToAssign(undefined);
  }, []);

  return (
    <div className="flex size-full flex-col gap-2 overflow-hidden px-1 pt-2 md:p-2">
      <Toaster closeButton={true} />

      <CaseEditorDialog
        caseDialog={caseDialog}
        onClose={() => setCaseDialog(undefined)}
        onSave={handleSaveCase}
      />

      <CaseAddExportDialog
        exportCase={caseForAddExport}
        availableExports={uncategorizedExports}
        onClose={() => setCaseForAddExport(undefined)}
        onAssign={handleAssignExportToCase}
      />

      <CaseAssignmentDialog
        exportToAssign={exportToAssign}
        cases={cases}
        selectedCaseId={selectedCaseId}
        onClose={resetCaseDialog}
        mutate={mutate}
      />

      <AlertDialog
        open={deleteClip != undefined}
        onOpenChange={() => setDeleteClip(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteExport.label")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteExport.desc", { exportName: deleteClip?.exportName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("button.cancel", { ns: "common" })}
            </AlertDialogCancel>
            <Button
              className="text-white"
              aria-label="Delete Export"
              variant="destructive"
              onClick={() => onHandleDelete()}
            >
              {t("button.delete", { ns: "common" })}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={caseToDelete != undefined}
        onOpenChange={() => setCaseToDelete(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteCase.label")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteCase.desc", {
                caseName: caseToDelete?.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("button.cancel", { ns: "common" })}
            </AlertDialogCancel>
            <Button
              className="text-white"
              variant="destructive"
              onClick={() => void handleDeleteCase()}
            >
              {t("button.delete", { ns: "common" })}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={selected != undefined}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(undefined);
          }
        }}
      >
        <DialogContent
          className={cn(
            "max-h-[95dvh] sm:max-w-xl md:max-w-4xl lg:max-w-4xl xl:max-w-7xl",
            isMobile && "landscape:max-w-[60%]",
          )}
        >
          <DialogTitle className="smart-capitalize">
            {selected?.name?.replaceAll("_", " ")}
          </DialogTitle>
          <video
            className={cn(
              "size-full rounded-lg md:rounded-2xl",
              selectedAspect < 1.5 && "aspect-video h-full",
            )}
            playsInline
            preload="auto"
            autoPlay
            controls
            muted
            onLoadedData={(e) =>
              setSelectedAspect(
                e.currentTarget.videoWidth / e.currentTarget.videoHeight,
              )
            }
          >
            <source
              src={`${baseUrl}${selected?.video_path?.replace("/media/frigate/", "")}`}
              type="video/mp4"
            />
          </video>
        </DialogContent>
      </Dialog>

      <div
        className={cn(
          "flex w-full flex-col items-start space-y-2 pr-2 md:mb-2 lg:relative lg:h-10 lg:flex-row lg:items-center lg:space-y-0",
          isMobileOnly && "mb-2 h-auto flex-wrap gap-2 space-y-0",
        )}
      >
        <div className="flex w-full items-center gap-2">
          {selectedCase && (
            <Button
              className="flex items-center gap-2.5 rounded-lg"
              aria-label={t("label.back", { ns: "common" })}
              size="sm"
              onClick={() => setSelectedCaseId(undefined)}
            >
              <IoMdArrowRoundBack className="size-5 text-secondary-foreground" />
              {!isMobileOnly && (
                <div className="text-primary">
                  {t("button.back", { ns: "common" })}
                </div>
              )}
            </Button>
          )}
          <Input
            className="text-md w-full bg-muted md:w-1/2"
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!selectedCase && (
          <div className="flex w-full items-center justify-between gap-2 md:justify-start lg:justify-end">
            <ExportFilterGroup
              className="justify-start"
              filter={exportFilter}
              filters={["cameras"]}
              onUpdateFilter={setExportFilter}
            />
            <Button
              variant="default"
              size="sm"
              onClick={() => setCaseDialog({ mode: "create" })}
            >
              {t("toolbar.newCase")}
            </Button>
          </div>
        )}
        {selectedCase && (
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              className="flex items-center gap-2.5 rounded-lg"
              size="sm"
              onClick={() => setCaseForAddExport(selectedCase)}
            >
              <div className="text-primary">{t("toolbar.addExport")}</div>
            </Button>
            <Button
              className="flex items-center gap-2.5 rounded-lg"
              size="sm"
              onClick={() =>
                setCaseDialog({ mode: "edit", exportCase: selectedCase })
              }
            >
              <div className="text-primary">{t("toolbar.editCase")}</div>
            </Button>
            <Button
              className="flex items-center gap-2.5 rounded-lg"
              size="sm"
              onClick={() => setCaseToDelete(selectedCase)}
            >
              <div className="text-primary">{t("toolbar.deleteCase")}</div>
            </Button>
          </div>
        )}
      </div>

      {selectedCase ? (
        <CaseView
          contentRef={contentRef}
          selectedCase={selectedCase}
          exports={exportsByCase[selectedCase.id] || []}
          availableExports={uncategorizedExports}
          activeJobs={activeJobsByCase[selectedCase.id] || []}
          search={search}
          setSelected={setSelected}
          renameClip={onHandleRename}
          setDeleteClip={setDeleteClip}
          onAssignToCase={setExportToAssign}
          onAddExport={() => setCaseForAddExport(selectedCase)}
        />
      ) : (
        <AllExportsView
          contentRef={contentRef}
          search={search}
          cases={filteredCases}
          exports={exports}
          exportsByCase={exportsByCase}
          activeJobs={activeJobsByCase["none"] || []}
          setSelectedCaseId={setSelectedCaseId}
          setSelected={setSelected}
          renameClip={onHandleRename}
          setDeleteClip={setDeleteClip}
          onAssignToCase={setExportToAssign}
        />
      )}
    </div>
  );
}

type AllExportsViewProps = {
  contentRef: MutableRefObject<HTMLDivElement | null>;
  search: string;
  cases?: ExportCase[];
  exports: Export[];
  exportsByCase: { [caseId: string]: Export[] };
  activeJobs: ExportJob[];
  setSelectedCaseId: (id: string) => void;
  setSelected: (e: Export) => void;
  renameClip: (id: string, update: string) => void;
  setDeleteClip: (d: DeleteClipType | undefined) => void;
  onAssignToCase: (e: Export) => void;
};
function AllExportsView({
  contentRef,
  search,
  cases,
  exports,
  exportsByCase,
  activeJobs,
  setSelectedCaseId,
  setSelected,
  renameClip,
  setDeleteClip,
  onAssignToCase,
}: AllExportsViewProps) {
  const { t } = useTranslation(["views/exports"]);

  // Filter

  const filteredCases = useMemo(() => {
    if (!search || !cases) {
      return cases || [];
    }

    return cases.filter(
      (caseItem) =>
        caseItem.name.toLowerCase().includes(search.toLowerCase()) ||
        (caseItem.description &&
          caseItem.description.toLowerCase().includes(search.toLowerCase())),
    );
  }, [search, cases]);

  const filteredExports = useMemo<Export[]>(() => {
    if (!search) {
      return exports;
    }

    return exports.filter((exp) =>
      exp.name
        .toLowerCase()
        .replaceAll("_", " ")
        .includes(search.toLowerCase()),
    );
  }, [exports, search]);

  const filteredActiveJobs = useMemo<ExportJob[]>(() => {
    if (!search) {
      return activeJobs;
    }

    return activeJobs.filter((job) =>
      (job.name || job.camera)
        .toLowerCase()
        .replaceAll("_", " ")
        .includes(search.toLowerCase()),
    );
  }, [activeJobs, search]);

  return (
    <div className="w-full overflow-hidden">
      {filteredCases?.length ||
      filteredActiveJobs.length ||
      filteredExports.length ? (
        <div
          ref={contentRef}
          className="scrollbar-container flex size-full flex-col gap-4 overflow-y-auto"
        >
          {filteredCases.length > 0 && (
            <div className="space-y-2">
              <Heading as="h4">{t("headings.cases")}</Heading>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCases.map((item) => (
                  <CaseCard
                    key={item.id}
                    className=""
                    exportCase={item}
                    exports={exportsByCase[item.id] || []}
                    onSelect={() => {
                      setSelectedCaseId(item.id);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {(filteredActiveJobs.length > 0 || filteredExports.length > 0) && (
            <div className="space-y-4">
              <Heading as="h4">{t("headings.uncategorizedExports")}</Heading>
              <div
                ref={contentRef}
                className="scrollbar-container grid gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {filteredActiveJobs.map((job) => (
                  <ActiveExportJobCard key={job.id} job={job} />
                ))}
                {filteredExports.map((item) => (
                  <ExportCard
                    key={item.name}
                    className=""
                    exportedRecording={item}
                    onSelect={setSelected}
                    onRename={renameClip}
                    onDelete={({ file, exportName }) =>
                      setDeleteClip({ file, exportName })
                    }
                    onAssignToCase={onAssignToCase}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
          <LuFolderX className="size-16" />
          {t("noExports")}
        </div>
      )}
    </div>
  );
}

type CaseViewProps = {
  contentRef: MutableRefObject<HTMLDivElement | null>;
  selectedCase: ExportCase;
  exports?: Export[];
  availableExports: Export[];
  activeJobs: ExportJob[];
  search: string;
  setSelected: (e: Export) => void;
  renameClip: (id: string, update: string) => void;
  setDeleteClip: (d: DeleteClipType | undefined) => void;
  onAssignToCase: (e: Export) => void;
  onAddExport: () => void;
};
function CaseView({
  contentRef,
  selectedCase,
  exports,
  availableExports,
  activeJobs,
  search,
  setSelected,
  renameClip,
  setDeleteClip,
  onAssignToCase,
  onAddExport,
}: CaseViewProps) {
  const { t } = useTranslation(["views/exports", "common"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const timeFormat = useTimeFormat(config);
  const createdAt = useFormattedTimestamp(
    selectedCase.created_at,
    t(`time.formattedTimestampMonthDayYear.${timeFormat}`, { ns: "common" }),
    config?.ui.timezone,
  );

  const filteredExports = useMemo<Export[]>(() => {
    const caseExports = (exports || []).filter(
      (e) => (e.export_case ?? e.export_case_id) == selectedCase.id,
    );

    if (!search) {
      return caseExports;
    }

    return caseExports.filter((exp) =>
      exp.name
        .toLowerCase()
        .replaceAll("_", " ")
        .includes(search.toLowerCase()),
    );
  }, [selectedCase, exports, search]);

  const filteredActiveJobs = useMemo<ExportJob[]>(() => {
    const caseJobs = activeJobs.filter(
      (job) => job.export_case_id === selectedCase.id,
    );

    if (!search) {
      return caseJobs;
    }

    return caseJobs.filter((job) =>
      (job.name || job.camera)
        .toLowerCase()
        .replaceAll("_", " ")
        .includes(search.toLowerCase()),
    );
  }, [activeJobs, search, selectedCase.id]);

  const cameraCount = useMemo(
    () => new Set(filteredExports.map((exp) => exp.camera)).size,
    [filteredExports],
  );

  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const descriptionRef = useRef<HTMLDivElement | null>(null);
  const [descriptionIsClamped, setDescriptionIsClamped] = useState(false);

  useEffect(() => {
    setDescriptionExpanded(false);
  }, [selectedCase.id]);

  useEffect(() => {
    const element = descriptionRef.current;
    if (!element) {
      setDescriptionIsClamped(false);
      return;
    }

    setDescriptionIsClamped(element.scrollHeight > element.clientHeight + 1);
  }, [selectedCase.description, descriptionExpanded]);

  return (
    <div className="flex size-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-2">
        <Heading className="mb-0" as="h2">
          {selectedCase.name}
        </Heading>
        <div className="mb-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{t("caseView.createdAt", { value: createdAt })}</span>
          <span>
            {t("caseView.exportCount", { count: filteredExports.length })}
          </span>
          <span>{t("caseView.cameraCount", { count: cameraCount })}</span>
        </div>
        {selectedCase.description && (
          <div className="mb-2 flex max-w-5xl flex-col items-start gap-1">
            <div
              ref={descriptionRef}
              className={cn(
                "whitespace-pre-wrap text-sm text-secondary-foreground",
                !descriptionExpanded && "line-clamp-3",
              )}
            >
              {selectedCase.description}
            </div>
            {(descriptionIsClamped || descriptionExpanded) && (
              <button
                type="button"
                className="text-xs text-primary-variant underline-offset-2 hover:underline"
                onClick={() => setDescriptionExpanded((prev) => !prev)}
              >
                {descriptionExpanded
                  ? t("caseView.showLess")
                  : t("caseView.showMore")}
              </button>
            )}
          </div>
        )}
      </div>
      {filteredExports.length > 0 || filteredActiveJobs.length > 0 ? (
        <div
          ref={contentRef}
          className="scrollbar-container grid min-h-0 flex-1 content-start gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filteredActiveJobs.map((job) => (
            <ActiveExportJobCard key={job.id} job={job} />
          ))}
          {filteredExports.map((item) => (
            <ExportCard
              key={item.id}
              className=""
              exportedRecording={item}
              onSelect={setSelected}
              onRename={renameClip}
              onDelete={({ file, exportName }) =>
                setDeleteClip({ file, exportName })
              }
              onAssignToCase={onAssignToCase}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[16rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background/40 p-6 text-center">
          <LuFolderX className="size-12" />
          <div className="mt-3 text-lg font-medium">
            {t("caseView.emptyTitle")}
          </div>
          <div className="mt-2 max-w-md text-sm text-muted-foreground">
            {availableExports.length > 0
              ? t("caseView.emptyDescription")
              : t("caseView.emptyDescriptionNoExports")}
          </div>
          {availableExports.length > 0 && (
            <Button className="mt-4" variant="default" onClick={onAddExport}>
              {t("toolbar.addExport")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

type CaseEditorDialogProps = {
  caseDialog?: { mode: "create" | "edit"; exportCase?: ExportCase };
  onClose: () => void;
  onSave: (payload: { name: string; description: string }) => Promise<void>;
};
function CaseEditorDialog({
  caseDialog,
  onClose,
  onSave,
}: CaseEditorDialogProps) {
  const { t } = useTranslation(["views/exports", "common"]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    setName(caseDialog?.exportCase?.name || "");
    setDescription(caseDialog?.exportCase?.description || "");
  }, [caseDialog?.exportCase?.description, caseDialog?.exportCase?.name]);

  return (
    <Dialog
      open={caseDialog != undefined}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent>
        <DialogTitle>
          {caseDialog?.mode === "edit"
            ? t("caseEditor.editTitle")
            : t("caseEditor.createTitle")}
        </DialogTitle>
        <div className="space-y-3">
          <Input
            placeholder={t("caseEditor.namePlaceholder")}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Textarea
            placeholder={t("caseEditor.descriptionPlaceholder")}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {t("button.cancel", { ns: "common" })}
            </Button>
            <Button
              variant="default"
              disabled={name.trim().length === 0}
              onClick={() =>
                void onSave({
                  name: name.trim(),
                  description: description.trim(),
                })
              }
            >
              {caseDialog?.mode === "edit"
                ? t("button.save", { ns: "common" })
                : t("toolbar.newCase")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type CaseAddExportDialogProps = {
  exportCase?: ExportCase;
  availableExports: Export[];
  onClose: () => void;
  onAssign: (exportId: string, caseId: string) => Promise<void>;
};
function CaseAddExportDialog({
  exportCase,
  availableExports,
  onClose,
  onAssign,
}: CaseAddExportDialogProps) {
  const { t } = useTranslation(["views/exports", "common"]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSearch("");
  }, [exportCase?.id]);

  const filteredExports = useMemo(() => {
    if (!search) {
      return availableExports;
    }

    return availableExports.filter((exportItem) =>
      exportItem.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [availableExports, search]);

  return (
    <Dialog
      open={exportCase != undefined}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="max-h-[80dvh] overflow-hidden">
        <DialogTitle>
          {t("addExportDialog.title", { caseName: exportCase?.name })}
        </DialogTitle>
        <div className="space-y-3 overflow-hidden">
          <Input
            placeholder={t("addExportDialog.searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="scrollbar-container max-h-[50dvh] space-y-2 overflow-y-auto">
            {filteredExports.length > 0 ? (
              filteredExports.map((exportItem) => (
                <div
                  key={exportItem.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="min-w-0 pr-4">
                    <div className="truncate font-medium">
                      {exportItem.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {exportItem.camera.replaceAll("_", " ")}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="select"
                    onClick={() => {
                      if (!exportCase) {
                        return;
                      }

                      void onAssign(exportItem.id, exportCase.id).then(onClose);
                    }}
                  >
                    {t("button.add", { ns: "common" })}
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                {t("addExportDialog.empty")}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type CaseAssignmentDialogProps = {
  exportToAssign?: Export;
  cases?: ExportCase[];
  selectedCaseId?: string;
  onClose: () => void;
  mutate: () => void;
};
function CaseAssignmentDialog({
  exportToAssign,
  cases,
  selectedCaseId,
  onClose,
  mutate,
}: CaseAssignmentDialogProps) {
  const { t } = useTranslation(["views/exports"]);
  const caseOptions = useMemo(
    () => [
      ...(cases ?? [])
        .map((c) => ({
          value: c.id,
          label: c.name,
        }))
        .sort((cA, cB) => cA.label.localeCompare(cB.label)),
      {
        value: "new",
        label: t("caseDialog.newCaseOption"),
      },
    ],
    [cases, t],
  );

  const handleSave = useCallback(
    async (caseId: string) => {
      if (!exportToAssign) return;

      try {
        await axios.patch(`export/${exportToAssign.id}/case`, {
          export_case_id: caseId,
        });
        mutate();
        onClose();
      } catch (error: unknown) {
        const apiError = error as {
          response?: { data?: { message?: string; detail?: string } };
        };
        const errorMessage =
          apiError.response?.data?.message ||
          apiError.response?.data?.detail ||
          "Unknown error";
        toast.error(t("toast.error.assignCaseFailed", { errorMessage }), {
          position: "top-center",
        });
      }
    },
    [exportToAssign, mutate, onClose, t],
  );

  const handleCreateNew = useCallback(
    async (name: string, description: string) => {
      if (!exportToAssign) return;

      try {
        const createResp = await axios.post("cases", {
          name,
          description,
        });

        const newCaseId: string | undefined = createResp.data?.id;

        if (newCaseId) {
          await axios.patch(`export/${exportToAssign.id}/case`, {
            export_case_id: newCaseId,
          });
        }

        mutate();
        onClose();
      } catch (error: unknown) {
        const apiError = error as {
          response?: { data?: { message?: string; detail?: string } };
        };
        const errorMessage =
          apiError.response?.data?.message ||
          apiError.response?.data?.detail ||
          "Unknown error";
        toast.error(t("toast.error.assignCaseFailed", { errorMessage }), {
          position: "top-center",
        });
      }
    },
    [exportToAssign, mutate, onClose, t],
  );

  if (!exportToAssign) {
    return null;
  }

  return (
    <OptionAndInputDialog
      open={!!exportToAssign}
      title={t("caseDialog.title")}
      description={t("caseDialog.description")}
      setOpen={(open) => {
        if (!open) {
          onClose();
        }
      }}
      options={caseOptions}
      nameLabel={t("caseDialog.nameLabel")}
      descriptionLabel={t("caseDialog.descriptionLabel")}
      initialValue={selectedCaseId}
      newValueKey="new"
      onSave={handleSave}
      onCreateNew={handleCreateNew}
    />
  );
}

export default Exports;
