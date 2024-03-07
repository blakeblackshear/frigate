import { baseUrl } from "@/api/baseUrl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

      falsePositive
        ? axios.put(`events/${upload.id}/false_positive`)
        : axios.post(`events/${upload.id}/plus`, {
            include_annotation: 1,
          });

      refresh(
        (data: Event[] | undefined) => {
          if (!data) {
            return data;
          }

          const index = data.findIndex((e) => e.id == upload.id);

          if (index == -1) {
            return data;
          }

          return [...data.slice(0, index), ...data.slice(index + 1)];
        },
        { revalidate: false, populateCache: true },
      );
      setUpload(undefined);
    },
    [refresh, upload],
  );

  return (
    <div className="size-full p-2 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 overflow-auto">
      <Dialog
        open={upload != undefined}
        onOpenChange={(open) => (!open ? setUpload(undefined) : null)}
      >
        <DialogContent className="md:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Submit To Frigate+</DialogTitle>
            <DialogDescription>
              Objects in locations you want to avoid are not false positives.
              Submitting them as false positives will confuse the model.
            </DialogDescription>
          </DialogHeader>
          <img
            className="flex-grow-0"
            src={`${baseUrl}api/events/${upload?.id}/snapshot.jpg`}
            alt={`${upload?.label}`}
          />
          <DialogFooter>
            <Button>Cancel</Button>
            <Button
              className="bg-success"
              onClick={() => onSubmitToPlus(false)}
            >
              This is a {upload?.label}
            </Button>
            <Button variant="destructive" onClick={() => onSubmitToPlus(true)}>
              This is not a {upload?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {events?.map((event) => {
        return (
          <div
            className="size-full rounded-2xl flex justify-center items-center bg-black cursor-pointer"
            onClick={() => setUpload(event)}
          >
            <img
              className="aspect-video h-full object-contain rounded-2xl"
              src={`${baseUrl}api/events/${event.id}/snapshot.jpg`}
            />
          </div>
        );
      })}
    </div>
  );
}
