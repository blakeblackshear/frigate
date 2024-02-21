import DesktopEventView from "@/views/events/DesktopEventView";
import MobileEventView from "@/views/events/MobileEventView";
import { isMobile } from 'react-device-detect';

export default function Events() {
  if (isMobile) {
    return <MobileEventView />;
  }

  return <DesktopEventView />;
}
