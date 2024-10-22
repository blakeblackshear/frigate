import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LogData, LogLine, LogSeverity, LogType, logTypes } from "@/types/log";
import copy from "copy-to-clipboard";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import LogInfoDialog from "@/components/overlay/LogInfoDialog";
import { LogChip } from "@/components/indicators/Chip";
import { LogLevelFilterButton } from "@/components/filter/LogLevelFilter";
import { FaCopy } from "react-icons/fa6";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  isDesktop,
  isMobile,
  isMobileOnly,
  isTablet,
} from "react-device-detect";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { cn } from "@/lib/utils";
import { MdVerticalAlignBottom } from "react-icons/md";
import { parseLogLines } from "@/utils/logUtil";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import scrollIntoView from "scroll-into-view-if-needed";
import { FaDownload } from "react-icons/fa";

type LogRange = { start: number; end: number };

function Logs() {
  const [logService, setLogService] = useState<LogType>("frigate");
  const tabsRef = useRef<HTMLDivElement | null>(null);

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

  // log data handling

  const logPageSize = useMemo(() => {
    if (isMobileOnly) {
      return 15;
    }

    if (isTablet) {
      return 25;
    }

    return 40;
  }, []);

  const [logRange, setLogRange] = useState<LogRange>({ start: 0, end: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const [logLines, setLogLines] = useState<LogLine[]>([]);

  useEffect(() => {
    axios
      .get(`logs/${logService}?start=-${logPageSize}`)
      .then((resp) => {
        if (resp.status == 200) {
          const data = resp.data as LogData;
          setLogRange({
            start: Math.max(0, data.totalLines - logPageSize),
            end: data.totalLines,
          });
          setLogs(data.lines);
          setLogLines(parseLogLines(logService, data.lines));
        }
      })
      .catch(() => {});
  }, [logPageSize, logService]);

  useEffect(() => {
    if (!logs || logs.length == 0) {
      return;
    }

    const id = setTimeout(() => {
      axios
        .get(`logs/${logService}?start=${logRange.end}`)
        .then((resp) => {
          if (resp.status == 200) {
            const data = resp.data as LogData;

            if (data.lines.length > 0) {
              setLogRange({
                start: logRange.start,
                end: data.totalLines,
              });
              setLogs([...logs, ...data.lines]);
              setLogLines([
                ...logLines,
                ...parseLogLines(logService, data.lines),
              ]);
            }
          }
        })
        .catch(() => {});
    }, 5000);

    return () => {
      if (id) {
        clearTimeout(id);
      }
    };
    // we need to listen on the current range of visible items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logLines, logService, logRange]);

  // convert to log data

  const handleCopyLogs = useCallback(() => {
    if (logs) {
      copy(logs.join("\n"));
      toast.success(
        logRange.start == 0
          ? "Copied logs to clipboard"
          : "Copied visible logs to clipboard",
      );
    } else {
      toast.error("Could not copy logs to clipboard");
    }
  }, [logs, logRange]);

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

  // scroll to bottom

  const [initialScroll, setInitialScroll] = useState(false);

  const contentRef = useRef<HTMLDivElement | null>(null);
  const [endVisible, setEndVisible] = useState(true);
  const endObserver = useRef<IntersectionObserver | null>(null);
  const endLogRef = useCallback(
    (node: HTMLElement | null) => {
      if (endObserver.current) endObserver.current.disconnect();
      try {
        endObserver.current = new IntersectionObserver((entries) => {
          setEndVisible(entries[0].isIntersecting);
        });
        if (node) endObserver.current.observe(node);
      } catch (e) {
        // no op
      }
    },
    [setEndVisible],
  );
  const startObserver = useRef<IntersectionObserver | null>(null);
  const startLogRef = useCallback(
    (node: HTMLElement | null) => {
      if (startObserver.current) startObserver.current.disconnect();

      if (logs.length == 0 || !initialScroll) {
        return;
      }

      try {
        startObserver.current = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && logRange.start > 0) {
              const start = Math.max(0, logRange.start - logPageSize);

              axios
                .get(`logs/${logService}?start=${start}&end=${logRange.start}`)
                .then((resp) => {
                  if (resp.status == 200) {
                    const data = resp.data as LogData;

                    if (data.lines.length > 0) {
                      setLogRange({
                        start: start,
                        end: logRange.end,
                      });
                      setLogs([...data.lines, ...logs]);
                      setLogLines([
                        ...parseLogLines(logService, data.lines),
                        ...logLines,
                      ]);
                    }
                  }
                })
                .catch(() => {});
              contentRef.current?.scrollBy({
                top: 10,
              });
            }
          },
          { rootMargin: `${10 * (isMobile ? 64 : 48)}px 0px 0px 0px` },
        );
        if (node) startObserver.current.observe(node);
      } catch (e) {
        // no op
      }
    },
    // we need to listen on the current range of visible items
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logRange, initialScroll],
  );

  useEffect(() => {
    if (logLines.length == 0) {
      setInitialScroll(false);
      return;
    }

    if (initialScroll) {
      return;
    }

    if (!contentRef.current) {
      return;
    }

    if (contentRef.current.scrollHeight <= contentRef.current.clientHeight) {
      setInitialScroll(true);
      return;
    }

    contentRef.current?.scrollTo({
      top: contentRef.current?.scrollHeight,
      behavior: "instant",
    });
    setTimeout(() => setInitialScroll(true), 300);
    // we need to listen on the current range of visible items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logLines, logService]);

  // log filtering

  const [filterSeverity, setFilterSeverity] = useState<LogSeverity[]>();

  // log selection

  const [selectedLog, setSelectedLog] = useState<LogLine>();

  // interaction

  useKeyboardListener(
    ["PageDown", "PageUp", "ArrowDown", "ArrowUp"],
    (key, modifiers) => {
      if (!modifiers.down) {
        return;
      }

      switch (key) {
        case "PageDown":
          contentRef.current?.scrollBy({
            top: 480,
          });
          break;
        case "PageUp":
          contentRef.current?.scrollBy({
            top: -480,
          });
          break;
        case "ArrowDown":
          contentRef.current?.scrollBy({
            top: 48,
          });
          break;
        case "ArrowUp":
          contentRef.current?.scrollBy({
            top: -48,
          });
          break;
      }
    },
  );

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
                  setLogLines([]);
                  setFilterSeverity(undefined);
                  setLogService(value);
                }
              }} // don't allow the severity to be unselected
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
          />
        </div>
      </div>

      {initialScroll && !endVisible && (
        <Button
          className="absolute bottom-8 left-[50%] z-20 flex -translate-x-[50%] items-center gap-1 rounded-md p-2"
          aria-label="Jump to bottom of logs"
          onClick={() =>
            contentRef.current?.scrollTo({
              top: contentRef.current?.scrollHeight,
              behavior: "smooth",
            })
          }
        >
          <MdVerticalAlignBottom />
          Jump to Bottom
        </Button>
      )}

      <div className="font-mono relative my-2 flex size-full flex-col overflow-hidden whitespace-pre-wrap rounded-md border border-secondary bg-background_alt text-sm sm:p-2">
        <div className="grid grid-cols-5 *:px-2 *:py-3 *:text-sm *:text-primary/40 sm:grid-cols-8 md:grid-cols-12">
          <div className="flex items-center p-1 capitalize">Type</div>
          <div className="col-span-2 flex items-center sm:col-span-1">
            Timestamp
          </div>
          <div className="col-span-2 flex items-center">Tag</div>
          <div className="col-span-5 flex items-center sm:col-span-4 md:col-span-8">
            Message
          </div>
        </div>
        <div
          ref={contentRef}
          className="no-scrollbar flex w-full flex-col overflow-y-auto overscroll-contain"
        >
          {logLines.length > 0 &&
            [...Array(logRange.end).keys()].map((idx) => {
              const logLine =
                idx >= logRange.start
                  ? logLines[idx - logRange.start]
                  : undefined;

              if (logLine) {
                const line = logLines[idx - logRange.start];
                if (filterSeverity && !filterSeverity.includes(line.severity)) {
                  return (
                    <div
                      ref={idx == logRange.start + 10 ? startLogRef : undefined}
                    />
                  );
                }

                return (
                  <LogLineData
                    key={`${idx}-${logService}`}
                    startRef={
                      idx == logRange.start + 10 ? startLogRef : undefined
                    }
                    className={initialScroll ? "" : "invisible"}
                    line={line}
                    onClickSeverity={() => setFilterSeverity([line.severity])}
                    onSelect={() => setSelectedLog(line)}
                  />
                );
              }

              return (
                <div
                  key={`${idx}-${logService}`}
                  className={isDesktop ? "h-12" : "h-16"}
                />
              );
            })}
          {logLines.length > 0 && <div id="page-bottom" ref={endLogRef} />}
        </div>
        {logLines.length == 0 && (
          <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
        )}
      </div>
    </div>
  );
}

