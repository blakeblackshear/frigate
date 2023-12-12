import { useWs } from "@/api/ws";
import ActivityIndicator from "@/components/ui/activity-indicator";
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
import { useMemo } from "react";
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
            <CardTitle>Data</CardTitle>
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
            <CardTitle>Memory</CardTitle>
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
