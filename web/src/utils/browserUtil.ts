import copy from "copy-to-clipboard";
import { toast } from "sonner";

export function shareOrCopy(url: string, title?: string) {
  if (window.isSecureContext && "share" in navigator) {
    navigator.share({
      url: url,
      title: title,
    });
  } else {
    copy(url);
    toast.success("Copied URL to clipboard.", {
      position: "top-center",
    });
  }
}
