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
import { Input } from "@/components/ui/input";
import axios from "axios";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";

type ExportItem = {
  name: string;
};

function Export() {
  const { data: allExports, mutate } = useSWR<ExportItem[]>(
    "exports/",
    (url: string) => axios({ baseURL: baseUrl, url }).then((res) => res.data),
  );

  // Search

  const [search, setSearch] = useState("");

  const exports = useMemo(() => {
    if (!search || !allExports) {
      return allExports;
    }

    return allExports.filter((exp) =>
      exp.name
        .toLowerCase()
        .includes(search.toLowerCase().replaceAll(" ", "_")),
    );
  }, [allExports, search]);

  // Deleting

  const [deleteClip, setDeleteClip] = useState<string | undefined>();

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

  // Renaming

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

  return (
    <div className="size-full p-2 overflow-hidden flex flex-col gap-2">
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

      <div className="w-full p-2 flex items-center justify-center">
        <Input
          className="w-full md:w-1/3 bg-muted"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="w-full overflow-hidden">
        {allExports && exports && (
          <div className="size-full grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 overflow-y-auto">
            {Object.values(allExports).map((item) => (
              <ExportCard
                key={item.name}
                className={
                  search == "" || exports.includes(item) ? "" : "hidden"
                }
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
