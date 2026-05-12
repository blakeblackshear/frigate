import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isDesktop, isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import React, { ReactNode, useCallback, useMemo, useState } from "react";
import TextEntryDialog from "./dialog/TextEntryDialog";
import { Button } from "../ui/button";

type FaceSelectionDialogProps = {
  className?: string;
  faceNames: string[];
  excludeName?: string;
  dialogLabel?: string;
  tooltipLabel?: string;
  onTrainAttempt: (name: string) => void;
  children: ReactNode;
};
export default function FaceSelectionDialog({
  className,
  faceNames,
  excludeName,
  dialogLabel,
  tooltipLabel,
  onTrainAttempt,
  children,
}: FaceSelectionDialogProps) {
  const { t } = useTranslation(["views/faceLibrary"]);

  const filteredNames = useMemo(
    () =>
      excludeName ? faceNames.filter((n) => n !== excludeName) : faceNames,
    [faceNames, excludeName],
  );

  const isChildButton = useMemo(
    () => React.isValidElement(children) && children.type === Button,
    [children],
  );

  // control
  const [newFace, setNewFace] = useState(false);

  // Non-modal Radix DropdownMenu doesn't propagate wheel events to nested
  // scroll containers, so attach a non-passive listener that scrolls manually.
  const scrollContainerRef = useCallback((el: HTMLDivElement | null) => {
    if (!el || !isDesktop) return;
    const handleWheel = (e: WheelEvent) => {
      if (el.scrollHeight <= el.clientHeight) return;
      e.preventDefault();
      el.scrollTop += e.deltaY;
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // components
  const Selector = isDesktop ? DropdownMenu : Drawer;
  const SelectorTrigger = isDesktop ? DropdownMenuTrigger : DrawerTrigger;
  const SelectorContent = isDesktop ? DropdownMenuContent : DrawerContent;
  const SelectorItem = isDesktop
    ? DropdownMenuItem
    : (props: React.HTMLAttributes<HTMLDivElement>) => (
        <DrawerClose asChild>
          <div {...props} className={cn(props.className, "my-2")} />
        </DrawerClose>
      );

  return (
    <div className={className ?? "flex"}>
      {newFace && (
        <TextEntryDialog
          open={true}
          setOpen={setNewFace}
          title={t("createFaceLibrary.new")}
          onSave={(newName) => onTrainAttempt(newName)}
        />
      )}
      // keep modal false on desktop to prevent dismissable layer pointer events
      // issue with dialog auto-close
      <Selector {...(isDesktop ? { modal: false } : {})}>
        <Tooltip>
          <TooltipTrigger asChild={isChildButton}>
            <SelectorTrigger asChild>{children}</SelectorTrigger>
          </TooltipTrigger>
          <TooltipContent>{tooltipLabel ?? t("trainFace")}</TooltipContent>
        </Tooltip>
        <SelectorContent
          ref={scrollContainerRef}
          className={cn(
            isDesktop && "scrollbar-container max-h-[40dvh] overflow-y-auto",
            isMobile && "mx-1 gap-2 rounded-t-2xl px-4",
          )}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {isMobile && (
            <DrawerHeader className="sr-only">
              <DrawerTitle>Details</DrawerTitle>
              <DrawerDescription>Details</DrawerDescription>
            </DrawerHeader>
          )}
          <DropdownMenuLabel>
            {dialogLabel ?? t("trainFaceAs")}
          </DropdownMenuLabel>
          <div
            className={cn(
              "flex flex-col",
              isMobile &&
                "max-h-[40dvh] gap-2 overflow-y-auto overflow-x-hidden pb-4",
            )}
          >
            {filteredNames.sort().map((faceName) => (
              <SelectorItem
                key={faceName}
                className="flex cursor-pointer gap-2 smart-capitalize"
                onClick={() => onTrainAttempt(faceName)}
              >
                {faceName}
              </SelectorItem>
            ))}
            <DropdownMenuSeparator />
            <SelectorItem
              className="flex cursor-pointer gap-2 smart-capitalize"
              onClick={() => setNewFace(true)}
            >
              {t("createFaceLibrary.new")}
            </SelectorItem>
          </div>
        </SelectorContent>
      </Selector>
    </div>
  );
}
