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

  const handlePointerDown = useCallback(
    (index: number) => {
      const adding = !selectedCells.has(index);
      paintingRef.current = { active: true, adding };
      toggleCell(index, adding);
    },
    [selectedCells, toggleCell],
  );

  const handlePointerEnter = useCallback(
    (index: number) => {
      if (!paintingRef.current.active) {
        return;
      }

      toggleCell(index, paintingRef.current.adding);
    },
    [toggleCell],
  );

  const handlePointerUp = useCallback(() => {
    paintingRef.current.active = false;
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
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
          }}
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
                onPointerDown={(e) => {
                  e.preventDefault();
                  handlePointerDown(index);
                }}
                onPointerEnter={() => handlePointerEnter(index)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
