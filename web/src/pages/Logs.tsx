import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LogLine, LogSeverity, LogType, logTypes } from "@/types/log";
import copy from "copy-to-clipboard";
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import LogInfoDialog from "@/components/overlay/LogInfoDialog";
import { LogChip } from "@/components/indicators/Chip";
import { LogLevelFilterButton } from "@/components/filter/LogLevelFilter";
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

function Logs() {
  const [logService, setLogService] = useState<LogType>("frigate");
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const lazyLogWrapperRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<LogSeverity[]>();
  const [selectedLog, setSelectedLog] = useState<LogLine>();
  const lazyLogRef = useRef<LazyLog>(null);

  useEffect(() => {
    document.title = `${logService[0].toUpperCase()}${logService.substring(1)} Logs - Frigate`;
  }, [logService]);

  useEffect(() => {
    if (tabsRef.current) {
      const element = tabsRef.current.querySelector(
        `[data-nav-item="${logService}"]`,
      );
      if (element instanceof HTMLElement) {
        scrollIntoView(element, {
          behavior: "smooth",
          inline: "start",
        });
      }
    }
  }, [tabsRef, logService]);

  // handlers

  const handleCopyLogs = useCallback(() => {
    if (logs.length) {
      copy(logs.join("\n"));
      toast.success("Copied logs to clipboard");
    } else {
      toast.error("Could not copy logs to clipboard");
    }
  }, [logs]);

  const handleDownloadLogs = useCallback(() => {
    axios
      .get(`api/logs/${logService}?download=true`)
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

  const fetchInitialLogs = useCallback(async () => {
    try {
      const response = await axios.get(`logs/${logService}`);
      if (
        response.status === 200 &&
        response.data &&
        Array.isArray(response.data.lines)
      ) {
        const filteredLines = filterLines(response.data.lines);
        setLogs(filteredLines);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(`Error fetching logs: ${errorMessage}`, {
        position: "top-center",
      });
    }
  }, [logService, filterLines]);

  const [isStreaming, setIsStreaming] = useState(false);
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
          toast.error(`Error while streaming logs: ${errorMessage}`);
          setIsStreaming(false);
        }
      });
  }, [logService, filterSeverity]);

  useEffect(() => {
    fetchInitialLogs().then(() => {
      // Start streaming after initial load
      setIsStreaming(true);
      fetchLogsStream();
    });

    return () => {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    };
  }, [fetchInitialLogs, fetchLogsStream]);

  // keyboard listener

  useKeyboardListener(
    ["PageDown", "PageUp", "ArrowDown", "ArrowUp"],
    (key, modifiers) => {
      if (!key || !modifiers.down || !lazyLogWrapperRef.current) {
        return;
      }

      const container =
        lazyLogWrapperRef.current.querySelector(".react-lazylog");

      const logLineHeight = container?.querySelector(".log-line")?.clientHeight;

      if (!logLineHeight) {
        return;
      }

      const scrollAmount = key.includes("Page")
        ? logLineHeight * 10
        : logLineHeight;
      const direction = key.includes("Down") ? 1 : -1;
      container?.scrollBy({ top: scrollAmount * direction });
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
                  <div className="capitalize">{item}</div>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ScrollBar orientation="horizontal" className="h-0" />
          </div>
        </ScrollArea>
        <div className="flex items-center gap-2">
          <Button
            className="flex items-center justify-between gap-2"
            aria-label="Copy logs to clipboard"
            size="sm"
            onClick={handleCopyLogs}
          >
            <FaCopy className="text-secondary-foreground" />
            <div className="hidden text-primary md:block">
              Copy to Clipboard
            </div>
          </Button>
          <Button
            className="flex items-center justify-between gap-2"
            aria-label="Download logs"
            size="sm"
            onClick={handleDownloadLogs}
          >
            <FaDownload className="text-secondary-foreground" />
            <div className="hidden text-primary md:block">Download</div>
          </Button>
          <LogLevelFilterButton
            selectedLabels={filterSeverity}
            updateLabelFilter={setFilterSeverity}
            // setStreaming={setStreaming}
          />
        </div>
      </div>

      <div className="font-mono relative my-2 flex size-full flex-col overflow-hidden whitespace-pre-wrap rounded-md border border-secondary bg-background_alt text-xs sm:p-1">
        <div className="grid grid-cols-5 *:px-0 *:py-3 *:text-sm *:text-primary/40 md:grid-cols-12">
          <div className="ml-1 flex items-center p-1 capitalize">Type</div>
          <div className="col-span-2 flex items-center lg:col-span-1">
            Timestamp
          </div>
          <div
            className={cn(
              "flex items-center",
              logService == "frigate" ? "col-span-2" : "col-span-1",
            )}
          >
            Tag
          </div>
          <div
            className={cn(
              "col-span-5 flex items-center",
              logService == "frigate"
                ? "md:col-span-7 lg:col-span-8"
                : "md:col-span-8 lg:col-span-9",
            )}
          >
            <div className="flex flex-1">Message</div>
            {isStreaming && (
              <div className="flex flex-row justify-end">
                <Tooltip>
                  <TooltipTrigger>
                    <MdCircle className="mr-2 size-2 animate-pulse cursor-default text-selected shadow-selected drop-shadow-md" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Logs are streaming from the server
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </div>

        <div ref={lazyLogWrapperRef} className="size-full">
          <EnhancedScrollFollow
            startFollowing={true}
            render={({ follow, onScroll }) => (
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
                loadingComponent={<ActivityIndicator />}
              />
            )}
          />
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
        "grid w-full cursor-pointer grid-cols-5 gap-2 border-t border-secondary py-0 hover:bg-muted md:grid-cols-12",
        className,
        "*:text-xs",
      )}
      onClick={onSelect}
    >
      <div className="log-severity flex h-full items-center gap-2 p-1">
        <LogChip severity={line.severity} onClickSeverity={onClickSeverity} />
      </div>
      <div className="log-timestamp col-span-2 flex h-full items-center whitespace-normal lg:col-span-1">
        {line.dateStamp}
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
          "log-content col-span-5 flex size-full items-center justify-between pr-2",
          logService == "frigate"
            ? "md:col-span-7"
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
