import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { isMobile } from "react-device-detect";

type PlatformAwareDialogProps = {
  trigger: JSX.Element;
  content: JSX.Element;
  triggerClassName?: string;
  contentClassName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};
export default function PlatformAwareDialog({
  trigger,
  content,
  triggerClassName = "",
  contentClassName = "",
  open,
  onOpenChange,
}: PlatformAwareDialogProps) {
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[75dvh] overflow-hidden p-4">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild className={triggerClassName}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className={contentClassName}>{content}</PopoverContent>
    </Popover>
  );
}
