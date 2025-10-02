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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { LazyLog } from "@melloware/react-logviewer";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import EnhancedScrollFollow from "@/components/dynamic/EnhancedScrollFollow";
import { MdCircle } from "react-icons/md";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { debounce } from "lodash";
import { isIOS, isMobile } from "react-device-detect";
import { isPWA } from "@/utils/isPWA";
import { isInIframe } from "@/utils/isIFrame";
import { useTranslation } from "react-i18next";

function Logs() {
  const { t } = useTranslation(["views/system"]);
  const [logService, setLogService] = useState<LogType>("frigate");
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const lazyLogWrapperRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<LogSeverity[]>();
  const [selectedLog, setSelectedLog] = useState<LogLine>();
  const lazyLogRef = useRef<LazyLog>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchedIndexRef = useRef(-1);

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
          const filteredLines = filterLines(response.data.lines);
          return filteredLines;
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
      return [];
    },
    [logService, filterLines, t],
  );

  const fetchInitialLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`logs/${logService}`, {
        params: { start: filterSeverity ? 0 : -100 },
      });
      if (
        response.status === 200 &&
        response.data &&
        Array.isArray(response.data.lines)
      ) {
        const filteredLines = filterLines(response.data.lines);
        setLogs(filteredLines);
        lastFetchedIndexRef.current =
          response.data.totalLines - filteredLines.length;
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
  }, [logService, filterLines, filterSeverity, t]);

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
          if (filteredLines.length > 0) {
            lazyLogRef.current?.appendLines(filteredLines);
          }
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
  }, [logService, filterSeverity, t]);

  useEffect(() => {
    setIsLoading(true);
    setLogs([]);
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

  const prependLines = useCallback((newLines: string[]) => {
    if (!lazyLogRef.current) return;

    const newLinesArray = newLines.map(
      (line) => new Uint8Array(new TextEncoder().encode(line + "\n")),
    );

    lazyLogRef.current.setState((prevState) => ({
      ...prevState,
      lines: prevState.lines.unshift(...newLinesArray),
      count: prevState.count + newLines.length,
    }));
  }, []);

  // debounced
  const handleScroll = useMemo(
    () =>
      debounce(() => {
        const scrollThreshold =
          lazyLogRef.current?.listRef.current?.findEndIndex() ?? 10;
        const startIndex =
          lazyLogRef.current?.listRef.current?.findStartIndex() ?? 0;
        const endIndex =
          lazyLogRef.current?.listRef.current?.findEndIndex() ?? 0;
        const pageSize = endIndex - startIndex;
        if (
          scrollThreshold < pageSize + pageSize / 2 &&
          lastFetchedIndexRef.current > 0 &&
          !isLoading
        ) {
          const nextEnd = lastFetchedIndexRef.current;
          const nextStart = Math.max(0, nextEnd - (pageSize || 100));
          setIsLoading(true);

          fetchLogRange(nextStart, nextEnd).then((newLines) => {
            if (newLines.length > 0) {
              prependLines(newLines);
              lastFetchedIndexRef.current = nextStart;

              lazyLogRef.current?.listRef.current?.scrollTo(
                newLines.length *
                  lazyLogRef.current?.listRef.current?.getItemSize(1),
              );
            }
          });

          setIsLoading(false);
        }
      }, 50),
    [fetchLogRange, isLoading, prependLines],
  );

  const handleCopyLogs = useCallback(() => {
    if (logs.length) {
      fetchInitialLogs()
        .then(() => {
          copy(logs.join("\n"));
          toast.success(t("logs.copy.success"));
        })
        .catch(() => {
          toast.error(t("logs.copy.error"));
        });
    }
  }, [logs, fetchInitialLogs, t]);

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

  const handleRowClick = useCallback(
    (rowInfo: { lineNumber: number; rowIndex: number }) => {
      const clickedLine = parseLogLines(logService, [
        logs[rowInfo.rowIndex],
      ])[0];
      setSelectedLog(clickedLine);
    },
    [logs, logService],
  );

  // keyboard listener

  useKeyboardListener(
    ["PageDown", "PageUp", "ArrowDown", "ArrowUp"],
    (key, modifiers) => {
      if (!key || !modifiers.down || !lazyLogWrapperRef.current) {
        return true;
      }

      const container =
        lazyLogWrapperRef.current.querySelector(".react-lazylog");

      const logLineHeight = container?.querySelector(".log-line")?.clientHeight;

      if (!logLineHeight) {
        return true;
      }

      const scrollAmount = key.includes("Page")
        ? logLineHeight * 10
        : logLineHeight;
      const direction = key.includes("Down") ? 1 : -1;
      container?.scrollBy({ top: scrollAmount * direction });
      return true;
    },
  );

  // format lines

  const lineBufferRef = useRef<string>("");

  const formatPart = useCallback(
    (text: string) => {
      lineBufferRef.current += text;

      if (text.endsWith("\n")) {
        const completeLine = lineBufferRef.current.trim();
        lineBufferRef.current = "";

        if (completeLine) {
          const parsedLine = parseLogLines(logService, [completeLine])[0];
          return (
            <LogLineData
              line={parsedLine}
              logService={logService}
              onClickSeverity={() => setFilterSeverity([parsedLine.severity])}
              onSelect={() => setSelectedLog(parsedLine)}
            />
          );
        }
      }

      return null;
    },
    [logService, setFilterSeverity, setSelectedLog],
  );

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      if (!lazyLogWrapperRef.current) return;

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

    const content = lazyLogWrapperRef.current;
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
                  setLogs([]);
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
                  <div className="smart-capitalize">{item}</div>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ScrollBar orientation="horizontal" className="h-0" />
          </div>
        </ScrollArea>
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
      </div>

      <div className="font-mono relative my-2 flex size-full flex-col overflow-hidden whitespace-pre-wrap rounded-md border border-secondary bg-background_alt text-xs sm:p-1">
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

        <div ref={lazyLogWrapperRef} className="size-full">
          {isLoading ? (
            <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
          ) : (
            <EnhancedScrollFollow
              startFollowing={!isLoading}
              onCustomScroll={handleScroll}
              render={({ follow, onScroll }) => (
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
                  <LazyLog
                    ref={lazyLogRef}
                    enableLineNumbers={false}
                    selectableLines
                    lineClassName="text-primary bg-background"
                    highlightLineClassName="bg-primary/20"
                    onRowClick={handleRowClick}
                    formatPart={formatPart}
                    text={logs.join("\n")}
                    follow={follow}
                    onScroll={onScroll}
                    loadingComponent={
                      <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                    }
                    loading={isLoading}
                  />
                </>
              )}
            />
          )}
        </div>
      </div>
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
