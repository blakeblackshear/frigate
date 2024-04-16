import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isDesktop } from "react-device-detect";
import { VscAccount } from "react-icons/vsc";

export default function AccountSettings() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`flex flex-col justify-center items-center ${isDesktop ? "rounded-lg text-secondary-foreground bg-secondary hover:bg-muted cursor-pointer" : "text-secondary-foreground"}`}
        >
          <VscAccount className="size-5 md:m-[6px]" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>Account</p>
      </TooltipContent>
    </Tooltip>
  );
}
