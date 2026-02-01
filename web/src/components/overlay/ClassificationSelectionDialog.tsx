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
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import React, { ReactNode, useCallback, useMemo, useState } from "react";
import TextEntryDialog from "./dialog/TextEntryDialog";
import { Button } from "../ui/button";
import axios from "axios";
import { toast } from "sonner";
import { Separator } from "../ui/separator";

type ClassificationSelectionDialogProps = {
  className?: string;
  classes: string[];
  modelName: string;
  image: string;
  onRefresh: () => void;
  children: ReactNode;
};
export default function ClassificationSelectionDialog({
  className,
  classes,
  modelName,
  image,
  onRefresh,
  children,
}: ClassificationSelectionDialogProps) {
  const { t } = useTranslation(["views/classificationModel"]);

  const onCategorizeImage = useCallback(
    (category: string) => {
      axios
        .post(`/classification/${modelName}/dataset/categorize`, {
          category,
          training_file: image,
        })
        .then((resp) => {
          if (resp.status == 200) {
            toast.success(t("toast.success.categorizedImage"), {
              position: "top-center",
            });
            onRefresh();
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(t("toast.error.categorizeFailed", { errorMessage }), {
            position: "top-center",
          });
        });
    },
    [modelName, image, onRefresh, t],
  );

  const isChildButton = useMemo(
    () => React.isValidElement(children) && children.type === Button,
    [children],
  );

  // control
  const [newClass, setNewClass] = useState(false);

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
      <TextEntryDialog
        open={newClass}
        setOpen={setNewClass}
        title={t("createCategory.new")}
        onSave={(newCat) => onCategorizeImage(newCat)}
      />

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
            <DropdownMenuLabel>{t("categorizeImageAs")}</DropdownMenuLabel>
            <div
              className={cn(
                "flex max-h-[40dvh] flex-col overflow-y-auto",
                isMobile && "gap-2 pb-4",
              )}
            >
              {classes.sort().map((category) => (
                <SelectorItem
                  key={category}
                  className="flex cursor-pointer gap-2 smart-capitalize"
                  onClick={() => onCategorizeImage(category)}
                >
                  {category === "none"
                    ? t("details.none")
                    : category.replaceAll("_", " ")}
                </SelectorItem>
              ))}
              <Separator />
              <SelectorItem
                className="flex cursor-pointer gap-2 smart-capitalize"
                onClick={() => setNewClass(true)}
              >
                {t("createCategory.new")}
              </SelectorItem>
            </div>
          </SelectorContent>
        </Selector>
        <TooltipContent>{t("categorizeImage")}</TooltipContent>
      </Tooltip>
    </div>
  );
}
