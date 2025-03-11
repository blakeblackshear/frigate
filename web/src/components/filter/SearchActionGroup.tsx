import { useCallback, useState } from "react";
import axios from "axios";
import { Button, buttonVariants } from "../ui/button";
import { isDesktop } from "react-device-detect";
import { HiTrash } from "react-icons/hi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { toast } from "sonner";

type SearchActionGroupProps = {
  selectedObjects: string[];
  setSelectedObjects: (ids: string[]) => void;
  pullLatestData: () => void;
};
export default function SearchActionGroup({
  selectedObjects,
  setSelectedObjects,
  pullLatestData,
}: SearchActionGroupProps) {
  const onClearSelected = useCallback(() => {
    setSelectedObjects([]);
  }, [setSelectedObjects]);

  const onDelete = useCallback(async () => {
    await axios
      .delete(`events/`, {
        data: { event_ids: selectedObjects },
      })
      .then((resp) => {
        if (resp.status == 200) {
          toast.success("Tracked objects deleted successfully.", {
            position: "top-center",
          });
          setSelectedObjects([]);
          pullLatestData();
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(`Failed to delete tracked objects.: ${errorMessage}`, {
          position: "top-center",
        });
      });
  }, [selectedObjects, setSelectedObjects, pullLatestData]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bypassDialog, setBypassDialog] = useState(false);

  useKeyboardListener(["Shift"], (_, modifiers) => {
    setBypassDialog(modifiers.shift);
  });

  const handleDelete = useCallback(() => {
    if (bypassDialog) {
      onDelete();
    } else {
      setDeleteDialogOpen(true);
    }
  }, [bypassDialog, onDelete]);

  return (
    <>
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={() => setDeleteDialogOpen(!deleteDialogOpen)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Deleting these {selectedObjects.length} tracked objects removes the
            snapshot, any saved embeddings, and any associated object lifecycle
            entries. Recorded footage of these tracked objects in History view
            will <em>NOT</em> be deleted.
            <br />
            <br />
            Are you sure you want to proceed?
            <br />
            <br />
            Hold the <em>Shift</em> key to bypass this dialog in the future.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={onDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="absolute inset-x-2 inset-y-0 flex items-center justify-between gap-2 bg-background py-2 md:left-auto">
        <div className="mx-1 flex items-center justify-center text-sm text-muted-foreground">
          <div className="p-1">{`${selectedObjects.length} selected`}</div>
          <div className="p-1">{"|"}</div>
          <div
            className="cursor-pointer p-2 text-primary hover:rounded-lg hover:bg-secondary"
            onClick={onClearSelected}
          >
            Unselect
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Button
            className="flex items-center gap-2 p-2"
            aria-label="Delete"
            size="sm"
            onClick={handleDelete}
          >
            <HiTrash className="text-secondary-foreground" />
            {isDesktop && (
              <div className="text-primary">
                {bypassDialog ? "Delete Now" : "Delete"}
              </div>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
