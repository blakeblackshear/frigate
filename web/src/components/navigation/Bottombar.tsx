import NavItem from "./NavItem";
import { IoIosWarning } from "react-icons/io";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import useSWR from "swr";
import { FrigateStats } from "@/types/stats";
import { useEmbeddingsReindexProgress, useFrigateStats } from "@/api/ws";
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useStats from "@/hooks/use-stats";
import GeneralSettings from "../menu/GeneralSettings";
import useNavigation from "@/hooks/use-navigation";
import {
  StatusBarMessagesContext,
  StatusMessage,
} from "@/context/statusbar-provider";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { isMobile } from "react-device-detect";
import { isPWA } from "@/utils/isPWA";
import { useTranslation } from "react-i18next";

function Bottombar() {
  const navItems = useNavigation("secondary");

  // Render 48px touch targets when they fit with even spacing, otherwise fall
  // back to the compact size. Measured against the live bar width and icon
  // count (which varies with enabled nav items and the status alert).
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [large, setLarge] = useState(false);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const TARGET = 48; // standard bottom-nav touch target (px)
    const MIN_GAP = 8; // minimum spacing between targets (px)

    const compute = () => {
      const count = el.children.length;
      if (count === 0) {
        return;
      }
      const needed = count * TARGET + Math.max(count - 1, 0) * MIN_GAP;
      setLarge(needed <= el.clientWidth);
    };

    compute();

    const resize = new ResizeObserver(compute);
    resize.observe(el);
    // recompute when items are added/removed (e.g. the status alert appears)
    const mutation = new MutationObserver(compute);
    mutation.observe(el, { childList: true });

    return () => {
      resize.disconnect();
      mutation.disconnect();
    };
  }, [navItems]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-x-4 bottom-0 flex h-16 flex-row items-center justify-between",
        isMobile &&
          (isPWA
            ? "h-[calc(3rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] md:h-[calc(4rem+env(safe-area-inset-bottom))]"
            : "h-12 md:h-16 md:pb-2"),
      )}
    >
      {navItems.map((item) => (
        <NavItem
          key={item.id}
          large={large}
          className="p-2"
          item={item}
          Icon={item.icon}
        />
      ))}
      <GeneralSettings large={large} className="p-2" />
      <StatusAlertNav large={large} className="p-2" />
    </div>
  );
}

type StatusAlertNavProps = {
  className?: string;
  large?: boolean;
};
function StatusAlertNav({ className, large }: StatusAlertNavProps) {
  const { t } = useTranslation(["views/system"]);
  const { data: initialStats } = useSWR<FrigateStats>("stats", {
    revalidateOnFocus: false,
  });
  const latestStats = useFrigateStats();

  const { messages, addMessage, clearMessages } = useContext(
    StatusBarMessagesContext,
  )!;

  const stats = useMemo(() => {
    if (latestStats) {
      return latestStats;
    }

    return initialStats;
  }, [initialStats, latestStats]);
  const { potentialProblems } = useStats(stats);

  useEffect(() => {
    clearMessages("stats");
    potentialProblems.forEach((problem) => {
      addMessage(
        "stats",
        problem.text,
        problem.color,
        undefined,
        problem.relevantLink,
      );
    });
  }, [potentialProblems, addMessage, clearMessages]);

  const { payload: reindexState } = useEmbeddingsReindexProgress();

  useEffect(() => {
    if (reindexState) {
      if (reindexState.status == "indexing") {
        clearMessages("embeddings-reindex");
        addMessage(
          "embeddings-reindex",
          t("stats.reindexingEmbeddings", {
            processed: Math.floor(
              (reindexState.processed_objects / reindexState.total_objects) *
                100,
            ),
          }),
        );
      }
      if (reindexState.status === "completed") {
        clearMessages("embeddings-reindex");
      }
    }
  }, [reindexState, addMessage, clearMessages, t]);

  if (!messages || Object.keys(messages).length === 0) {
    return;
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <div
          className={cn(
            "flex flex-col items-center justify-center p-2",
            large && "size-12",
          )}
        >
          <IoIosWarning
            className={cn(
              "text-danger md:m-[6px]",
              large ? "size-6" : "size-5",
            )}
          />
        </div>
      </DrawerTrigger>
      <DrawerContent
        className={cn(
          "mx-1 max-h-[75dvh] overflow-hidden rounded-t-2xl px-2",
          className,
        )}
      >
        <div className="scrollbar-container flex h-auto w-full flex-col items-center gap-2 overflow-y-auto overflow-x-hidden py-4">
          {Object.entries(messages).map(([key, messageArray]) => (
            <div key={key} className="flex w-full items-center gap-2">
              {messageArray.map(({ id, text, color, link }: StatusMessage) => {
                const message = (
                  <div key={id} className="flex items-center gap-2 text-xs">
                    <IoIosWarning
                      className={`size-5 ${color || "text-danger"}`}
                    />
                    {text}
                  </div>
                );

                if (link) {
                  return (
                    <Link key={id} to={link}>
                      {message}
                    </Link>
                  );
                } else {
                  return message;
                }
              })}
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default Bottombar;
