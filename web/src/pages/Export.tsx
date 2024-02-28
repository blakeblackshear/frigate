import { baseUrl } from "@/api/baseUrl";
import ExportCard from "@/components/card/ExportCard";
import VideoPlayer from "@/components/player/VideoPlayer";
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
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenuRadioGroup,
  DropdownMenuTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import Heading from "@/components/ui/heading";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Toaster } from "@/components/ui/sonner";
import { FrigateConfig } from "@/types/frigateConfig";
import axios from "axios";
import { format } from "date-fns";
import { useCallback, useState } from "react";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import useSWR from "swr";

type ExportItem = {
  name: string;
};

function Export() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { data: exports, mutate } = useSWR<ExportItem[]>(
    "exports/",
    (url: string) => axios({ baseURL: baseUrl, url }).then((res) => res.data),
  );

  // Export States
  const [camera, setCamera] = useState<string | undefined>();
  const [playback, setPlayback] = useState<string | undefined>();

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const [date, setDate] = useState<DateRange | undefined>({
    from: currentDate,
  });
  const [startTime, setStartTime] = useState("00:00:00");
  const [endTime, setEndTime] = useState("23:59:59");

  const [selectedClip, setSelectedClip] = useState<string | undefined>();
  const [deleteClip, setDeleteClip] = useState<string | undefined>();

  const onHandleExport = () => {
    if (!camera) {
      toast.error("A camera needs to be selected.", { position: "top-center" });
      return;
    }

    if (!playback) {
      toast.error("A playback factor needs to be selected.", {
        position: "top-center",
      });
      return;
    }

    if (!date?.from || !startTime || !endTime) {
      toast.error("A start and end time needs to be selected", {
        position: "top-center",
      });
      return;
    }

    const startDate = new Date(date.from.getTime());
    const [startHour, startMin, startSec] = startTime.split(":");
    startDate.setHours(
      parseInt(startHour),
      parseInt(startMin),
      parseInt(startSec),
      0,
    );
    const start = startDate.getTime() / 1000;
    const endDate = new Date((date.to || date.from).getTime());
    const [endHour, endMin, endSec] = endTime.split(":");
    endDate.setHours(parseInt(endHour), parseInt(endMin), parseInt(endSec), 0);
    const end = endDate.getTime() / 1000;

    if (end <= start) {
      toast.error("The end time must be after the start time.", {
        position: "top-center",
      });
      return;
    }

    axios
      .post(`export/${camera}/start/${start}/end/${end}`, { playback })
      .then((response) => {
        if (response.status == 200) {
          toast.success(
            "Successfully started export. View the file in the /exports folder.",
            { position: "top-center" },
          );
        }

        mutate();
      })
      .catch((error) => {
        if (error.response?.data?.message) {
          toast.error(
            `Failed to start export: ${error.response.data.message}`,
            { position: "top-center" },
          );
        } else {
          toast.error(`Failed to start export: ${error.message}`, {
            position: "top-center",
          });
        }
      });
  };

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
    <div className="w-full h-full overflow-hidden">
      <Toaster />

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

      <Dialog
        open={selectedClip != undefined}
        onOpenChange={() => setSelectedClip(undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Playback</DialogTitle>
          </DialogHeader>
          <VideoPlayer
            options={{
              preload: "auto",
              autoplay: true,
              sources: [
                {
                  src: `${baseUrl}exports/${selectedClip}`,
                  type: "video/mp4",
                },
              ],
            }}
            seekOptions={{ forward: 10, backward: 5 }}
          />
        </DialogContent>
      </Dialog>

      <div className="w-full h-full xl:flex justify-between overflow-hidden">
        <div>
          <div className="my-2 flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="capitalize" variant="outline">
                  {camera?.replaceAll("_", " ") || "Select A Camera"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Select A Camera</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={camera}
                  onValueChange={setCamera}
                >
                  {Object.keys(config?.cameras || {}).map((item) => (
                    <DropdownMenuRadioItem
                      className="capitalize"
                      key={item}
                      value={item}
                    >
                      {item.replaceAll("_", " ")}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="mx-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="capitalize" variant="outline">
                    {playback?.split("_")[0] || "Select A Playback Factor"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>
                    Select A Playback Factor
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={playback}
                    onValueChange={setPlayback}
                  >
                    <DropdownMenuRadioItem value="realtime">
                      Realtime
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="timelapse_25x">
                      Timelapse
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">{`${
                date?.from ? format(date?.from, "LLL dd, y") : ""
              } ${startTime} -> ${
                date?.to ? format(date?.to, "LLL dd, y") : ""
              } ${endTime}`}</Button>
            </PopoverTrigger>
            <PopoverContent className="w-84">
              <Calendar mode="range" selected={date} onSelect={setDate} />
              <div className="flex justify-between">
                <input
                  className="p-1 border border-input bg-background text-secondary-foreground hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                  id="startTime"
                  type="time"
                  value={startTime}
                  step="1"
                  onChange={(e) => setStartTime(e.target.value)}
                />
                <input
                  className="p-1 mx-2 border border-input bg-background text-secondary-foreground hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                  id="endTime"
                  type="time"
                  value={endTime}
                  step="1"
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </PopoverContent>
          </Popover>
          <div>
            <Button className="my-4" onClick={() => onHandleExport()}>
              Submit
            </Button>
          </div>
        </div>

        {exports && (
          <Card className="h-full p-4 xl:w-1/2 overflow-y-auto">
            <Heading as="h3">Exports</Heading>
            {Object.values(exports).map((item) => (
              <ExportCard
                key={item.name}
                file={item}
                onSelect={(file) => setSelectedClip(file)}
                onDelete={(file) => setDeleteClip(file)}
              />
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

export default Export;
