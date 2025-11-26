import {
  MobilePage,
  MobilePageContent,
  MobilePageHeader,
  MobilePagePortal,
  MobilePageTitle,
  MobilePageTrigger,
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
import { cn } from "@/lib/utils";
import { isMobile } from "react-device-detect";
import { useRef } from "react";

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
        <DrawerContent className="max-h-[75dvh] overflow-hidden">
          <div className={contentClassName}>{content}</div>
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
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (isMobile) {
    return (
      <MobilePage open={open} onOpenChange={onOpenChange}>
        <MobilePageTrigger onClick={() => onOpenChange(true)}>
          {trigger}
        </MobilePageTrigger>
        <MobilePagePortal>
          <MobilePageContent
            className="flex h-full flex-col"
            scrollerRef={scrollerRef}
          >
            <MobilePageHeader
              className="mx-2"
              onClose={() => onOpenChange(false)}
            >
              <MobilePageTitle>{title}</MobilePageTitle>
            </MobilePageHeader>
            <div
              ref={scrollerRef}
              className={cn("flex-1 overflow-y-auto", contentClassName)}
            >
              {content}
            </div>
          </MobilePageContent>
        </MobilePagePortal>
      </MobilePage>
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      modal={false}
      enableHistoryBack
    >
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
