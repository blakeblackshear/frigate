import { baseUrl } from "@/api/baseUrl";
import ExportCard from "@/components/card/ExportCard";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useCallback, useState } from "react";
import useSWR from "swr";

type ExportItem = {
  name: string;
};

function Export() {
  const { data: exports, mutate } = useSWR<ExportItem[]>(
    "exports/",
    (url: string) => axios({ baseURL: baseUrl, url }).then((res) => res.data),
  );

  const [deleteClip, setDeleteClip] = useState<string | undefined>();

  const onHandleRename = useCallback(
    (original: string, update: string) => {
      axios.patch(`export/${original}/${update}`).then((response) => {
        if (response.status == 200) {
          setDeleteClip(undefined);
          mutate();
        }
      });
    },
    [mutate],
  );

  const onHandleDelete = useCallback(() => {
    if (!deleteClip) {
      return;
    }

    axios.delete(`export/${deleteClip}`).then((response) => {
      if (response.status == 200) {
        setDeleteClip(undefined);
        mutate();
      }
    });
  }, [deleteClip, mutate]);

  return (
    <div className="size-full p-2 overflow-hidden flex flex-col">
      <AlertDialog
        open={deleteClip != undefined}
        onOpenChange={() => setDeleteClip(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Export</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm deletion of {deleteClip}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={() => onHandleDelete()}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="w-full overflow-hidden">
        {exports && (
          <div className="size-full grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 overflow-y-auto">
            {Object.values(exports).map((item) => (
              <ExportCard
                key={item.name}
                file={item}
                onRename={onHandleRename}
                onDelete={(file) => setDeleteClip(file)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Export;
