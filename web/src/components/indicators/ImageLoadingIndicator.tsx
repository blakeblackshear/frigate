import { isSafari } from "react-device-detect";
import { Skeleton } from "../ui/skeleton";

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
    <div className={`bg-gray-300 pointer-events-none ${className ?? ""}`} />
  ) : (
    <Skeleton className={`pointer-events-none ${className ?? ""}`} />
  );
}
