import { useState, useEffect } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { baseUrl } from "@/api/baseUrl";

import { useTranslation } from "react-i18next";

type RestartDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onRestart: () => void;
};

export default function RestartDialog({
  isOpen,
  onClose,
  onRestart,
}: RestartDialogProps) {
  const { t } = useTranslation("components/dialog");
  const [restartDialogOpen, setRestartDialogOpen] = useState(isOpen);
  const [restartingSheetOpen, setRestartingSheetOpen] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const clearBodyPointerEvents = () => {
    if (typeof document !== "undefined") {
      document.body.style.pointerEvents = "";
    }
  };

  useEffect(() => {
    setRestartDialogOpen(isOpen);
  }, [isOpen]);

  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;

    if (restartingSheetOpen) {
      countdownInterval = setInterval(() => {
        setCountdown((prevCountdown) => prevCountdown - 1);
      }, 1000);
    }

    return () => {
      clearInterval(countdownInterval);
    };
  }, [restartingSheetOpen]);

  useEffect(() => {
    if (countdown === 0) {
      window.location.href = baseUrl;
    }
  }, [countdown]);

  const handleRestart = () => {
    setRestartingSheetOpen(true);
    onRestart();
  };

  const handleForceReload = () => {
    window.location.href = baseUrl;
  };

  return (
    <>
      <AlertDialog
        open={restartDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRestartDialogOpen(false);
            onClose();
            clearBodyPointerEvents();
          }
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            clearBodyPointerEvents();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t("restart.title")}</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              {t("restart.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("button.cancel", { ns: "common" })}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRestart}>
              {t("restart.button")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet
        open={restartingSheetOpen}
        onOpenChange={() => setRestartingSheetOpen(false)}
      >
        <SheetContent
          side="top"
          onInteractOutside={(e) => e.preventDefault()}
          className="[&>button:first-of-type]:hidden"
        >
          <div className="flex flex-col items-center">
            <ActivityIndicator />
            <SheetHeader className="mt-5 text-center">
              <SheetTitle className="text-center">
                {t("restart.restarting.title")}
              </SheetTitle>
              <SheetDescription className="text-center">
                <div>
                  {t("restart.restarting.content", {
                    countdown,
                  })}
                </div>
              </SheetDescription>
            </SheetHeader>
            <Button
              size="lg"
              className="mt-5"
              aria-label={t("restart.restarting.button")}
              onClick={handleForceReload}
            >
              {t("restart.restarting.button")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
