import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  LogLine,
  LogSettingsType,
  LogSeverity,
  LogType,
  logTypes,
} from "@/types/log";
import copy from "copy-to-clipboard";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import axios from "axios";
import LogInfoDialog from "@/components/overlay/LogInfoDialog";
import { LogChip } from "@/components/indicators/Chip";
import { LogSettingsButton } from "@/components/filter/LogSettingsButton";
import { FaCopy, FaDownload } from "react-icons/fa";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { cn } from "@/lib/utils";
import { parseLogLines } from "@/utils/logUtil";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import scrollIntoView from "scroll-into-view-if-needed";
import { VList, type VListHandle } from "virtua";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { MdCircle } from "react-icons/md";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isDesktop, isIOS, isMobile } from "react-device-detect";
import { isPWA } from "@/utils/isPWA";
import { isInIframe } from "@/utils/isIFrame";
import { useTranslation } from "react-i18next";
import WsMessageFeed from "@/components/ws/WsMessageFeed";

const OLDER_LINES_CHUNK_SIZE = 100;
const FOLLOW_THRESHOLD_PX = 40;

// Desktop row height. Without it, virtua guesses 40px and the first render
// leaves the viewport partly empty. Mobile rows are taller, and a low hint
// there shrinks the scroll room iOS gets while it defers scroll correction
const ROW_HEIGHT_HINT_PX = 29;

// Stable ids keep row measurements attached to the right line after a prepend
type LogEntry = { id: number; text: string };

// shift anchors the viewport to the end when lines are prepended. stick keeps
// the newest line in view when lines are appended
type LogState = { entries: LogEntry[]; shift: boolean; stick: boolean };

