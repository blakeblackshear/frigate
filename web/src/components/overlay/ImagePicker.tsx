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
import ActivityIndicator from "../indicators/activity-indicator";

type ImagePickerProps = {
  selectedImageId?: string;
  setSelectedImageId?: (id: string) => void;
  camera: string;
  limit?: number;
  direct?: boolean;
  className?: string;
};

export default function ImagePicker({
  selectedImageId,
  setSelectedImageId,
  camera,
  limit = 100,
  direct = false,
  className,
}: ImagePickerProps) {
  const { t } = useTranslation(["components/dialog", "views/settings"]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const { data: events } = useSWR<Event[]>(
    `events?camera=${camera}&limit=${limit}`,
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
      if (!direct) {
        setOpen(false);
      }
    },
    [setSelectedImageId, direct],
  );

  const handleImageLoad = useCallback((imageId: string) => {
    setLoadedImages((prev) => new Set(prev).add(imageId));
  }, []);

  const renderSearchInput = () => (
    <Input
      type="text"
      placeholder={t("imagePicker.search.placeholder")}
      className="text-md mb-3 md:text-sm"
      value={searchTerm}
      onChange={(e) => {
        setSearchTerm(e.target.value);
        // Clear selected image when user starts typing
        if (setSelectedImageId) {
          setSelectedImageId("");
        }
      }}
    />
  );

  const renderImageGrid = () => (
    <div className="grid grid-cols-2 gap-4 pr-1 sm:grid-cols-6">
      {images.length === 0 ? (
        <div className="col-span-2 text-center text-sm text-muted-foreground sm:col-span-6">
          {t("imagePicker.noImages")}
        </div>
      ) : (
        images.map((image) => (
          <div
            key={image.id}
            className={cn(
              "relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 bg-background transition-all",
              selectedImageId === image.id &&
                "border-selected ring-2 ring-selected",
            )}
          >
            <img
              src={`${apiHost}api/events/${image.id}/thumbnail.webp`}
              alt={image.label}
              className="h-full w-full object-cover"
              onClick={() => handleImageSelect(image.id)}
              onLoad={() => handleImageLoad(image.id)}
              loading="lazy"
            />
            {!loadedImages.has(image.id) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <ActivityIndicator />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  if (direct) {
    return (
      <div ref={containerRef} className={className}>
        {renderSearchInput()}
        {renderImageGrid()}
      </div>
    );
  }

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
                <div className="flex flex-row items-center gap-4">
                  <div className="relative size-16">
                    <img
                      src={
                        selectedImage
                          ? `${apiHost}api/events/${selectedImage.id}/thumbnail.webp`
                          : `${apiHost}clips/triggers/${camera}/${selectedImageId}.webp`
                      }
                      alt={selectedImage?.label || "Selected image"}
                      className="size-16 rounded object-cover"
                      onLoad={() => handleImageLoad(selectedImageId || "")}
                      onError={(e) => {
                        // If trigger thumbnail fails to load, fall back to event thumbnail
                        if (!selectedImage) {
                          const target = e.target as HTMLImageElement;
                          if (
                            target.src.includes("clips/triggers") &&
                            selectedImageId
                          ) {
                            target.src = `${apiHost}api/events/${selectedImageId}/thumbnail.webp`;
                          }
                        }
                      }}
                      loading="lazy"
                    />
                    {selectedImageId && !loadedImages.has(selectedImageId) && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ActivityIndicator />
                      </div>
                    )}
                  </div>
                  <div className="text-sm smart-capitalize">
                    {selectedImage?.label || t("imagePicker.unknownLabel")}
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
            isDesktop && "max-h-[75dvh] sm:max-w-xl md:max-w-[70%]",
            isMobile && "scrollbar-container max-h-[90%] overflow-y-auto px-4",
            className,
          )}
        >
          <div className="mb-3 flex flex-col items-start justify-start">
            <Heading as="h4">{t("imagePicker.selectImage")}</Heading>
            <div className="text-sm text-muted-foreground">
              {t("triggers.dialog.form.content.imageDesc", {
                ns: "views/settings",
              })}
            </div>
            <span tabIndex={0} className="sr-only" />
          </div>
          {renderSearchInput()}
          <div className="scrollbar-container flex h-full flex-col overflow-y-auto">
            {renderImageGrid()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
