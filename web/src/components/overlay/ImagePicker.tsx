import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IoClose } from "react-icons/io5";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Heading from "@/components/ui/heading";
import { cn } from "@/lib/utils";
import { Event } from "@/types/event";
import { useApiHost } from "@/api";
import { isDesktop, isMobile } from "react-device-detect";

type ImagePickerProps = {
  selectedImageId?: string;
  setSelectedImageId?: (id: string) => void;
  camera: string;
};

export default function ImagePicker({
  selectedImageId,
  setSelectedImageId,
  camera,
}: ImagePickerProps) {
  const { t } = useTranslation(["components/dialog"]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: events } = useSWR<Event[]>(
    `events?camera=${camera}&limit=100`,
    {
      revalidateOnFocus: false,
    },
  );
  const apiHost = useApiHost();

  const images = useMemo(() => {
    if (!events) return [];
    return events.filter(
      (event) =>
        (event.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (event.sub_label &&
            event.sub_label.toLowerCase().includes(searchTerm.toLowerCase())) ||
          searchTerm === "") &&
        event.camera === camera,
    );
  }, [events, searchTerm, camera]);

  const selectedImage = useMemo(
    () => images.find((img) => img.id === selectedImageId),
    [images, selectedImageId],
  );

  const handleImageSelect = useCallback(
    (id: string) => {
      if (setSelectedImageId) {
        setSelectedImageId(id);
      }
      setSearchTerm("");
      setOpen(false);
    },
    [setSelectedImageId],
  );

  return (
    <div ref={containerRef}>
      <Dialog
        open={open}
        onOpenChange={(open) => {
          setOpen(open);
        }}
      >
        <DialogTrigger asChild>
          {!selectedImageId ? (
            <Button
              className="mt-2 w-full text-muted-foreground"
              aria-label={t("imagePicker.selectImage")}
            >
              {t("imagePicker.selectImage")}
            </Button>
          ) : (
            <div className="hover:cursor-pointer">
              <div className="my-3 flex w-full flex-row items-center justify-between gap-2">
                <div className="flex flex-row items-center gap-2">
                  <img
                    src={
                      selectedImage
                        ? `${apiHost}api/events/${selectedImage.id}/thumbnail.webp`
                        : `${apiHost}clips/triggers/${camera}/${selectedImageId}.webp`
                    }
                    alt={selectedImage?.label || "Selected image"}
                    className="h-8 w-8 rounded object-cover"
                  />
                  <div className="text-sm smart-capitalize">
                    {selectedImage?.label || selectedImageId}
                    {selectedImage?.sub_label
                      ? ` (${selectedImage.sub_label})`
                      : ""}
                  </div>
                </div>
                <IoClose
                  className="mx-2 hover:cursor-pointer"
                  onClick={() => {
                    if (setSelectedImageId) {
                      setSelectedImageId("");
                    }
                  }}
                />
              </div>
            </div>
          )}
        </DialogTrigger>
        <DialogTitle className="sr-only">
          {t("imagePicker.selectImage")}
        </DialogTitle>
        <DialogContent
          className={cn(
            "scrollbar-container overflow-y-auto",
            isDesktop && "max-h-[75dvh] sm:max-w-xl md:max-w-3xl",
            isMobile && "px-4",
          )}
        >
          <div className="mb-3 flex flex-row items-center justify-between">
            <Heading as="h4">{t("imagePicker.selectImage")}</Heading>
            <span tabIndex={0} className="sr-only" />
          </div>
          <Input
            type="text"
            placeholder={t("imagePicker.search.placeholder")}
            className="text-md mb-3 md:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="scrollbar-container flex h-full flex-col overflow-y-auto">
            <div className="grid grid-cols-3 gap-2 pr-1">
              {images.length === 0 ? (
                <div className="col-span-3 text-center text-sm text-muted-foreground">
                  {t("imagePicker.noImages")}
                </div>
              ) : (
                images.map((image) => (
                  <div
                    key={image.id}
                    className={cn(
                      "flex flex-row items-center justify-center rounded-lg p-1 hover:cursor-pointer",
                      selectedImageId === image.id
                        ? "bg-selected text-white"
                        : "hover:bg-secondary-foreground",
                    )}
                  >
                    <img
                      src={`${apiHost}api/events/${image.id}/thumbnail.webp`}
                      alt={image.label}
                      className="rounded object-cover"
                      onClick={() => handleImageSelect(image.id)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
