import { FrigateConfig } from "@/types/frigateConfig";
import { isDesktop } from "react-device-detect";
import useSWR from "swr";
import { MdHome } from "react-icons/md";
import useOverlayState from "@/hooks/use-overlay-state";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { useCallback, useMemo, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { getIconForGroup } from "@/utils/iconUtil";

type CameraGroupSelectorProps = {
  className?: string;
};
export function CameraGroupSelector({ className }: CameraGroupSelectorProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const navigate = useNavigate();

  // tooltip

  const [tooltip, setTooltip] = useState<string>();
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout>();
  const showTooltip = useCallback(
    (newTooltip: string | undefined) => {
      if (!newTooltip) {
        setTooltip(newTooltip);

        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      } else {
        setTimeoutId(setTimeout(() => setTooltip(newTooltip), 500));
      }
    },
    [timeoutId],
  );

  // groups

  const [group, setGroup] = useOverlayState("cameraGroup");

  const groups = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.entries(config.camera_groups).sort(
      (a, b) => a[1].order - b[1].order,
    );
  }, [config]);

  return (
    <div
      className={`flex items-center justify-start gap-2 ${className ?? ""} ${isDesktop ? "flex-col" : ""}`}
    >
      <Tooltip open={tooltip == "home"}>
        <TooltipTrigger asChild>
          <Button
            className={
              group == undefined
                ? "text-selected bg-blue-900 focus:bg-blue-900 bg-opacity-60 focus:bg-opacity-60"
                : "text-muted-foreground bg-secondary focus:text-muted-foreground focus:bg-secondary"
            }
            size="xs"
            onClick={() => navigate(-1)}
            onMouseEnter={() => (isDesktop ? showTooltip("home") : null)}
            onMouseLeave={() => (isDesktop ? showTooltip(undefined) : null)}
          >
            <MdHome className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="capitalize" side="right">
          Home
        </TooltipContent>
      </Tooltip>
      {groups.map(([name, config]) => {
        return (
          <Tooltip key={name} open={tooltip == name}>
            <TooltipTrigger asChild>
              <Button
                className={
                  group == name
                    ? "text-selected bg-blue-900 focus:bg-blue-900 bg-opacity-60 focus:bg-opacity-60"
                    : "text-muted-foreground bg-secondary"
                }
                size="xs"
                onClick={() => setGroup(name, group != undefined)}
                onMouseEnter={() => (isDesktop ? showTooltip(name) : null)}
                onMouseLeave={() => (isDesktop ? showTooltip(undefined) : null)}
              >
                {getIconForGroup(config.icon)}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="capitalize" side="right">
              {name}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
