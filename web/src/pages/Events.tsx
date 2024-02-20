import DesktopEventView from "@/views/events/DesktopEventView";
import MobileEventView from "@/views/events/MobileEventView";
import { useMemo } from "react";

export default function Events() {
  const isMobile = useMemo(() => {
    return window.innerWidth < 768;
  }, []);

  if (isMobile) {
    return <MobileEventView />;
  }

  return <DesktopEventView />;
}
