import { baseUrl } from "@/api/baseUrl";
import { CameraConfig } from "@/types/frigateConfig";
import { useCallback, useMemo, useRef } from "react";

const GRID_SIZE = 16;
const DEFAULT_ASPECT_RATIO = 16 / 9;
// Cap how tall the grid can get for portrait and 4:3 cameras
const MAX_GRID_HEIGHT = "65dvh";

type MotionRegionFilterGridProps = {
  camera: CameraConfig;
  selectedCells: Set<number>;
  onCellsChange: (cells: Set<number>) => void;
};

export default function MotionRegionFilterGrid({
  camera,
  selectedCells,
  onCellsChange,
}: MotionRegionFilterGridProps) {
  const paintingRef = useRef<{ active: boolean; adding: boolean }>({
    active: false,
    adding: true,
  });
  const lastCellRef = useRef<number>(-1);
  const gridRef = useRef<HTMLDivElement>(null);

  // Cells are indexed against the detect frame, so the grid has to match the
  // frame's aspect ratio or painted cells land on the wrong part of the image
  const aspectRatio = useMemo(() => {
    if (!camera.detect.width || !camera.detect.height) {
      return DEFAULT_ASPECT_RATIO;
    }

    const ratio = camera.detect.width / camera.detect.height;

    return Number.isFinite(ratio) && ratio > 0 ? ratio : DEFAULT_ASPECT_RATIO;
  }, [camera.detect.height, camera.detect.width]);

  const toggleCell = useCallback(
    (index: number, forceAdd?: boolean) => {
      const next = new Set(selectedCells);

      if (forceAdd !== undefined) {
        if (forceAdd) {
          next.add(index);
        } else {
          next.delete(index);
        }
      } else if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }

      onCellsChange(next);
    },
    [selectedCells, onCellsChange],
  );

  const getCellFromPoint = useCallback(
    (clientX: number, clientY: number): number | null => {
      const grid = gridRef.current;

      if (!grid) {
        return null;
      }

      const rect = grid.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
        return null;
      }

      const col = Math.floor((x / rect.width) * GRID_SIZE);
      const row = Math.floor((y / rect.height) * GRID_SIZE);

      return row * GRID_SIZE + col;
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const index = getCellFromPoint(e.clientX, e.clientY);

      if (index === null) {
        return;
      }

      const adding = !selectedCells.has(index);
      paintingRef.current = { active: true, adding };
      lastCellRef.current = index;
      toggleCell(index, adding);
    },
    [selectedCells, toggleCell, getCellFromPoint],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!paintingRef.current.active) {
        return;
      }

      const index = getCellFromPoint(e.clientX, e.clientY);

      if (index === null || index === lastCellRef.current) {
        return;
      }

      lastCellRef.current = index;
      toggleCell(index, paintingRef.current.adding);
    },
    [toggleCell, getCellFromPoint],
  );

  const handlePointerUp = useCallback(() => {
    paintingRef.current.active = false;
    lastCellRef.current = -1;
  }, []);

  return (
    <div className="space-y-2">
      <div
        className="relative mx-auto select-none overflow-hidden rounded-lg"
        style={{
          aspectRatio,
          width: `min(100%, calc(${MAX_GRID_HEIGHT} * ${aspectRatio}))`,
          touchAction: "none",
        }}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img
          src={`${baseUrl}api/${camera.name}/latest.jpg?h=500`}
          className="absolute inset-0 size-full object-contain"
          draggable={false}
          alt=""
        />
        <div
          ref={gridRef}
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
            const isSelected = selectedCells.has(index);
            return (
              <div
                key={index}
                className={
                  isSelected
                    ? "border border-severity_alert/60 bg-severity_alert/40"
                    : "border border-transparent hover:bg-white/20"
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
