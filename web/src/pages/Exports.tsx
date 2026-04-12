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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import Heading from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  LuFolderPlus,
  LuFolderX,
  LuPencil,
  LuPlus,
  LuTrash2,
} from "react-icons/lu";
import { toast } from "sonner";
import useSWR from "swr";
import ExportActionGroup from "@/components/filter/ExportActionGroup";
import ExportFilterGroup from "@/components/filter/ExportFilterGroup";
import { useIsAdmin } from "@/hooks/use-is-admin";

// always parse these as string arrays
const EXPORT_FILTER_ARRAY_KEYS = ["cameras"];

function Exports() {
  const { t } = useTranslation(["views/exports"]);
  const isAdmin = useIsAdmin();

  useEffect(() => {
    document.title = t("documentTitle");
  }, [t]);

  // Filters

  const [exportFilter, setExportFilter, exportSearchParams] =
    useApiFilterArgs<ExportFilter>(EXPORT_FILTER_ARRAY_KEYS);

  // Data

  const { data: cases, mutate: updateCases } = useSWR<ExportCase[]>("cases");
  const { data: activeExportJobs } = useSWR<ExportJob[]>("jobs/export", {
    refreshInterval: (latestJobs) => ((latestJobs ?? []).length > 0 ? 2000 : 0),
  });
  // Keep polling exports while there are queued/running jobs OR while any
  // existing export is still marked in_progress. Without the second clause,
  // a stale in_progress=true snapshot can stick if the activeExportJobs poll
  // clears before the rawExports poll fires — SWR cancels the pending
  // rawExports refresh and the UI freezes on spinners until a manual reload.
  const { data: rawExports, mutate: updateExports } = useSWR<Export[]>(
    exportSearchParams && Object.keys(exportSearchParams).length > 0
      ? ["exports", exportSearchParams]
      : "exports",
    {
      refreshInterval: (latestExports) => {
        if ((activeExportJobs?.length ?? 0) > 0) {
          return 2000;
        }
        if ((latestExports ?? []).some((exp) => exp.in_progress)) {
          return 2000;
        }
        return 0;
      },
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
    if (!cases) return [];

    const hasCameraFilter =
      exportFilter?.cameras && exportFilter.cameras.length > 0;

    if (!hasCameraFilter) return cases;

    // When a camera filter is active, hide cases that have zero exports
    // and zero active jobs matching the filter — they're just noise.
    return cases.filter(
      (c) =>
        (exportsByCase[c.id]?.length ?? 0) > 0 ||
        (activeJobsByCase[c.id]?.length ?? 0) > 0,
    );
  }, [activeJobsByCase, cases, exportFilter?.cameras, exportsByCase]);

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

  // Bulk selection

  const [selectedExports, setSelectedExports] = useState<Export[]>([]);
  const selectionMode = selectedExports.length > 0;

  // Clear selection when switching views
  useEffect(() => {
    setSelectedExports([]);
  }, [selectedCaseId]);

  const onSelectExport = useCallback(
    (exportItem: Export) => {
      const index = selectedExports.findIndex((e) => e.id === exportItem.id);
      if (index !== -1) {
        if (selectedExports.length === 1) {
          setSelectedExports([]);
        } else {
          setSelectedExports([
            ...selectedExports.slice(0, index),
            ...selectedExports.slice(index + 1),
          ]);
        }
      } else {
        setSelectedExports([...selectedExports, exportItem]);
      }
    },
    [selectedExports],
  );

  const onSelectAllExports = useCallback(() => {
    const currentExports = selectedCaseId
      ? exportsByCase[selectedCaseId] || []
      : exports;
    const visibleExports = currentExports.filter((e) => {
      if (e.in_progress) return false;
      if (!search) return true;
      return e.name
        .toLowerCase()
        .replaceAll("_", " ")
        .includes(search.toLowerCase());
    });
    if (selectedExports.length < visibleExports.length) {
      setSelectedExports(visibleExports);
    } else {
      setSelectedExports([]);
    }
  }, [selectedCaseId, exportsByCase, exports, search, selectedExports]);

  // Modifying

  const [deleteClip, setDeleteClip] = useState<DeleteClipType | undefined>();
  const [exportToAssign, setExportToAssign] = useState<Export | undefined>();
  const [caseDialog, setCaseDialog] = useState<
    { mode: "create" | "edit"; exportCase?: ExportCase } | undefined
  >();
  const [caseToDelete, setCaseToDelete] = useState<ExportCase | undefined>();
  const [deleteExportsWithCase, setDeleteExportsWithCase] = useState(false);
  const [caseForAddExport, setCaseForAddExport] = useState<
    ExportCase | undefined
  >();

  const onHandleDelete = useCallback(() => {
    if (!deleteClip) {
      return;
    }

    axios
      .post("exports/delete", { ids: [deleteClip.file] })
      .then((response) => {
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
  useKeyboardListener(
    ["a", "Escape"],
    (key, modifiers) => {
      if (!modifiers.down) return true;

      switch (key) {
        case "a":
          if (modifiers.ctrl && !modifiers.repeat) {
            onSelectAllExports();
            return true;
          }
          break;
        case "Escape":
          setSelectedExports([]);
          return true;
      }

      return false;
    },
    contentRef,
  );

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
      await axios.delete(`cases/${caseToDelete.id}`, {
        params: deleteExportsWithCase ? { delete_exports: true } : undefined,
      });
      if (selectedCaseId === caseToDelete.id) {
        setSelectedCaseId(undefined);
      }
      setCaseToDelete(undefined);
      setDeleteExportsWithCase(false);
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
  }, [caseToDelete, deleteExportsWithCase, mutate, selectedCaseId, t]);

  const handleRemoveExportFromCase = useCallback(
    async (exportedRecording: Export) => {
      try {
        await axios.post("exports/reassign", {
          ids: [exportedRecording.id],
          export_case_id: null,
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
        mutate={mutate}
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
        onOpenChange={(open) => {
          if (!open) {
            setCaseToDelete(undefined);
            setDeleteExportsWithCase(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteCase.label")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteCase.desc", {
                caseName: caseToDelete?.name,
              })}{" "}
              {deleteExportsWithCase
                ? t("deleteCase.descDeleteExports")
                : t("deleteCase.descKeepExports")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center justify-start gap-6">
            <Label
              htmlFor="delete-exports-switch"
              className="cursor-pointer text-sm"
            >
              {t("deleteCase.deleteExports")}
            </Label>
            <Switch
              id="delete-exports-switch"
              checked={deleteExportsWithCase}
              onCheckedChange={setDeleteExportsWithCase}
            />
          </div>
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
          "flex w-full flex-col items-start space-y-2 md:mb-2 lg:relative lg:h-10 lg:flex-row lg:items-center lg:space-y-0",
          isMobileOnly && "mb-2 h-auto flex-wrap gap-2 space-y-0",
        )}
      >
        {selectionMode ? (
          <ExportActionGroup
            selectedExports={selectedExports}
            setSelectedExports={setSelectedExports}
            context={selectedCase ? "case" : "uncategorized"}
            cases={cases}
            currentCaseId={selectedCaseId}
            mutate={mutate}
          />
        ) : (
          <>
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
              <div className="flex w-full items-center justify-end gap-2">
                <ExportFilterGroup
                  className="justify-start"
                  filter={exportFilter}
                  filters={["cameras"]}
                  onUpdateFilter={setExportFilter}
                />
                {isAdmin && (
                  <Button
                    className="flex items-center gap-2.5 rounded-lg"
                    variant="default"
                    size="sm"
                    onClick={() => setCaseDialog({ mode: "create" })}
                  >
                    <LuFolderPlus className="text-secondary-foreground" />
                    <div className="text-primary">{t("toolbar.newCase")}</div>
                  </Button>
                )}
              </div>
            )}
            {selectedCase && (
              <div className="flex w-full items-center justify-end gap-2">
                <ExportFilterGroup
                  className="justify-start"
                  filter={exportFilter}
                  filters={["cameras"]}
                  onUpdateFilter={setExportFilter}
                />
                {isAdmin && (
                  <div className="flex items-center gap-1 md:gap-2">
                    <Button
                      className="flex items-center gap-2 p-2"
                      size="sm"
                      aria-label={t("toolbar.addExport")}
                      onClick={() => setCaseForAddExport(selectedCase)}
                    >
                      <LuPlus className="text-secondary-foreground" />
                      {!isMobile && (
                        <div className="text-primary">
                          {t("toolbar.addExport")}
                        </div>
                      )}
                    </Button>
                    <Button
                      className="flex items-center gap-2 p-2"
                      size="sm"
                      aria-label={t("toolbar.editCase")}
                      onClick={() =>
                        setCaseDialog({
                          mode: "edit",
                          exportCase: selectedCase,
                        })
                      }
                    >
                      <LuPencil className="text-secondary-foreground" />
                      {!isMobile && (
                        <div className="text-primary">
                          {t("toolbar.editCase")}
                        </div>
                      )}
                    </Button>
                    <Button
                      className="flex items-center gap-2 p-2"
                      size="sm"
                      aria-label={t("toolbar.deleteCase")}
                      onClick={() => setCaseToDelete(selectedCase)}
                    >
                      <LuTrash2 className="text-secondary-foreground" />
                      {!isMobile && (
                        <div className="text-primary">
                          {t("toolbar.deleteCase")}
                        </div>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
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
          selectedExports={selectedExports}
          selectionMode={selectionMode}
          onSelectExport={onSelectExport}
          setSelected={setSelected}
          renameClip={onHandleRename}
          setDeleteClip={setDeleteClip}
          onAssignToCase={setExportToAssign}
          onRemoveFromCase={handleRemoveExportFromCase}
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
          selectedExports={selectedExports}
          selectionMode={selectionMode}
          onSelectExport={onSelectExport}
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
  selectedExports: Export[];
  selectionMode: boolean;
  onSelectExport: (e: Export) => void;
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
  selectedExports,
  selectionMode,
  onSelectExport,
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
                    isSelected={selectedExports.some((e) => e.id === item.id)}
                    selectionMode={selectionMode}
                    onContextSelect={onSelectExport}
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
  selectedExports: Export[];
  selectionMode: boolean;
  onSelectExport: (e: Export) => void;
  setSelected: (e: Export) => void;
  renameClip: (id: string, update: string) => void;
  setDeleteClip: (d: DeleteClipType | undefined) => void;
  onAssignToCase: (e: Export) => void;
  onRemoveFromCase: (e: Export) => void;
  onAddExport: () => void;
};
function CaseView({
  contentRef,
  selectedCase,
  exports,
  availableExports,
  activeJobs,
  search,
  selectedExports,
  selectionMode,
  onSelectExport,
  setSelected,
  renameClip,
  setDeleteClip,
  onAssignToCase,
  onRemoveFromCase,
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
              isSelected={selectedExports.some((e) => e.id === item.id)}
              selectionMode={selectionMode}
              onContextSelect={onSelectExport}
              onSelect={setSelected}
              onRename={renameClip}
              onDelete={({ file, exportName }) =>
                setDeleteClip({ file, exportName })
              }
              onAssignToCase={onAssignToCase}
              onRemoveFromCase={onRemoveFromCase}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[16rem] flex-col items-center justify-center p-6 text-center">
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
              variant="select"
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
  mutate: () => void;
};
function CaseAddExportDialog({
  exportCase,
  availableExports,
  onClose,
  mutate,
}: CaseAddExportDialogProps) {
  const { t } = useTranslation(["views/exports", "common"]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Reset dialog state whenever the target case changes or the dialog reopens.
  useEffect(() => {
    setSearch("");
    setSelectedIds([]);
    setIsAdding(false);
  }, [exportCase?.id]);

  const filteredExports = useMemo(() => {
    const completedExports = availableExports.filter(
      (exportItem) => !exportItem.in_progress,
    );

    if (!search) {
      return completedExports;
    }

    return completedExports.filter((exportItem) =>
      exportItem.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [availableExports, search]);

  const toggleSelection = useCallback((exportId: string) => {
    setSelectedIds((previous) =>
      previous.includes(exportId)
        ? previous.filter((id) => id !== exportId)
        : [...previous, exportId],
    );
  }, []);

  const handleAdd = useCallback(async () => {
    if (!exportCase || selectedIds.length === 0 || isAdding) {
      return;
    }

    setIsAdding(true);
    try {
      await axios.post("exports/reassign", {
        ids: selectedIds,
        export_case_id: exportCase.id,
      });
      mutate();
      onClose();
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
    } finally {
      setIsAdding(false);
    }
  }, [exportCase, isAdding, mutate, onClose, selectedIds, t]);

  return (
    <Dialog
      open={exportCase != undefined}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="flex max-h-[80dvh] flex-col overflow-hidden">
        <DialogTitle>
          {t("addExportDialog.title", { caseName: exportCase?.name })}
        </DialogTitle>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <Input
            placeholder={t("addExportDialog.searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="scrollbar-container min-h-0 flex-1 space-y-2 overflow-y-auto py-1 pr-1">
            {filteredExports.length > 0 ? (
              filteredExports.map((exportItem) => {
                const isSelected = selectedIds.includes(exportItem.id);
                return (
                  <button
                    key={exportItem.id}
                    type="button"
                    aria-pressed={isSelected}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                      isSelected
                        ? "border-selected bg-selected/10 ring-1 ring-selected"
                        : "border-transparent bg-secondary/40 hover:bg-secondary/70",
                    )}
                    onClick={() => toggleSelection(exportItem.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-primary">
                        {exportItem.name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {exportItem.camera.replaceAll("_", " ")}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                {t("addExportDialog.empty")}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="flex-row justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("button.cancel", { ns: "common" })}
          </Button>
          <Button
            variant="select"
            size="sm"
            disabled={selectedIds.length === 0 || isAdding}
            onClick={() => void handleAdd()}
          >
            {isAdding
              ? t("addExportDialog.adding")
              : t("addExportDialog.addButton", {
                  count: selectedIds.length || 1,
                })}
          </Button>
        </DialogFooter>
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
        await axios.post("exports/reassign", {
          ids: [exportToAssign.id],
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
        throw error;
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
          await axios.post("exports/reassign", {
            ids: [exportToAssign.id],
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
        throw error;
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
