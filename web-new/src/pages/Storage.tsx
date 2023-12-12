import { useWs } from "@/api/ws";
import ActivityIndicator from "@/components/ui/activity-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Heading from "@/components/ui/heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMemo } from "react";
import { LuAlertCircle } from "react-icons/lu";
import useSWR from "swr";

type CameraStorage = {
  [key: string]: {
    bandwidth: number;
    usage: number;
    usage_percent: number;
  };
};

const emptyObject = Object.freeze({});

function Storage() {
  const { data: storage } = useSWR<CameraStorage>("recordings/storage");

  const {
    value: { payload: stats },
  } = useWs("stats", "");
  const { data: initialStats } = useSWR("stats");

  const { service } = stats || initialStats || emptyObject;

  const hasSeparateMedia = useMemo(() => {
    return (
      service &&
      service["storage"]["/media/frigate/recordings"]["total"] !=
        service["storage"]["/media/frigate/clips"]["total"]
    );
  }, service);

  const getUnitSize = (MB: number) => {
    if (isNaN(MB) || MB < 0) return "Invalid number";
    if (MB < 1024) return `${MB} MiB`;
    if (MB < 1048576) return `${(MB / 1024).toFixed(2)} GiB`;

    return `${(MB / 1048576).toFixed(2)} TiB`;
  };

  if (!service || !storage) {
    return <ActivityIndicator />;
  }

  return (
    <>
      <Heading as="h2">Storage</Heading>

      <Heading as="h3">Overview</Heading>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
          <div className="flex bg-center snap-center text-center items-center">
              <CardTitle>Data</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <LuAlertCircle />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Overview of total used storage and total capacity of the drives that hold the recordings and snapshots directories.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    {hasSeparateMedia ? "Recordings" : "Recordings & Snapshots"}
                  </TableCell>
                  <TableCell>
                    {getUnitSize(
                      service["storage"]["/media/frigate/recordings"]["used"]
                    )}
                  </TableCell>
                  <TableCell>
                    {getUnitSize(
                      service["storage"]["/media/frigate/recordings"]["total"]
                    )}
                  </TableCell>
                </TableRow>
                {hasSeparateMedia && (
                  <TableRow>
                    <TableCell>Snapshots</TableCell>
                    <TableCell>
                      {getUnitSize(
                        service["storage"]["/media/frigate/clips"]["used"]
                      )}
                    </TableCell>
                    <TableCell>
                      {getUnitSize(
                        service["storage"]["/media/frigate/clips"]["total"]
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex bg-center snap-center text-center items-center">
              <CardTitle>Memory</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <LuAlertCircle />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Overview of used and total memory in frigate process.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>/dev/shm</TableCell>
                  <TableCell>
                    {getUnitSize(service["storage"]["/dev/shm"]["used"])}
                  </TableCell>
                  <TableCell>
                    {getUnitSize(service["storage"]["/dev/shm"]["total"])}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>/tmp/cache</TableCell>
                  <TableCell>
                    {getUnitSize(service["storage"]["/tmp/cache"]["used"])}
                  </TableCell>
                  <TableCell>
                    {getUnitSize(service["storage"]["/tmp/cache"]["total"])}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default Storage;
