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
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  DropdownMenuRadioGroup,
  DropdownMenuTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { FrigateConfig } from "@/types/frigateConfig";
import axios from "axios";
import { format } from "date-fns";
import { useCallback, useState } from "react";
import { DateRange } from "react-day-picker";
import { isDesktop } from "react-device-detect";
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

  const Create = isDesktop ? Dialog : Drawer;
  const Trigger = isDesktop ? DialogTrigger : DrawerTrigger;
  const Content = isDesktop ? DialogContent : DrawerContent;

  return (
    <div className="size-full p-2 overflow-hidden flex flex-col">
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

      <div className="w-full h-14">
        <Create>
          <Trigger>
            <Button variant="select">New Export</Button>
          </Trigger>
          <Content className="flex flex-col justify-center items-center">
            <div className="w-full flex justify-evenly items-center mt-4 md:mt-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="capitalize" variant="secondary">
                    {camera?.replaceAll("_", " ") || "Select Camera"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel className="flex justify-center items-center">
                    Select Camera
                  </DropdownMenuLabel>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="capitalize" variant="secondary">
                    {playback?.split("_")[0] || "Select Playback"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel className="flex justify-center items-center">
                    Select Playback
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
            <Calendar mode="range" selected={date} onSelect={setDate} />
            <div className="w-full flex justify-evenly">
              <input
                className="w-36 p-1 border border-input bg-background text-secondary-foreground hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                id="startTime"
                type="time"
                value={startTime}
                step="1"
                onChange={(e) => setStartTime(e.target.value)}
              />
              <input
                className="w-36 p-1 mx-2 border border-input bg-background text-secondary-foreground hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                id="endTime"
                type="time"
                value={endTime}
                step="1"
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div className="w-full flex items-center justify-between px-4">
              {`${
                date?.from ? format(date?.from, "LLL dd, y") : ""
              } ${startTime} -> ${
                date?.to ? format(date?.to, "LLL dd, y") : ""
              } ${endTime}`}
              <Button
                className="my-4"
                variant="select"
                onClick={() => onHandleExport()}
              >
                Submit
              </Button>
            </div>
          </Content>
        </Create>
      </div>

      <div className="size-full overflow-hidden">
        {exports && (
          <div className="size-full grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 overflow-y-auto">
            {Object.values(exports).map((item) => (
              <ExportCard
                key={item.name}
                file={item}
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
