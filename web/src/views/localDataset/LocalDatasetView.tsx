import ActivityIndicator from "@/components/indicators/activity-indicator";
import { EmptyCard } from "@/components/card/EmptyCard";
import { LocalDatasetAnnotatorDialog } from "@/components/overlay/dialog/LocalDatasetAnnotatorDialog";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LocalAnnotation, LocalDatasetItem } from "@/types/localDataset";
import { baseUrl } from "@/api/baseUrl";
import axios from "axios";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuChevronDown,
  LuDatabase,
  LuDownload,
  LuPencil,
  LuTrash2,
} from "react-icons/lu";
import { toast } from "sonner";
import useSWR from "swr";

const PAGE_SIZE = 48;

type FilterState = {
  annotated: boolean | undefined;
  label: string | undefined;
  camera: string | undefined;
};

function buildQueryString(
  filter: FilterState,
  offset: number,
  limit: number,
): string {
  const params = new URLSearchParams();
  if (filter.annotated !== undefined)
    params.set("annotated", String(filter.annotated));
  if (filter.label) params.set("label", filter.label);
  if (filter.camera) params.set("camera", filter.camera);
  params.set("offset", String(offset));
  params.set("limit", String(limit));
  return params.toString();
}

export default function LocalDatasetView() {
  const { t } = useTranslation("views/localDataset");

  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<FilterState>({
    annotated: undefined,
    label: undefined,
    camera: undefined,
  });

  const swrKey = useMemo(
    () => `local_dataset?${buildQueryString(filter, offset, PAGE_SIZE)}`,
    [filter, offset],
  );

  const { data, isLoading, mutate } = useSWR<{
    total: number;
    items: LocalDatasetItem[];
  }>(swrKey);

  const [annotateTarget, setAnnotateTarget] = useState<LocalDatasetItem | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Derive unique labels and cameras for filters
  const { data: allData } = useSWR<{ total: number; items: LocalDatasetItem[] }>(
    `local_dataset?limit=1000&offset=0`,
  );

  const labels = useMemo(() => {
    if (!allData) return [];
    const set = new Set<string>();
    allData.items.forEach((item) => {
      if (item.label) set.add(item.label);
    });
    return [...set].sort();
  }, [allData]);

  const cameras = useMemo(() => {
    if (!allData) return [];
    const set = new Set<string>();
    allData.items.forEach((item) => {
      if (item.camera) set.add(item.camera);
    });
    return [...set].sort();
  }, [allData]);

  const handleSaveAnnotations = useCallback(
    async (id: string, annotations: LocalAnnotation[]) => {
      try {
        await axios.put(`local_dataset/${id}/annotations`, { annotations });
        toast.success(t("toast.saved"), { position: "top-center" });
        setAnnotateTarget(null);
        mutate();
      } catch (err) {
        const msg =
          axios.isAxiosError(err)
            ? (err.response?.data?.message ?? err.message)
            : String(err);
        toast.error(t("toast.saveFailed", { errorMessage: msg }), {
          position: "top-center",
        });
      }
    },
    [mutate, t],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await axios.delete(`local_dataset/${id}`);
        toast.success(t("toast.deleted"), { position: "top-center" });
        setDeleteTarget(null);
        mutate();
      } catch (err) {
        const msg =
          axios.isAxiosError(err)
            ? (err.response?.data?.message ?? err.message)
            : String(err);
        toast.error(t("toast.deleteFailed", { errorMessage: msg }), {
          position: "top-center",
        });
      }
    },
    [mutate, t],
  );

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const shown = offset + items.length;

  if (isLoading && !data) {
    return (
      <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
    );
  }

  return (
    <div className="flex size-full flex-col p-2">
      <Toaster />

      {/* Annotator dialog */}
      <LocalDatasetAnnotatorDialog
        item={annotateTarget}
        open={annotateTarget !== null}
        onClose={() => setAnnotateTarget(null)}
        onSave={handleSaveAnnotations}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("button.deleteImage")}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            {t("empty.description")}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("annotator.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              {t("button.deleteImage")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toolbar */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Annotated filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex gap-1">
                {filter.annotated === undefined
                  ? t("filter.all")
                  : filter.annotated
                    ? t("filter.annotated")
                    : t("filter.unannotated")}
                <LuChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() =>
                  setFilter((f) => ({ ...f, annotated: undefined }))
                }
              >
                {t("filter.all")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setFilter((f) => ({ ...f, annotated: true }))
                }
              >
                {t("filter.annotated")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setFilter((f) => ({ ...f, annotated: false }))
                }
              >
                {t("filter.unannotated")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Label filter */}
          {labels.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex gap-1">
                  {filter.label ?? t("filter.label")}
                  <LuChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() =>
                    setFilter((f) => ({ ...f, label: undefined }))
                  }
                >
                  {t("filter.all")}
                </DropdownMenuItem>
                {labels.map((lbl) => (
                  <DropdownMenuItem
                    key={lbl}
                    onClick={() => setFilter((f) => ({ ...f, label: lbl }))}
                  >
                    {lbl}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Camera filter */}
          {cameras.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex gap-1">
                  {filter.camera ?? t("filter.camera")}
                  <LuChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() =>
                    setFilter((f) => ({ ...f, camera: undefined }))
                  }
                >
                  {t("filter.all")}
                </DropdownMenuItem>
                {cameras.map((cam) => (
                  <DropdownMenuItem
                    key={cam}
                    onClick={() => setFilter((f) => ({ ...f, camera: cam }))}
                  >
                    {cam}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-2">
          {total > 0 && (
            <span className="text-sm text-muted-foreground">
              {t("stats.showing", { shown, total })}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex gap-1"
            onClick={() => {
              window.open(
                `${baseUrl}api/local_dataset/export/coco.zip`,
                "_blank",
              );
            }}
          >
            <LuDownload className="size-4" />
            {t("button.export")}
          </Button>
        </div>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <EmptyCard
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center text-center"
          icon={<LuDatabase className="size-16" />}
          title={t("empty.title")}
          description={t("empty.description")}
        />
      ) : (
        <>
          <div className="scrollbar-container grid grid-cols-2 gap-3 overflow-y-scroll p-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
            {items.map((item) => (
              <DatasetImageCard
                key={item.id}
                item={item}
                onAnnotate={() => setAnnotateTarget(item)}
                onDelete={() => setDeleteTarget(item.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                {t("pagination.previous.title", { ns: "common" })}
              </Button>
              <span className="text-sm text-muted-foreground">
                {Math.floor(offset / PAGE_SIZE) + 1} /{" "}
                {Math.ceil(total / PAGE_SIZE)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                {t("pagination.next.title", { ns: "common" })}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

type DatasetImageCardProps = {
  item: LocalDatasetItem;
  onAnnotate: () => void;
  onDelete: () => void;
};

function DatasetImageCard({ item, onAnnotate, onDelete }: DatasetImageCardProps) {
  const { t } = useTranslation("views/localDataset");
  const thumbUrl = `${baseUrl}api/local_dataset/${item.id}/thumbnail.jpg`;
  const annotationCount = item.annotations.length;

  return (
    <div className="group relative overflow-hidden rounded-lg border border-secondary bg-background_alt">
      <img
        src={thumbUrl}
        className="aspect-square w-full object-cover"
        alt={item.label ?? "dataset image"}
        loading="lazy"
      />

      {/* Overlay on hover */}
      <div className="absolute inset-0 flex flex-col justify-between bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex justify-end gap-1 p-1">
          <button
            onClick={onAnnotate}
            className="rounded bg-selected p-1 text-white hover:bg-selected/80"
            title={t("button.annotate")}
          >
            <LuPencil className="size-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded bg-destructive p-1 text-white hover:bg-destructive/80"
            title={t("button.deleteImage")}
          >
            <LuTrash2 className="size-4" />
          </button>
        </div>

        <div className="p-1 text-xs text-white">
          {item.camera && (
            <div className="truncate">{item.camera}</div>
          )}
          {item.label && (
            <div className="truncate smart-capitalize">{item.label}</div>
          )}
          <div>
            {annotationCount > 0
              ? t("image.annotations_other", { count: annotationCount })
              : t("image.noAnnotations")}
          </div>
        </div>
      </div>

      {/* Annotation count badge */}
      {annotationCount > 0 && (
        <div className="absolute left-1 top-1 rounded bg-selected px-1 text-xs text-white group-hover:hidden">
          {annotationCount}
        </div>
      )}
    </div>
  );
}
