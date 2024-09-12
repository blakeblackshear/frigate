import copy from "copy-to-clipboard";

export function shareOrCopy(url: string, title?: string) {
  if (window.isSecureContext && "share" in navigator) {
    navigator.share({
      url: url,
      title: title,
    });
  } else {
    copy(url);
  }
}
