import { baseUrl } from "@/api/baseUrl";
import { CaseCard, ExportCard } from "@/components/card/ExportCard";
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
import { Toaster } from "@/components/ui/sonner";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { useSearchEffect } from "@/hooks/use-overlay-state";
import { useHistoryBack } from "@/hooks/use-history-back";
import { useApiFilterArgs } from "@/hooks/use-api-filter";
import { cn } from "@/lib/utils";
import {
  DeleteClipType,
  Export,
  ExportCase,
  ExportFilter,
} from "@/types/export";
import OptionAndInputDialog from "@/components/overlay/dialog/OptionAndInputDialog";
import axios from "axios";

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
  const { data: rawExports, mutate: updateExports } = useSWR<Export[]>(
    exportSearchParams && Object.keys(exportSearchParams).length > 0
      ? ["exports", exportSearchParams]
      : "exports",
  );

  const exportsByCase = useMemo<{ [caseId: string]: Export[] }>(() => {
    const grouped: { [caseId: string]: Export[] } = {};
    (rawExports ?? []).forEach((exp) => {
      const caseId = exp.export_case || "none";
      if (!grouped[caseId]) {
        grouped[caseId] = [];
      }

      grouped[caseId].push(exp);
    });
    return grouped;
  }, [rawExports]);

  const filteredCases = useMemo<ExportCase[]>(() => {
    if (!cases) {
      return [];
    }

    return cases.filter((caseItem) => {
      const caseExports = exportsByCase[caseItem.id];
      return caseExports?.length;
    });
  }, [cases, exportsByCase]);

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
    () => filteredCases?.find((c) => c.id === selectedCaseId),
    [filteredCases, selectedCaseId],
  );

  const resetCaseDialog = useCallback(() => {
    setExportToAssign(undefined);
  }, []);

  return (
    <div className="flex size-full flex-col gap-2 overflow-hidden px-1 pt-2 md:p-2">
      <Toaster closeButton={true} />

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
            <AlertDialogTitle>{t("deleteExport")}</AlertDialogTitle>
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
        <div className="w-full">
          <Input
            className="text-md w-full bg-muted md:w-1/2"
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ExportFilterGroup
          className="w-full justify-between md:justify-start lg:justify-end"
          filter={exportFilter}
          filters={["cameras"]}
          onUpdateFilter={setExportFilter}
        />
      </div>

      {selectedCase ? (
        <CaseView
          contentRef={contentRef}
          selectedCase={selectedCase}
          exports={exportsByCase[selectedCase.id] || []}
          search={search}
          setSelected={setSelected}
          renameClip={onHandleRename}
          setDeleteClip={setDeleteClip}
          onAssignToCase={setExportToAssign}
        />
      ) : (
        <AllExportsView
          contentRef={contentRef}
          search={search}
          cases={filteredCases}
          exports={exports}
          exportsByCase={exportsByCase}
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

  return (
    <div className="w-full overflow-hidden">
      {filteredCases?.length || filteredExports.length ? (
        <div
          ref={contentRef}
          className="scrollbar-container flex size-full flex-col gap-4 overflow-y-auto"
        >
          {filteredCases.length > 0 && (
            <div className="space-y-2">
              <Heading as="h4">{t("headings.cases")}</Heading>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cases?.map((item) => (
                  <CaseCard
                    key={item.id}
                    className={
                      search == "" || filteredCases?.includes(item)
                        ? ""
                        : "hidden"
                    }
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

          {filteredExports.length > 0 && (
            <div className="space-y-4">
              <Heading as="h4">{t("headings.uncategorizedExports")}</Heading>
              <div
                ref={contentRef}
                className="scrollbar-container grid gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {exports.map((item) => (
                  <ExportCard
                    key={item.name}
                    className={
                      search == "" || filteredExports.includes(item)
                        ? ""
                        : "hidden"
                    }
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
  search: string;
  setSelected: (e: Export) => void;
  renameClip: (id: string, update: string) => void;
  setDeleteClip: (d: DeleteClipType | undefined) => void;
  onAssignToCase: (e: Export) => void;
};
function CaseView({
  contentRef,
  selectedCase,
  exports,
  search,
  setSelected,
  renameClip,
  setDeleteClip,
  onAssignToCase,
}: CaseViewProps) {
  const filteredExports = useMemo<Export[]>(() => {
    const caseExports = (exports || []).filter(
      (e) => e.export_case == selectedCase.id,
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

  return (
    <div className="flex size-full flex-col gap-8 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-1">
        <Heading className="capitalize" as="h2">
          {selectedCase.name}
        </Heading>
        <div className="text-secondary-foreground">
          {selectedCase.description}
        </div>
      </div>
      <div
        ref={contentRef}
        className="scrollbar-container grid min-h-0 flex-1 content-start gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {exports?.map((item) => (
          <ExportCard
            key={item.name}
            className={filteredExports.includes(item) ? "" : "hidden"}
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