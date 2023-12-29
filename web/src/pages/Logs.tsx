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
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";

const logTypes = ["frigate", "go2rtc", "nginx"] as const;
type LogType = (typeof logTypes)[number];

function Logs() {
  const [logService, setLogService] = useState<LogType>("frigate");
  const [logs, setLogs] = useState("frigate");

  const { data: frigateLogs } = useSWR("logs/frigate");
  const { data: go2rtcLogs } = useSWR("logs/go2rtc");
  const { data: nginxLogs } = useSWR("logs/nginx");

  const handleCopyLogs = useCallback(() => {
    copy(logs);
  }, [logs]);

  useEffect(() => {
    switch (logService) {
      case "frigate":
        setLogs(frigateLogs);
        break;
      case "go2rtc":
        setLogs(go2rtcLogs);
        break;
      case "nginx":
        setLogs(nginxLogs);
        break;
    }
  }, [frigateLogs, go2rtcLogs, nginxLogs, logService, setLogs]);

  return (
    <>
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

      <div className="overflow-auto font-mono text-sm bg-secondary rounded my-2 p-2 whitespace-pre-wrap">
        {logs}
      </div>
    </>
  );
}

export default Logs;