function Logs() {
  const { t } = useTranslation(["views/system"]);
  const [logService, setLogService] = useState<LogType>("frigate");
  const isWebsocket = logService === "websocket";
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const logWrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<VListHandle>(null);
  const [logState, setLogState] = useState<LogState>({
    entries: [],
    shift: false,
    stick: true,
  });
  const [filterSeverity, setFilterSeverity] = useState<LogSeverity[]>();
  const [selectedLog, setSelectedLog] = useState<LogLine>();
  const [isLoading, setIsLoading] = useState(true);
  const [follow, setFollow] = useState(true);
  const lastFetchedIndexRef = useRef(-1);
  const loadingOlderRef = useRef(false);
  const firstIdRef = useRef(0);
  const lastIdRef = useRef(0);

  // The last wheel or key scroll went up. The view can still sit at the
  // bottom for a moment, so position alone would keep following
  const scrolledUpRef = useRef(false);

  // lines

  const isFollowing = useCallback(() => {
    const list = listRef.current;
    if (!list || scrolledUpRef.current) return false;

    return (
      list.scrollSize - list.scrollOffset - list.viewportSize <
      FOLLOW_THRESHOLD_PX
    );
  }, []);

  const resetLines = useCallback((lines: string[]) => {
    firstIdRef.current = 0;
    lastIdRef.current = lines.length;
    setLogState({
      entries: lines.map((text, id) => ({ id, text })),
      shift: false,
      stick: true,
    });
  }, []);

  const appendLines = useCallback(
    (lines: string[]) => {
      const entries = lines
        .filter((text) => text.trim())
        .map((text) => ({ id: lastIdRef.current++, text }));
      if (!entries.length) return;

      const stick = isFollowing();
      setLogState((prev) => ({
        entries: [...prev.entries, ...entries],
        shift: false,
        stick,
      }));
    },
    [isFollowing],
  );

  const prependLines = useCallback((lines: string[]) => {
    firstIdRef.current -= lines.length;
    const firstId = firstIdRef.current;
    const entries = lines.map((text, i) => ({ id: firstId + i, text }));

    setLogState((prev) => ({
      entries: [...entries, ...prev.entries],
      shift: true,
      stick: false,
    }));
  }, []);

  useEffect(() => {
    document.title = t("documentTitle.logs." + logService);
  }, [logService, t]);

  useEffect(() => {
    if (tabsRef.current) {
      const element = tabsRef.current.querySelector(
        `[data-nav-item="${logService}"]`,
      );
      if (element instanceof HTMLElement) {
        scrollIntoView(element, {
          behavior:
            isMobile && isIOS && !isPWA && isInIframe ? "auto" : "smooth",
          inline: "start",
        });
      }
    }
  }, [tabsRef, logService]);

  // log settings

  const [logSettings, setLogSettings] = useState<LogSettingsType>({
    disableStreaming: false,
  });

  // filter

  const filterLines = useCallback(
    (lines: string[]) => {
      if (!filterSeverity?.length) return lines;

      return lines.filter((line) => {
        const parsedLine = parseLogLines(logService, [line])[0];
        return filterSeverity.includes(parsedLine.severity);
      });
    },
    [filterSeverity, logService],
  );

  // fetchers

  const fetchLogRange = useCallback(
    async (start: number, end: number) => {
      try {
        const response = await axios.get(`logs/${logService}`, {
          params: { start, end },
        });
        if (
          response.status === 200 &&
          response.data &&
          Array.isArray(response.data.lines)
        ) {
          return response.data.lines as string[];
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        toast.error(
          t("logs.toast.error.fetchingLogsFailed", { errorMessage }),
          {
            position: "top-center",
          },
        );
      }
      return null;
    },
    [logService, t],
  );

  const fetchInitialLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`logs/${logService}`, {
        params: { start: filterSeverity?.length ? 0 : -100 },
      });
      if (
        response.status === 200 &&
        response.data &&
        Array.isArray(response.data.lines)
      ) {
        resetLines(filterLines(response.data.lines));

        // A filtered load fetches the whole file, so nothing older remains
        lastFetchedIndexRef.current =
          response.data.totalLines - response.data.lines.length;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(t("logs.toast.error.fetchingLogsFailed", { errorMessage }), {
        position: "top-center",
      });
    } finally {
      setIsLoading(false);
    }
  }, [logService, filterLines, filterSeverity, resetLines, t]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchLogsStream = useCallback(() => {
    // Cancel any existing stream
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    let buffer = "";
    const decoder = new TextDecoder();

    const processStreamChunk = (
      reader: ReadableStreamDefaultReader<Uint8Array>,
    ): Promise<void> => {
      return reader.read().then(({ done, value }) => {
        if (done) return;

        // Decode the chunk and add it to our buffer
        buffer += decoder.decode(value, { stream: true });

        // Split on newlines, keeping any partial line in the buffer
        const lines = buffer.split("\n");

        // Keep the last partial line
        buffer = lines.pop() || "";

        // Filter and append complete lines
        if (lines.length > 0) {
          const filteredLines = filterSeverity?.length
            ? lines.filter((line) => {
                const parsedLine = parseLogLines(logService, [line])[0];
                return filterSeverity.includes(parsedLine.severity);
              })
            : lines;
          appendLines(filteredLines);
        }
        // Process next chunk
        return processStreamChunk(reader);
      });
    };

    fetch(`api/logs/${logService}?stream=true`, {
      signal: abortController.signal,
    })
      .then((response): Promise<void> => {
        if (!response.ok) {
          throw new Error(
            `Error while fetching log stream, status: ${response.status}`,
          );
        }
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No reader available");
        }
        return processStreamChunk(reader);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "An unknown error occurred";
          toast.error(
            t("logs.toast.error.whileStreamingLogs", { errorMessage }),
          );
        }
      });
  }, [logService, filterSeverity, appendLines, t]);

  useEffect(() => {
    if (isWebsocket) {
      setIsLoading(false);
      resetLines([]);
      return;
    }

    setIsLoading(true);
    setFollow(true);
    scrolledUpRef.current = false;
    resetLines([]);
    lastFetchedIndexRef.current = -1;
    fetchInitialLogs().then(() => {
      // Start streaming after initial load
      if (!logSettings.disableStreaming) {
        fetchLogsStream();
      }
    });

    return () => {
      abortControllerRef.current?.abort();
    };
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logService, filterSeverity]);

  // handlers

  const loadOlderLines = useCallback(async () => {
    const end = lastFetchedIndexRef.current;
    if (loadingOlderRef.current || end <= 0) return;

    loadingOlderRef.current = true;
    const start = Math.max(0, end - OLDER_LINES_CHUNK_SIZE);
    const lines = await fetchLogRange(start, end);
    loadingOlderRef.current = false;

    // A service or filter change resets the index while the request is in flight
    if (!lines || lastFetchedIndexRef.current !== end) return;

    lastFetchedIndexRef.current = start;
    prependLines(lines);
  }, [fetchLogRange, prependLines]);

  // Runs on scroll events and on wheel or key input, because input at the top
  // or bottom edge doesn't scroll and fires no scroll event
  const syncScrollState = useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    setFollow(isFollowing());

    if (list.scrollOffset < list.viewportSize) {
      loadOlderLines();
    }
  }, [isFollowing, loadOlderLines]);

  useLayoutEffect(() => {
    if (isLoading || !logState.stick || !logState.entries.length) return;

    listRef.current?.scrollToIndex(logState.entries.length - 1, {
      align: "end",
    });
  }, [isLoading, logState]);

  const handleCopyLogs = useCallback(async () => {
    if (!logState.entries.length) return;

    if (await copy(logState.entries.map((entry) => entry.text).join("\n"))) {
      toast.success(t("logs.copy.success"));
    } else {
      toast.error(t("logs.copy.error"));
    }
  }, [logState, t]);

  const handleDownloadLogs = useCallback(() => {
    axios
      .get(`logs/${logService}?download=true`)
      .then((resp) => {
        const element = document.createElement("a");
        element.setAttribute(
          "href",
          "data:text/plain;charset=utf-8," + encodeURIComponent(resp.data),
        );
        element.setAttribute("download", `${logService}-logs.txt`);

        element.style.display = "none";
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
      })
      .catch(() => {});
  }, [logService]);

  // keyboard listener

  useKeyboardListener(
    ["PageDown", "PageUp", "ArrowDown", "ArrowUp"],
    (key, modifiers) => {
      const list = listRef.current;
      if (!key || !modifiers.down || !list) {
        return true;
      }

      const rowHeight = list.getItemSize(list.findItemIndex(list.scrollOffset));
      if (!rowHeight) {
        return true;
      }

      const rows = key.includes("Page") ? 10 : 1;
      const direction = key.includes("Down") ? 1 : -1;
      scrolledUpRef.current = direction < 0;
      list.scrollBy(rowHeight * rows * direction);
      syncScrollState();
      return true;
    },
  );

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      if (!logWrapperRef.current) return;

      const selection = window.getSelection();
      if (!selection) return;

      const range = selection.getRangeAt(0);
      const fragment = range.cloneContents();

      const extractLogData = (element: Element) => {
        const severity =
          element.querySelector(".log-severity")?.textContent?.trim() || "";
        const dateStamp =
          element.querySelector(".log-timestamp")?.textContent?.trim() || "";
        const section =
          element.querySelector(".log-section")?.textContent?.trim() || "";
        const content =
          element.querySelector(".log-content")?.textContent?.trim() || "";

        return { severity, dateStamp, section, content };
      };

      let copyData: {
        severity: string;
        dateStamp: string;
        section: string;
        content: string;
      }[] = [];

      if (fragment.querySelectorAll(".grid").length > 0) {
        // Multiple grid elements
        copyData = Array.from(fragment.querySelectorAll(".grid")).map(
          extractLogData,
        );
      } else {
        // Try to find the closest grid element or use the first child element
        const gridElement =
          fragment.querySelector(".grid") || (fragment.firstChild as Element);

        if (gridElement) {
          const data = extractLogData(gridElement);
          if (data.severity || data.dateStamp || data.section || data.content) {
            copyData.push(data);
          }
        }
      }

      if (copyData.length === 0) return; // No valid data to copy

      // Calculate maximum widths for each column
      const maxWidths = {
        severity: Math.max(...copyData.map((d) => d.severity.length)),
        dateStamp: Math.max(...copyData.map((d) => d.dateStamp.length)),
        section: Math.max(...copyData.map((d) => d.section.length)),
      };

      const pad = (str: string, length: number) => str.padEnd(length, " ");

      // Create the formatted copy text
      const copyText = copyData
        .map(
          (d) =>
            `${pad(d.severity, maxWidths.severity)} | ${pad(d.dateStamp, maxWidths.dateStamp)} | ${pad(d.section, maxWidths.section)} | ${d.content}`,
        )
        .join("\n");

      e.clipboardData?.setData("text/plain", copyText);
    };

    const content = logWrapperRef.current;
    content?.addEventListener("copy", handleCopy);
    return () => {
      content?.removeEventListener("copy", handleCopy);
    };
  }, []);

  return (
    <div className="flex size-full flex-col p-2">
      <Toaster position="top-center" closeButton={true} />
      <LogInfoDialog logLine={selectedLog} setLogLine={setSelectedLog} />

      <div className="relative flex h-11 w-full items-center justify-between">
        <ScrollArea className="w-full whitespace-nowrap">
          <div ref={tabsRef} className="flex flex-row">
            <ToggleGroup
              type="single"
              size="sm"
              value={logService}
              onValueChange={(value: LogType) => {
                if (value) {
                  setFilterSeverity(undefined);
                  setLogService(value);
                }
              }}
            >
              {Object.values(logTypes).map((item) => (
                <ToggleGroupItem
                  key={item}
                  className={`flex items-center justify-between gap-2 ${logService == item ? "" : "text-muted-foreground"}`}
                  value={item}
                  data-nav-item={item}
                  aria-label={`Select ${item}`}
                >
                  <div
                    className={item !== "websocket" ? "smart-capitalize" : ""}
                  >
                    {item === "websocket" ? t("logs.websocket.label") : item}
                  </div>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ScrollBar orientation="horizontal" className="h-0" />
          </div>
        </ScrollArea>
        {!isWebsocket && (
          <div className="flex items-center gap-2">
            <Button
              className="flex items-center justify-between gap-2"
              aria-label={t("logs.copy.label")}
              size="sm"
              onClick={handleCopyLogs}
            >
              <FaCopy className="text-secondary-foreground" />
              <div className="hidden text-primary md:block">
                {t("logs.copy.label")}
              </div>
            </Button>
            <Button
              className="flex items-center justify-between gap-2"
              aria-label={t("logs.download.label")}
              size="sm"
              onClick={handleDownloadLogs}
            >
              <FaDownload className="text-secondary-foreground" />
              <div className="hidden text-primary md:block">
                {t("button.download", { ns: "common" })}
              </div>
            </Button>
            <LogSettingsButton
              selectedLabels={filterSeverity}
              updateLabelFilter={setFilterSeverity}
              logSettings={logSettings}
              setLogSettings={setLogSettings}
            />
          </div>
        )}
      </div>

      {isWebsocket ? (
        <div className="my-2 flex size-full flex-col overflow-hidden rounded-md border border-secondary bg-background_alt">
          <WsMessageFeed maxSize={2000} />
        </div>
      ) : (
        <div className="relative my-2 flex size-full flex-col overflow-hidden whitespace-pre-wrap rounded-md border border-secondary bg-background_alt font-mono text-xs sm:p-1">
          <div className="grid grid-cols-5 *:px-0 *:py-3 *:text-sm *:text-primary/40 md:grid-cols-12">
            <div className="col-span-3 lg:col-span-2">
              <div className="flex w-full flex-row items-center">
                <div className="ml-1 min-w-16 smart-capitalize lg:min-w-20">
                  {t("logs.type.label")}
                </div>
                <div className="mr-3">{t("logs.type.timestamp")}</div>
              </div>
            </div>
            <div
              className={cn(
                "flex items-center",
                logService == "frigate" ? "col-span-2" : "col-span-1",
              )}
            >
              {t("logs.type.tag")}
            </div>
            <div
              className={cn(
                "col-span-5 flex items-center",
                logService == "frigate"
                  ? "md:col-span-7 lg:col-span-8"
                  : "md:col-span-8 lg:col-span-9",
              )}
            >
              <div className="flex flex-1">{t("logs.type.message")}</div>
            </div>
          </div>

          <div
            ref={logWrapperRef}
            className="min-h-0 flex-1"
            onPointerDown={() => {
              scrolledUpRef.current = false;
            }}
          >
            {isLoading ? (
              <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
            ) : (
              <>
                {follow && !logSettings.disableStreaming && (
                  <div className="absolute right-1 top-3">
                    <Tooltip>
                      <TooltipTrigger>
                        <MdCircle className="mr-2 size-2 animate-pulse cursor-default text-selected shadow-selected drop-shadow-md" />
                      </TooltipTrigger>
                      <TooltipContent>{t("logs.tips")}</TooltipContent>
                    </Tooltip>
                  </div>
                )}
                <VList
                  ref={listRef}
                  itemSize={isDesktop ? ROW_HEIGHT_HINT_PX : undefined}
                  data={logState.entries}
                  shift={logState.shift}
                  onScroll={syncScrollState}
                  onWheel={(e) => {
                    if (!e.deltaY) return;

                    scrolledUpRef.current = e.deltaY < 0;
                    syncScrollState();
                  }}
                >
                  {(entry) => {
                    const line = parseLogLines(logService, [entry.text])[0];
                    return (
                      <LogLineData
                        key={entry.id}
                        line={line}
                        logService={logService}
                        onClickSeverity={() =>
                          setFilterSeverity([line.severity])
                        }
                        onSelect={() => setSelectedLog(line)}
                      />
                    );
                  }}
                </VList>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type LogLineDataProps = {
  className?: string;
  line: LogLine;
  logService: string;
  onClickSeverity: () => void;
  onSelect: () => void;
};

function LogLineData({
  className,
  line,
  logService,
  onClickSeverity,
  onSelect,
}: LogLineDataProps) {
  return (
    <div
      className={cn(
        "grid w-full cursor-pointer grid-cols-5 gap-2 border-t border-secondary bg-background_alt py-1 hover:bg-muted md:grid-cols-12 md:py-0",
        className,
        "text-xs lg:text-sm/5",
      )}
      onClick={onSelect}
    >
      <div className="col-span-3 flex h-full items-center gap-2 lg:col-span-2">
        <div className="flex w-full flex-row items-center">
          <div className="log-severity p-1">
            <LogChip
              severity={line.severity}
              onClickSeverity={onClickSeverity}
            />
          </div>
          <div className="log-timestamp whitespace-normal">
            {line.dateStamp}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "log-section flex size-full items-center pr-2",
          logService == "frigate" ? "col-span-2" : "col-span-1",
        )}
      >
        <div className="w-full overflow-hidden text-ellipsis whitespace-nowrap">
          {line.section}
        </div>
      </div>
      <div
        className={cn(
          "log-content col-span-5 flex size-full items-center justify-between px-2 md:px-0 md:pr-2",
          logService == "frigate"
            ? "md:col-span-7 lg:col-span-8"
            : "md:col-span-8 lg:col-span-9",
        )}
      >
        <div className="w-full overflow-hidden text-ellipsis whitespace-nowrap">
          {line.content}
        </div>
      </div>
    </div>
  );
}

export default Logs;
