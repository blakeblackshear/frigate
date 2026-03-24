import Heading from "@/components/ui/heading";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Toaster } from "@/components/ui/sonner";
import { useCallback, useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { toast } from "sonner";
import { StatusBarMessagesContext } from "@/context/statusbar-provider";
import { cn } from "@/lib/utils";

type RegionGridSettingsViewProps = {
  selectedCamera: string;
};

export default function RegionGridSettingsView({
  selectedCamera,
}: RegionGridSettingsViewProps) {
  const { t } = useTranslation("views/settings");
  const { addMessage } = useContext(StatusBarMessagesContext)!;
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [imageKey, setImageKey] = useState(0);

  const handleClear = useCallback(async () => {
    setIsClearing(true);

    try {
      await axios.delete(`${selectedCamera}/region_grid`);
      toast.success(t("maintenance.regionGrid.clearSuccess"), {
        position: "top-center",
      });
      setImageKey((prev) => prev + 1);
      addMessage(
        "region_grid_restart",
        t("maintenance.regionGrid.restartRequired"),
        undefined,
        "region_grid_settings",
      );
    } catch {
      toast.error(t("maintenance.regionGrid.clearError"), {
        position: "top-center",
      });
    } finally {
      setIsClearing(false);
      setIsConfirmOpen(false);
    }
  }, [selectedCamera, t, addMessage]);

  return (
    <>
      <div className="flex size-full flex-col md:flex-row">
        <Toaster position="top-center" closeButton={true} />
        <div className="scrollbar-container order-last mb-2 mt-2 flex h-full w-full flex-col overflow-y-auto px-2 md:order-none">
          <Heading as="h4" className="mb-2 hidden md:block">
            {t("maintenance.regionGrid.title")}
          </Heading>

          <div className="max-w-6xl">
            <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 text-sm text-muted-foreground">
              <p>{t("maintenance.regionGrid.desc")}</p>
            </div>
          </div>

          <div className="mb-4 max-w-5xl rounded-lg border border-secondary">
            <img
              key={imageKey}
              src={`api/${selectedCamera}/grid.jpg?cache=${imageKey}`}
              alt={t("maintenance.regionGrid.title")}
              className="w-full"
            />
          </div>

          <div className="flex w-full flex-row items-center gap-2 py-2 md:w-[50%]">
            <Button
              onClick={() => setIsConfirmOpen(true)}
              disabled={isClearing}
              variant="destructive"
              className="flex flex-1 text-white md:max-w-sm"
            >
              {t("maintenance.regionGrid.clear")}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("maintenance.regionGrid.clearConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("maintenance.regionGrid.clearConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("button.cancel", { ns: "common" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                buttonVariants({ variant: "destructive" }),
                "text-white",
              )}
              onClick={handleClear}
            >
              {t("maintenance.regionGrid.clear")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
