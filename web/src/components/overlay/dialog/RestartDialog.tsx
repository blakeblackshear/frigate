import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
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
  const [restartDialogOpen, setRestartDialogOpen] = useState(isOpen);
  const [restartingSheetOpen, setRestartingSheetOpen] = useState(false);
  const [countdown, setCountdown] = useState(60);

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
        onOpenChange={() => {
          setRestartDialogOpen(false);
          onClose();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to restart Frigate?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestart}>
              Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet
        open={restartingSheetOpen}
        onOpenChange={() => setRestartingSheetOpen(false)}
      >
        <SheetContent side="top" onInteractOutside={(e) => e.preventDefault()}>
          <div className="flex flex-col items-center">
            <ActivityIndicator />
            <SheetHeader className="mt-5 text-center">
              <SheetTitle className="text-center">
                Frigate is Restarting
              </SheetTitle>
              <SheetDescription className="text-center">
                <div>This page will reload in {countdown} seconds.</div>
              </SheetDescription>
            </SheetHeader>
            <Button
              size="lg"
              className="mt-5"
              aria-label="Force reload now"
              onClick={handleForceReload}
            >
              Force Reload Now
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
