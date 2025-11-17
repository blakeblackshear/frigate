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
import React, { ReactNode, useMemo, useState } from "react";
import TextEntryDialog from "./dialog/TextEntryDialog";
import { Button } from "../ui/button";

type FaceSelectionDialogProps = {
  className?: string;
  faceNames: string[];
  onTrainAttempt: (name: string) => void;
  children: ReactNode;
};
export default function FaceSelectionDialog({
  className,
  faceNames,
  onTrainAttempt,
  children,
}: FaceSelectionDialogProps) {
  const { t } = useTranslation(["views/faceLibrary"]);

  const isChildButton = useMemo(
    () => React.isValidElement(children) && children.type === Button,
    [children],
  );

  // control
  const [newFace, setNewFace] = useState(false);

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

      <Tooltip>
        <Selector>
          <SelectorTrigger asChild>
            <TooltipTrigger asChild={isChildButton}>{children}</TooltipTrigger>
          </SelectorTrigger>
          <SelectorContent
            className={cn("", isMobile && "mx-1 gap-2 rounded-t-2xl px-4")}
          >
            {isMobile && (
              <DrawerHeader className="sr-only">
                <DrawerTitle>Details</DrawerTitle>
                <DrawerDescription>Details</DrawerDescription>
              </DrawerHeader>
            )}
            <DropdownMenuLabel>{t("trainFaceAs")}</DropdownMenuLabel>
            <div
              className={cn(
                "flex max-h-[40dvh] flex-col overflow-y-auto overflow-x-hidden",
                isMobile && "gap-2 pb-4",
              )}
            >
              {faceNames.sort().map((faceName) => (
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
        <TooltipContent>{t("trainFace")}</TooltipContent>
      </Tooltip>
    </div>
  );
}