type LogLineDataProps = {
  startRef?: (node: HTMLDivElement | null) => void;
  className: string;
  line: LogLine;
  onClickSeverity: () => void;
  onSelect: () => void;
};
function LogLineData({
  startRef,
  className,
  line,
  onClickSeverity,
  onSelect,
}: LogLineDataProps) {
  return (
    <div
      ref={startRef}
      className={cn(
        "grid w-full cursor-pointer grid-cols-5 gap-2 border-t border-secondary py-2 hover:bg-muted sm:grid-cols-8 md:grid-cols-12",
        className,
        "*:text-sm",
      )}
      onClick={onSelect}
    >
      <div className="flex h-full items-center gap-2 p-1">
        <LogChip severity={line.severity} onClickSeverity={onClickSeverity} />
      </div>
      <div className="col-span-2 flex h-full items-center sm:col-span-1">
        {line.dateStamp}
      </div>
      <div className="col-span-2 flex size-full items-center pr-2">
        <div className="w-full overflow-hidden text-ellipsis whitespace-nowrap">
          {line.section}
        </div>
      </div>
      <div className="col-span-5 flex size-full items-center justify-between pl-2 pr-2 sm:col-span-4 sm:pl-0 md:col-span-8">
        <div className="w-full overflow-hidden text-ellipsis whitespace-nowrap">
          {line.content}
        </div>
      </div>
    </div>
  );
}

export default Logs;
