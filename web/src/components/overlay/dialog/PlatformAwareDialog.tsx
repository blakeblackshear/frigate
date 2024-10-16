import {
  MobilePage,
  MobilePageContent,
  MobilePageHeader,
  MobilePageTitle,
} from "@/components/mobile/MobilePage";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
        <DrawerContent className="max-h-[75dvh] overflow-hidden px-4">
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

type PlatformAwareSheetProps = {
  trigger: JSX.Element;
  title?: string | JSX.Element;
  content: JSX.Element;
  triggerClassName?: string;
  titleClassName?: string;
  contentClassName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};
export function PlatformAwareSheet({
  trigger,
  title,
  content,
  triggerClassName = "",
  titleClassName = "",
  contentClassName = "",
  open,
  onOpenChange,
}: PlatformAwareSheetProps) {
  if (isMobile) {
    return (
      <div>
        <div onClick={() => onOpenChange(true)}>{trigger}</div>
        <MobilePage open={open} onOpenChange={onOpenChange}>
          <MobilePageContent className="h-full overflow-hidden">
            <MobilePageHeader
              className="mx-2"
              onClose={() => onOpenChange(false)}
            >
              <MobilePageTitle>More Filters</MobilePageTitle>
            </MobilePageHeader>
            <div className={contentClassName}>{content}</div>
          </MobilePageContent>
        </MobilePage>
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetTrigger asChild className={triggerClassName}>
        {trigger}
      </SheetTrigger>
      <SheetContent className={contentClassName}>
        <SheetHeader>
          <SheetTitle className={title ? titleClassName : "sr-only"}>
            {title ?? ""}
          </SheetTitle>
          <SheetDescription className="sr-only">Information</SheetDescription>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}
