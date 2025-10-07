import { baseUrl } from "@/api/baseUrl";
import useContextMenu from "@/hooks/use-contextmenu";
import { cn } from "@/lib/utils";
import {
  ClassificationItemData,
  ClassificationThreshold,
} from "@/types/classification";
import { useMemo, useRef, useState } from "react";
import { isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";

type ClassificationCardProps = {
  className?: string;
  imgClassName?: string;
  data: ClassificationItemData;
  threshold?: ClassificationThreshold;
  selected: boolean;
  i18nLibrary: string;
  showArea?: boolean;
  onClick: (data: ClassificationItemData, meta: boolean) => void;
  children?: React.ReactNode;
};
export function ClassificationCard({
  className,
  imgClassName,
  data,
  threshold,
  selected,
  i18nLibrary,
  showArea = true,
  onClick,
  children,
}: ClassificationCardProps) {
  const { t } = useTranslation([i18nLibrary]);
  const [imageLoaded, setImageLoaded] = useState(false);

  const scoreStatus = useMemo(() => {
    if (!data.score || !threshold) {
      return "unknown";
    }

    if (data.score >= threshold.recognition) {
      return "match";
    } else if (data.score >= threshold.unknown) {
      return "potential";
    } else {
      return "unknown";
    }
  }, [data, threshold]);

  // interaction

  const imgRef = useRef<HTMLImageElement | null>(null);

  useContextMenu(imgRef, () => {
    onClick(data, true);
  });

  const imageArea = useMemo(() => {
    if (!showArea || imgRef.current == null || !imageLoaded) {
      return undefined;
    }

    return imgRef.current.naturalWidth * imgRef.current.naturalHeight;
  }, [showArea, imageLoaded]);

  return (
    <>
      <div
        className={cn(
          "relative flex cursor-pointer flex-col rounded-lg outline outline-[3px]",
          className,
          selected
            ? "shadow-selected outline-selected"
            : "outline-transparent duration-500",
        )}
      >
        <div className="relative w-full select-none overflow-hidden rounded-lg">
          <img
            ref={imgRef}
            onLoad={() => setImageLoaded(true)}
            className={cn("size-44", imgClassName, isMobile && "w-full")}
            src={`${baseUrl}${data.filepath}`}
            onClick={(e) => {
              e.stopPropagation();
              onClick(data, e.metaKey || e.ctrlKey);
            }}
          />
          {imageArea != undefined && (
            <div className="absolute bottom-1 right-1 z-10 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">
              {t("information.pixels", { ns: "common", area: imageArea })}
            </div>
          )}
        </div>
        <div className="select-none p-2">
          <div className="flex w-full flex-row items-center justify-between gap-2">
            <div className="flex flex-col items-start text-xs text-primary-variant">
              <div className="smart-capitalize">
                {data.name == "unknown" ? t("details.unknown") : data.name}
              </div>
              {data.score && (
                <div
                  className={cn(
                    "",
                    scoreStatus == "match" && "text-success",
                    scoreStatus == "potential" && "text-orange-400",
                    scoreStatus == "unknown" && "text-danger",
                  )}
                >
                  {Math.round(data.score * 100)}%
                </div>
              )}
            </div>
            <div className="flex flex-row items-start justify-end gap-5 md:gap-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
