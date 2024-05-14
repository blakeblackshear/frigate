import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LogData, LogLine, LogSeverity } from "@/types/log";
import copy from "copy-to-clipboard";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import LogInfoDialog from "@/components/overlay/LogInfoDialog";
import { LogChip } from "@/components/indicators/Chip";
import { LogLevelFilterButton } from "@/components/filter/LogLevelFilter";
import { FaCopy } from "react-icons/fa6";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { isDesktop } from "react-device-detect";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { cn } from "@/lib/utils";

const logTypes = ["frigate", "go2rtc", "nginx"] as const;
type LogType = (typeof logTypes)[number];

type LogRange = { start: number; end: number };

const frigateDateStamp = /\[[\d\s-:]*]/;
const frigateSeverity = /(DEBUG)|(INFO)|(WARNING)|(ERROR)/;
const frigateSection = /[\w.]*/;

const goSeverity = /(DEB )|(INF )|(WRN )|(ERR )/;
const goSection = /\[[\w]*]/;

const ngSeverity = /(GET)|(POST)|(PUT)|(PATCH)|(DELETE)/;

function Logs() {
  const [logService, setLogService] = useState<LogType>("frigate");

  useEffect(() => {
    document.title = `${logService[0].toUpperCase()}${logService.substring(1)} Logs - Frigate`;
  }, [logService]);

  // log data handling

  const [logRange, setLogRange] = useState<LogRange>({ start: 0, end: 0 });
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    axios
      .get(`logs/${logService}?start=-100`)
      .then((resp) => {
        if (resp.status == 200) {
          const data = resp.data as LogData;
          setLogRange({
            start: Math.max(0, data.totalLines - 100),
            end: data.totalLines,
          });
          setLogs(data.lines);
        }
      })
      .catch(() => {});
  }, [logService]);

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
  }, [logs, logService, logRange]);

  // convert to log data

  const logLines = useMemo<LogLine[]>(() => {
    if (!logs) {
      return [];
    }

    if (logService == "frigate") {
      return logs
        .map((line) => {
          const match = frigateDateStamp.exec(line);

          if (!match) {
            const infoIndex = line.indexOf("[INFO]");

            if (infoIndex != -1) {
              return {
                dateStamp: line.substring(0, 19),
                severity: "info",
                section: "startup",
                content: line.substring(infoIndex + 6).trim(),
              };
            }

            return {
              dateStamp: line.substring(0, 19),
              severity: "unknown",
              section: "unknown",
              content: line.substring(30).trim(),
            };
          }

          const sectionMatch = frigateSection.exec(
            line.substring(match.index + match[0].length).trim(),
          );

          if (!sectionMatch) {
            return null;
          }

          return {
            dateStamp: match.toString().slice(1, -1),
            severity: frigateSeverity
              .exec(line)
              ?.at(0)
              ?.toString()
              ?.toLowerCase() as LogSeverity,
            section: sectionMatch.toString(),
            content: line
              .substring(line.indexOf(":", match.index + match[0].length) + 2)
              .trim(),
          };
        })
        .filter((value) => value != null) as LogLine[];
    } else if (logService == "go2rtc") {
      return logs
        .map((line) => {
          if (line.length == 0) {
            return null;
          }

          const severity = goSeverity.exec(line);

          let section =
            goSection.exec(line)?.toString()?.slice(1, -1) ?? "startup";

          if (frigateSeverity.exec(section)) {
            section = "startup";
          }

          let contentStart;

          if (section == "startup") {
            if (severity) {
              contentStart = severity.index + severity[0].length;
            } else {
              contentStart = line.lastIndexOf("]") + 1;
            }
          } else {
            contentStart = line.indexOf(section) + section.length + 2;
          }

          let severityCat: LogSeverity;
          switch (severity?.at(0)?.toString().trim()) {
            case "INF":
              severityCat = "info";
              break;
            case "WRN":
              severityCat = "warning";
              break;
            case "ERR":
              severityCat = "error";
              break;
            case "DBG":
            case "TRC":
              severityCat = "debug";
              break;
            default:
              severityCat = "info";
          }

          return {
            dateStamp: line.substring(0, 19),
            severity: severityCat,
            section: section,
            content: line.substring(contentStart).trim(),
          };
        })
        .filter((value) => value != null) as LogLine[];
    } else if (logService == "nginx") {
      return logs
        .map((line) => {
          if (line.length == 0) {
            return null;
          }

          return {
            dateStamp: line.substring(0, 19),
            severity: "info",
            section: ngSeverity.exec(line)?.at(0)?.toString() ?? "META",
            content: line.substring(line.indexOf(" ", 20)).trim(),
          };
        })
        .filter((value) => value != null) as LogLine[];
    } else {
      return [];
    }
  }, [logs, logService]);

  const handleCopyLogs = useCallback(() => {
    if (logs) {
      copy(logs.join("\n"));
      toast.success(
        logRange.start == 0
          ? "Coplied logs to clipboard"
          : "Copied visible logs to clipboard",
      );
    } else {
      toast.error("Could not copy logs to clipboard");
    }
  }, [logs, logRange]);

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
        startObserver.current = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && logRange.start > 0) {
            const start = Math.max(0, logRange.start - 100);

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
                  }
                }
              })
              .catch(() => {});
            contentRef.current?.scrollBy({
              top: 10,
            });
          }
        });
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

  return (
    <div className="flex size-full flex-col p-2">
      <Toaster position="top-center" closeButton={true} />
      <LogInfoDialog logLine={selectedLog} setLogLine={setSelectedLog} />

      <div className="flex items-center justify-between">
        <ToggleGroup
          className="*:rounded-md *:px-3 *:py-4"
          type="single"
          size="sm"
          value={logService}
          onValueChange={(value: LogType) => {
            if (value) {
              setLogs([]);
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
              aria-label={`Select ${item}`}
            >
              <div className="capitalize">{item}</div>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex items-center gap-2">
          <Button
            className="flex items-center justify-between gap-2"
            size="sm"
            onClick={handleCopyLogs}
          >
            <FaCopy className="text-secondary-foreground" />
            <div className="hidden text-primary md:block">
              Copy to Clipboard
            </div>
          </Button>
          <LogLevelFilterButton
            selectedLabels={filterSeverity}
            updateLabelFilter={setFilterSeverity}
          />
        </div>
      </div>

      {initialScroll && !endVisible && (
        <Button
          className="absolute bottom-8 left-[50%] z-20 -translate-x-[50%] rounded-md bg-secondary-foreground p-2 text-primary"
          onClick={() =>
            contentRef.current?.scrollTo({
              top: contentRef.current?.scrollHeight,
              behavior: "smooth",
            })
          }
        >
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
