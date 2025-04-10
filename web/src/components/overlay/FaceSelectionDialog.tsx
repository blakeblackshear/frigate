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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isDesktop, isMobile } from "react-device-detect";
import { LuPlus, LuScanFace } from "react-icons/lu";
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
  const SelectorItem = isDesktop ? DropdownMenuItem : DrawerClose;

  return (
    <div className={className ?? ""}>
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
            className={cn(
              "max-h-[75dvh] overflow-hidden",
              isMobile && "mx-1 gap-2 rounded-t-2xl px-4",
            )}
          >
            {isMobile && (
              <DrawerHeader className="sr-only">
                <DrawerTitle>Log Details</DrawerTitle>
                <DrawerDescription>Log details</DrawerDescription>
              </DrawerHeader>
            )}
            <DropdownMenuLabel>{t("trainFaceAs")}</DropdownMenuLabel>
            <div
              className={cn(
                "flex flex-col",
                isMobile && "gap-2 overflow-y-auto pb-4",
              )}
            >
              <SelectorItem
                className="flex cursor-pointer gap-2 capitalize"
                onClick={() => setNewFace(true)}
              >
                <LuPlus />
                {t("createFaceLibrary.new")}
              </SelectorItem>
              {faceNames.map((faceName) => (
                <SelectorItem
                  key={faceName}
                  className="flex cursor-pointer gap-2 capitalize"
                  onClick={() => onTrainAttempt(faceName)}
                >
                  <LuScanFace />
                  {faceName}
                </SelectorItem>
              ))}
            </div>
          </SelectorContent>
        </Selector>
        <TooltipContent>{t("trainFace")}</TooltipContent>
      </Tooltip>
    </div>
  );
}
