import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LogData, LogLine, LogSeverity } from "@/types/log";
import copy from "copy-to-clipboard";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuCopy } from "react-icons/lu";
import axios from "axios";

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

            return null;
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
    }
  }, [logs]);

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

  const [filterSeverity, setFilterSeverity] = useState<LogSeverity>();

  return (
    <div className="size-full p-2 flex flex-col">
      <div className="flex justify-between items-center">
        <ToggleGroup
          className="*:px-3 *:py-4 *:rounded-md"
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
              className={`flex items-center justify-between gap-2 ${logService == item ? "" : "text-gray-500"}`}
              value={item}
              aria-label={`Select ${item}`}
            >
              <div className="capitalize">{item}</div>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div>
          <Button
            className="flex justify-between items-center gap-2"
            size="sm"
            onClick={handleCopyLogs}
          >
            <LuCopy />
            <div className="hidden md:block">Copy to Clipboard</div>
          </Button>
        </div>
      </div>

      {initialScroll && !endVisible && (
        <Button
          className="absolute bottom-8 left-[50%] -translate-x-[50%] rounded-xl bg-accent-foreground text-white bg-gray-400 z-20 p-2"
          variant="secondary"
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

      <div
        ref={contentRef}
        className="w-full h-min my-2 font-mono text-sm sm:py-2 whitespace-pre-wrap overflow-auto no-scrollbar bg-primary border border-secondary rounded-md"
      >
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-12 *:p-2 *:text-sm *:text-primary-foreground/40">
          <div className="p-1 flex items-center capitalize">Type</div>
          <div className="col-span-2 sm:col-span-1 flex items-center">
            Timestamp
          </div>
          <div className="col-span-2 flex items-center">Tag</div>
          <div className="col-span-5 sm:col-span-4 md:col-span-8 flex items-center">
            Message
          </div>
        </div>
        {logLines.length > 0 &&
          [...Array(logRange.end).keys()].map((idx) => {
            const logLine =
              idx >= logRange.start
                ? logLines[idx - logRange.start]
                : undefined;

            if (logLine) {
              const line = logLines[idx - logRange.start];
              if (filterSeverity && line.severity != filterSeverity) {
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
                  onClickSeverity={() => setFilterSeverity(line.severity)}
                />
              );
            }

            return <div key={`${idx}-${logService}`} className="h-12" />;
          })}
        {logLines.length > 0 && <div id="page-bottom" ref={endLogRef} />}
      </div>
    </div>
  );
}

type LogLineDataProps = {
  startRef?: (node: HTMLDivElement | null) => void;
  className: string;
  line: LogLine;
  onClickSeverity: () => void;
};
function LogLineData({
  startRef,
  className,
  line,
  onClickSeverity,
}: LogLineDataProps) {
  // long log message

  const contentRef = useRef<HTMLDivElement | null>(null);

  // severity coloring

  const severityClassName = useMemo(() => {
    switch (line.severity) {
      case "info":
        return "text-primary-foreground/60 bg-secondary hover:bg-secondary/60";
      case "warning":
        return "text-warning-foreground bg-warning hover:bg-warning/80";
      case "error":
        return "text-destructive-foreground bg-destructive hover:bg-destructive/80";
    }
  }, [line]);

  return (
    <div
      ref={startRef}
      className={`py-2 grid grid-cols-5 sm:grid-cols-8 md:grid-cols-12 gap-2 border-secondary border-t ${className} *:text-sm`}
    >
      <div className="h-full p-1 flex items-center gap-2">
        <div
          className={`py-[1px] px-1 capitalize text-xs rounded-md cursor-pointer ${severityClassName}`}
          onClick={onClickSeverity}
        >
          {line.severity}
        </div>
      </div>
      <div className="h-full col-span-2 sm:col-span-1 flex items-center">
        {line.dateStamp}
      </div>
      <div className="s-full col-span-2 overflow-hidden whitespace-nowrap text-ellipsis">
        {line.section}
      </div>
      <div className="w-full col-span-5 sm:col-span-4 md:col-span-8 flex justify-between items-center">
        <div
          ref={contentRef}
          className="w-[94%] flex items-center overflow-hidden whitespace-nowrap text-ellipsis"
        >
          {line.content}
        </div>
      </div>
    </div>
  );
}

export default Logs;
