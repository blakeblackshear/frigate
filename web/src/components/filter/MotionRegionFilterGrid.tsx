import { baseUrl } from "@/api/baseUrl";
import { useCallback, useRef } from "react";

const GRID_SIZE = 16;

type MotionRegionFilterGridProps = {
  cameraName: string;
  selectedCells: Set<number>;
  onCellsChange: (cells: Set<number>) => void;
};

export default function MotionRegionFilterGrid({
  cameraName,
  selectedCells,
  onCellsChange,
}: MotionRegionFilterGridProps) {
  const paintingRef = useRef<{ active: boolean; adding: boolean }>({
    active: false,
    adding: true,
  });
  const lastCellRef = useRef<number>(-1);
  const gridRef = useRef<HTMLDivElement>(null);

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
        className="relative aspect-video w-full select-none overflow-hidden rounded-lg"
        style={{ touchAction: "none" }}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img
          src={`${baseUrl}api/${cameraName}/latest.jpg?h=500`}
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
