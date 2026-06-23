import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuTrash2 } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LocalAnnotation, LocalDatasetItem } from "@/types/localDataset";
import { baseUrl } from "@/api/baseUrl";
import { cn } from "@/lib/utils";

type Box = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
};

type Props = {
  item: LocalDatasetItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, annotations: LocalAnnotation[]) => void;
};

export function LocalDatasetAnnotatorDialog({
  item,
  open,
  onClose,
  onSave,
}: Props) {
  const { t } = useTranslation("views/localDataset");

  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [dragCurrent, setDragCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [imgSize, setImgSize] = useState<{
    w: number;
    h: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset when item changes
  useEffect(() => {
    if (!item) return;
    setBoxes(
      item.annotations.map((a) => ({
        x: a.x,
        y: a.y,
        w: a.w,
        h: a.h,
        label: a.label,
      })),
    );
    setSelectedIdx(null);
    setLabelInput("");
    setDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  }, [item]);

  // Update label input when selection changes
  useEffect(() => {
    if (selectedIdx !== null && boxes[selectedIdx]) {
      setLabelInput(boxes[selectedIdx].label);
    } else {
      setLabelInput("");
    }
  }, [selectedIdx, boxes]);

  const measureImage = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    setImgSize({
      w: rect.width,
      h: rect.height,
      offsetX: rect.left,
      offsetY: rect.top,
    });
  }, []);

  // Convert client coords to relative (0-1) coords within image
  const toRelative = useCallback(
    (clientX: number, clientY: number) => {
      if (!imgSize) return null;
      const rx = (clientX - imgSize.offsetX) / imgSize.w;
      const ry = (clientY - imgSize.offsetY) / imgSize.h;
      return {
        x: Math.min(1, Math.max(0, rx)),
        y: Math.min(1, Math.max(0, ry)),
      };
    },
    [imgSize],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      measureImage();
      const rel = toRelative(e.clientX, e.clientY);
      if (!rel) return;
      setDragging(true);
      setDragStart(rel);
      setDragCurrent(rel);
      setSelectedIdx(null);
    },
    [measureImage, toRelative],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const rel = toRelative(e.clientX, e.clientY);
      if (!rel) return;
      setDragCurrent(rel);
    },
    [dragging, toRelative],
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !dragStart) return;
      const rel = toRelative(e.clientX, e.clientY);
      if (!rel) {
        setDragging(false);
        return;
      }

      const x = Math.min(dragStart.x, rel.x);
      const y = Math.min(dragStart.y, rel.y);
      const w = Math.abs(rel.x - dragStart.x);
      const h = Math.abs(rel.y - dragStart.y);

      setDragging(false);
      setDragStart(null);
      setDragCurrent(null);

      // Ignore tiny boxes (accidental clicks)
      if (w < 0.01 || h < 0.01) return;

      const newBox: Box = { x, y, w, h, label: item?.label ?? "" };
      setBoxes((prev) => {
        const next = [...prev, newBox];
        setSelectedIdx(next.length - 1);
        return next;
      });
    },
    [dragging, dragStart, item?.label, toRelative],
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedIdx === null) return;
    setBoxes((prev) => prev.filter((_, i) => i !== selectedIdx));
    setSelectedIdx(null);
  }, [selectedIdx]);

  const handleLabelChange = useCallback(
    (value: string) => {
      setLabelInput(value);
      if (selectedIdx !== null) {
        setBoxes((prev) =>
          prev.map((b, i) => (i === selectedIdx ? { ...b, label: value } : b)),
        );
      }
    },
    [selectedIdx],
  );

  const handleSave = useCallback(() => {
    if (!item) return;
    onSave(
      item.id,
      boxes.map((b) => ({ label: b.label, x: b.x, y: b.y, w: b.w, h: b.h })),
    );
  }, [item, boxes, onSave]);

  if (!item) return null;

  const imageUrl = `${baseUrl}api/local_dataset/${item.id}/image.jpg`;

  // Current drag preview rect
  let previewBox: Box | null = null;
  if (dragging && dragStart && dragCurrent) {
    previewBox = {
      x: Math.min(dragStart.x, dragCurrent.x),
      y: Math.min(dragStart.y, dragCurrent.y),
      w: Math.abs(dragCurrent.x - dragStart.x),
      h: Math.abs(dragCurrent.y - dragStart.y),
      label: "",
    };
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[95dvh] w-full max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("annotator.title")}</DialogTitle>
          <DialogDescription>{t("annotator.instructions")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 md:flex-row">
          {/* Canvas area */}
          <div
            ref={containerRef}
            className="relative flex-1 select-none overflow-hidden rounded-lg border border-secondary"
            style={{ cursor: "crosshair" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              className="block w-full object-contain"
              alt={t("annotator.imageAlt")}
              onLoad={measureImage}
              draggable={false}
            />

            {/* Render saved boxes */}
            {boxes.map((box, idx) => (
              <div
                key={idx}
                className={cn(
                  "absolute border-2",
                  idx === selectedIdx
                    ? "border-selected"
                    : "border-green-400",
                )}
                style={{
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.w * 100}%`,
                  height: `${box.h * 100}%`,
                  pointerEvents: "none",
                }}
              >
                {box.label && (
                  <span
                    className={cn(
                      "absolute left-0 top-0 px-1 text-xs text-white",
                      idx === selectedIdx ? "bg-selected" : "bg-green-500",
                    )}
                  >
                    {box.label}
                  </span>
                )}
              </div>
            ))}

            {/* Drag preview */}
            {previewBox && (
              <div
                className="pointer-events-none absolute border-2 border-dashed border-white"
                style={{
                  left: `${previewBox.x * 100}%`,
                  top: `${previewBox.y * 100}%`,
                  width: `${previewBox.w * 100}%`,
                  height: `${previewBox.h * 100}%`,
                }}
              />
            )}

            {/* Click-to-select overlay */}
            {boxes.map((box, idx) => (
              <div
                key={`sel-${idx}`}
                className="absolute"
                style={{
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.w * 100}%`,
                  height: `${box.h * 100}%`,
                  cursor: "pointer",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIdx(idx);
                }}
              />
            ))}
          </div>

          {/* Sidebar controls */}
          <div className="flex w-full flex-col gap-3 md:w-56">
            {selectedIdx !== null ? (
              <>
                <div className="text-sm font-medium">
                  {t("annotator.addLabel")}
                </div>
                <Input
                  value={labelInput}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder={t("annotator.labelPlaceholder")}
                  autoFocus
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-2"
                >
                  <LuTrash2 className="size-4" />
                  {t("annotator.deleteSelected")}
                </Button>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                {t("annotator.noBoxSelected")}
              </div>
            )}

            <div className="mt-auto text-xs text-muted-foreground">
              {boxes.length > 0
                ? t("image.annotations", { count: boxes.length })
                : t("image.noAnnotations")}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("annotator.cancel")}
          </Button>
          <Button onClick={handleSave}>{t("annotator.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
