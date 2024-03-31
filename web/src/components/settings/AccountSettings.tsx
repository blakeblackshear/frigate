import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VscAccount } from "react-icons/vsc";
import { Button } from "../ui/button";

export default function AccountSettings() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant="ghost">
          <VscAccount />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>Account</p>
      </TooltipContent>
    </Tooltip>
  );
}
