import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Heading from "@/components/ui/heading";
import copy from "copy-to-clipboard";
import { useCallback, useMemo, useRef, useState } from "react";
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
    [setEndVisible]
  );

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="flex justify-between items-center">
        <Heading className="first:mt-2" as="h2">
          Logs
        </Heading>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="mx-2 capitalize" variant="outline">
                {logService} Logs
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Select Logs To View</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={logService}
                onValueChange={(type) => setLogService(type as LogType)}
              >
                {Object.values(logTypes).map((item) => (
                  <DropdownMenuRadioItem
                    className="capitalize"
                    key={item}
                    value={item}
                  >
                    {item} Logs
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleCopyLogs}>Copy to Clipboard</Button>
        </div>
      </div>

      {!endVisible && (
        <div
          className="absolute bottom-8 left-[50%] -translate-x-[50%] rounded-xl bg-accent-foreground text-white z-20 p-2"
          onClick={() =>
            contentRef.current?.scrollTo({
              top: contentRef.current?.scrollHeight,
              behavior: "smooth",
            })
          }
        >
          Jump to Bottom
        </div>
      )}

      <div
        ref={contentRef}
        className="absolute left-0 top-16 bottom-2 right-2 overflow-auto font-mono text-sm bg-secondary rounded p-2 whitespace-pre-wrap"
      >
        {logs}
        <div ref={endLogRef} />
      </div>
    </div>
  );
}

export default Logs;
