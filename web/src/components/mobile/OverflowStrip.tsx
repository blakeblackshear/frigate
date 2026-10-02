import { ReactNode, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HiDotsHorizontal } from "react-icons/hi";
import { IoClose } from "react-icons/io5";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

type OverflowStripProps = {
  className?: string;
  items: ReactNode[];
  activeIndex?: number;
  gapClassName?: string;
  showAllLabel: string;
  showLessLabel: string;
};

// Renders only the items that fully fit and surfaces a kebab next to the last
// visible one. The kebab expands a panel over the nearest positioned ancestor
// that reveals every item.
export default function OverflowStrip({
  className,
  items,
  activeIndex = 0,
  gapClassName = "gap-2",
  showAllLabel,
  showLessLabel,
}: OverflowStripProps) {
  const [expanded, setExpanded] = useState(false);
  // null => all items fit, render them all with no kebab; a number => only
  // that many fit alongside the kebab
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const measure = measureRef.current;

    if (!wrapper || !measure) {
      return;
    }

    const wrapperGap = 4; // gap-1 between the strip and the kebab

    const compute = () => {
      const children = Array.from(measure.children) as HTMLElement[];

      if (children.length === 0) {
        return;
      }

      // the trailing child of the measurement row is a kebab clone
      const kebab = children[children.length - 1];
      const start = children[0].offsetLeft;
      const ends = children
        .slice(0, -1)
        .map((el) => el.offsetLeft + el.offsetWidth - start);
      const available = wrapper.clientWidth;

      if (ends[ends.length - 1] <= available) {
        setVisibleCount(null);
        return;
      }

      const budget = available - kebab.offsetWidth - wrapperGap;
      const count = ends.filter((end) => end <= budget).length;

      setVisibleCount(Math.max(count, 1));
    };

    compute();

    const observer = new ResizeObserver(compute);
    observer.observe(wrapper);

    return () => observer.disconnect();
  }, [items.length, gapClassName]);

  // a selected item past the cut takes the last visible slot
  const visibleItems =
    visibleCount == null
      ? items
      : activeIndex >= visibleCount
        ? [...items.slice(0, visibleCount - 1), items[activeIndex]]
        : items.slice(0, visibleCount);

  return (
    <div
      ref={wrapperRef}
      className={cn("flex min-w-0 items-center gap-1", className)}
    >
      <div
        className={cn(
          "flex min-w-0 items-center overflow-hidden whitespace-nowrap",
          gapClassName,
        )}
      >
        {visibleItems}
      </div>
      {visibleCount != null && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 px-2 text-secondary-foreground"
          aria-label={showAllLabel}
          onClick={() => setExpanded(true)}
        >
          <HiDotsHorizontal className="size-5" />
        </Button>
      )}

      {/* invisible row used only to measure natural item widths so we can
          render exactly the items that fully fit */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-0 w-0 overflow-hidden"
        aria-hidden
        inert
      >
        <div
          ref={measureRef}
          className={cn("flex w-max items-center", gapClassName)}
        >
          {items}
          <Button variant="ghost" size="sm" className="px-2">
            <HiDotsHorizontal className="size-5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setExpanded(false)}
        />
      )}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="overflow-overlay"
            className="absolute inset-x-0 top-0 z-30 bg-background py-1 shadow-lg"
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            exit={{ clipPath: "inset(0 100% 0 0)" }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {/* a tap on any item bubbles up and collapses the panel */}
            <div
              className={cn("flex flex-wrap items-center", gapClassName)}
              onClick={() => setExpanded(false)}
            >
              {items}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto shrink-0 px-2 text-secondary-foreground"
                aria-label={showLessLabel}
              >
                <IoClose className="size-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
