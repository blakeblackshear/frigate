import { baseUrl } from "@/api/baseUrl";
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
import { Event } from "@/types/event";
import axios from "axios";
import { useCallback, useState } from "react";
import useSWR from "swr";

export default function SubmitPlus() {
  const { data: events, mutate: refresh } = useSWR<Event[]>([
    "events",
    { limit: 100, in_progress: 0, is_submitted: 0 },
  ]);
  const [upload, setUpload] = useState<Event>();

  const onSubmitToPlus = useCallback(
    async (falsePositive: boolean) => {
      if (!upload) {
        return;
      }

      const resp = (await falsePositive)
        ? await axios.put(`events/${upload.id}/false_positive`)
        : await axios.post(`events/${upload.id}/plus`, {
            include_annotation: 1,
          });

      if (resp.status == 200) {
        refresh();
      }
    },
    [refresh, upload],
  );

  return (
    <div className="size-full p-2 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 overflow-auto">
      <AlertDialog
        open={upload != undefined}
        onOpenChange={(open) => (!open ? setUpload(undefined) : null)}
      >
        <AlertDialogContent className="md:max-w-4xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Submit To Frigate+</AlertDialogTitle>
            <AlertDialogDescription>
              Objects in locations you want to avoid are not false positives.
              Submitting them as false positives will confuse the model.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <img
            className="flex-grow-0"
            src={`${baseUrl}api/events/${upload?.id}/snapshot.jpg`}
            alt={`${upload?.label}`}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-success"
              onClick={() => onSubmitToPlus(false)}
            >
              This is a {upload?.label}
            </AlertDialogAction>
            <AlertDialogAction
              className="bg-danger"
              onClick={() => onSubmitToPlus(true)}
            >
              This is not a {upload?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {events?.map((event) => {
        return (
          <div
            className="size-full aspect-video rounded-2xl flex justify-center items-center bg-black cursor-pointer"
            onClick={() => setUpload(event)}
          >
            <img
              className="h-full object-contain rounded-2xl"
              src={`${baseUrl}api/events/${event.id}/snapshot.jpg`}
            />
          </div>
        );
      })}
    </div>
  );
}
