import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { isDesktop } from "react-device-detect";
import { VscAccount } from "react-icons/vsc";

type AccountSettingsProps = {
  className?: string;
};
export default function AccountSettings({ className }: AccountSettingsProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex flex-col items-center justify-center",
            isDesktop
              ? "cursor-pointer rounded-lg bg-secondary text-secondary-foreground hover:bg-muted"
              : "text-secondary-foreground",
            className,
          )}
        >
          <VscAccount className="size-5 md:m-[6px]" />
        </div>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent side="right">
          <p>Account</p>
        </TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}
