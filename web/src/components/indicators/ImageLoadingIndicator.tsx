import { isSafari } from "react-device-detect";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";

export default function ImageLoadingIndicator({
  className,
  imgLoaded,
}: {
  className?: string;
  imgLoaded: boolean;
}) {
  if (imgLoaded) {
    return;
  }

  return isSafari ? (
    <div className={cn("bg-gray-300 pointer-events-none", className)} />
  ) : (
    <Skeleton className={cn("pointer-events-none", className)} />
  );
}
