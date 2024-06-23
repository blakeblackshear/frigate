import { isDesktop, isIOS } from "react-device-detect";
import { Sheet, SheetContent } from "../ui/sheet";
import { Drawer, DrawerContent } from "../ui/drawer";
import { SearchResult } from "@/types/search";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { getIconForLabel } from "@/utils/iconUtil";
import { useApiHost } from "@/api";
import { Button } from "../ui/button";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Textarea } from "../ui/textarea";

type SearchDetailDialogProps = {
  search?: SearchResult;
  setSearch: (search: SearchResult | undefined) => void;
  setSimilarity?: () => void;
};
export default function SearchDetailDialog({
  search,
  setSearch,
  setSimilarity,
}: SearchDetailDialogProps) {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  const apiHost = useApiHost();

  // data

  const [desc, setDesc] = useState(search?.description);

  // we have to make sure the current selected search item stays in sync
  useEffect(() => setDesc(search?.description), [search]);

  const formattedDate = useFormattedTimestamp(
    search?.start_time ?? 0,
    config?.ui.time_format == "24hour"
      ? "%b %-d %Y, %H:%M"
      : "%b %-d %Y, %I:%M %p",
  );

  // api

  const updateDescription = useCallback(() => {
    if (!search) {
      return;
    }

    axios
      .post(`events/${search.id}/description`, { description: desc })
      .then((resp) => {
        if (resp.status == 200) {
          toast.success("Successfully saved description", {
            position: "top-center",
          });
        }
      })
      .catch(() => {
        toast.error("Failed to update the description", {
          position: "top-center",
        });
        setDesc(search.description);
      });
  }, [desc, search]);

  // content

  const Overlay = isDesktop ? Sheet : Drawer;
  const Content = isDesktop ? SheetContent : DrawerContent;

  return (
    <Overlay
      open={search != undefined}
      onOpenChange={(open) => {
        if (!open) {
          setSearch(undefined);
        }
      }}
    >
      <Content
        className={
          isDesktop ? "sm:max-w-xl" : "max-h-[75dvh] overflow-hidden p-2 pb-4"
        }
      >
        {search && (
          <div className="mt-3 flex size-full flex-col gap-5 md:mt-0">
            <div className="flex w-full flex-row">
              <div className="flex w-full flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="text-sm text-primary/40">Label</div>
                  <div className="flex flex-row items-center gap-2 text-sm capitalize">
                    {getIconForLabel(search.label, "size-4 text-white")}
                    {search.label}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="text-sm text-primary/40">Score</div>
                  <div className="text-sm">
                    {Math.round(search.score * 100)}%
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="text-sm text-primary/40">Camera</div>
                  <div className="text-sm capitalize">
                    {search.camera.replaceAll("_", " ")}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="text-sm text-primary/40">Timestamp</div>
                  <div className="text-sm">{formattedDate}</div>
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 px-6">
                <img
                  className="aspect-video select-none rounded-lg object-contain transition-opacity"
                  style={
                    isIOS
                      ? {
                          WebkitUserSelect: "none",
                          WebkitTouchCallout: "none",
                        }
                      : undefined
                  }
                  draggable={false}
                  src={
                    search.thumb_path
                      ? `${apiHost}${search.thumb_path.replace("/media/frigate/", "")}`
                      : `${apiHost}api/events/${search.id}/thumbnail.jpg`
                  }
                />
                <Button
                  onClick={() => {
                    setSearch(undefined);

                    if (setSimilarity) {
                      setSimilarity();
                    }
                  }}
                >
                  Find Similar
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-sm text-primary/40">Description</div>
              <Textarea
                className="md:h-64"
                placeholder="Description of the event"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
              <div className="flex w-full flex-row justify-end">
                <Button variant="select" onClick={updateDescription}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </Content>
    </Overlay>
  );
}
