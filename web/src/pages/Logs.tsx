import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import copy from "copy-to-clipboard";
import { useCallback, useMemo, useRef, useState } from "react";
import { LuCopy } from "react-icons/lu";
import useSWR from "swr";

const logTypes = ["frigate", "go2rtc", "nginx"] as const;
type LogType = (typeof logTypes)[number];

function Logs() {
  const [logService, setLogService] = useState<LogType>("frigate");

  const { data: frigateLogs } = useSWR("logs/frigate", {
    refreshInterval: 1000,
  });
  const { data: go2rtcLogs } = useSWR("logs/go2rtc", { refreshInterval: 1000 });
  const { data: nginxLogs } = useSWR("logs/nginx", { refreshInterval: 1000 });
  const logs = useMemo(() => {
    if (logService == "frigate") {
      return frigateLogs;
    } else if (logService == "go2rtc") {
      return go2rtcLogs;
    } else if (logService == "nginx") {
      return nginxLogs;
    } else {
      return "unknown logs";
    }
  }, [logService, frigateLogs, go2rtcLogs, nginxLogs]);

  const handleCopyLogs = useCallback(() => {
    copy(logs);
  }, [logs]);

  // scroll to bottom button

  const contentRef = useRef<HTMLDivElement | null>(null);
  const [endVisible, setEndVisible] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const endLogRef = useCallback(
    (node: HTMLElement | null) => {
      if (observer.current) observer.current.disconnect();
      try {
        observer.current = new IntersectionObserver((entries) => {
          setEndVisible(entries[0].isIntersecting);
        });
        if (node) observer.current.observe(node);
      } catch (e) {
        // no op
      }
    },
    [setEndVisible],
  );

  return (
    <div className="size-full p-2 flex flex-col">
      <div className="flex justify-between items-center">
        <ToggleGroup
          className="*:px-3 *:py-4 *:rounded-2xl"
          type="single"
          size="sm"
          value={logService}
          onValueChange={(value: LogType) =>
            value ? setLogService(value) : null
          } // don't allow the severity to be unselected
        >
          {Object.values(logTypes).map((item) => (
            <ToggleGroupItem
              key={item}
              className={`flex items-center justify-between gap-2 ${logService == item ? "" : "text-gray-500"}`}
              value={item}
              aria-label={`Select ${item}`}
            >
              <div className="capitalize">{`${item} Logs`}</div>
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

      {!endVisible && (
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
        className="w-full h-min my-2 font-mono text-sm bg-secondary rounded p-2 whitespace-pre-wrap overflow-auto"
      >
        {logs}
        <div ref={endLogRef} />
      </div>
    </div>
  );
}

export default Logs;
