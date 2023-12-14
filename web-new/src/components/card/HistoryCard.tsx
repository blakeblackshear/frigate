import useSWR from "swr";
import PreviewThumbnailPlayer from "../player/PreviewThumbnailPlayer";
import { Card } from "../ui/card";
import { FrigateConfig } from "@/types/frigateConfig";
import ActivityIndicator from "../ui/activity-indicator";
import {
  LuCircle,
  LuClock,
  LuPlay,
  LuPlayCircle,
  LuTruck,
} from "react-icons/lu";
import { IoMdExit } from "react-icons/io";
import {
  MdFaceUnlock,
  MdOutlineLocationOn,
  MdOutlinePictureInPictureAlt,
} from "react-icons/md";
import { HiOutlineVideoCamera } from "react-icons/hi";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";

type HistoryCardProps = {
  timeline: Card;
  relevantPreview?: Preview;
  shouldAutoPlay: boolean;
};

export default function HistoryCard({
  relevantPreview,
  timeline,
  shouldAutoPlay,
}: HistoryCardProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <Card className="my-2 xs:mr-2 bg-secondary w-full xs:w-[48%] sm:w-[284px]">
      <PreviewThumbnailPlayer
        camera={timeline.camera}
        relevantPreview={relevantPreview}
        startTs={Object.values(timeline.entries)[0].timestamp}
        eventId={Object.values(timeline.entries)[0].source_id}
        shouldAutoPlay={shouldAutoPlay}
      />
      <div className="p-2">
        <div className="text-sm flex">
          <LuClock className="h-5 w-5 mr-2 inline" />
          {formatUnixTimestampToDateTime(timeline.time, {
            strftime_fmt:
              config.ui.time_format == "24hour" ? "%H:%M:%S" : "%I:%M:%S",
          })}
        </div>
        <div className="capitalize text-sm flex align-center mt-1">
          <HiOutlineVideoCamera className="h-5 w-5 mr-2 inline" />
          {timeline.camera.replaceAll("_", " ")}
        </div>
        <div className="my-2 text-sm font-medium">Activity:</div>
        {Object.entries(timeline.entries).map(([_, entry]) => {
          return (
            <div
              key={entry.timestamp}
              className="flex text-xs capitalize my-1 items-center"
            >
              {getTimelineIcon(entry)}
              {getTimelineItemDescription(entry)}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function getTimelineIcon(timelineItem: Timeline) {
  switch (timelineItem.class_type) {
    case "visible":
      return <LuPlay className="w-4 mr-1" />;
    case "gone":
      return <IoMdExit className="w-4 mr-1" />;
    case "active":
      return <LuPlayCircle className="w-4 mr-1" />;
    case "stationary":
      return <LuCircle className="w-4 mr-1" />;
    case "entered_zone":
      return <MdOutlineLocationOn className="w-4 mr-1" />;
    case "attribute":
      switch (timelineItem.data.attribute) {
        case "face":
          return <MdFaceUnlock className="w-4 mr-1" />;
        case "license_plate":
          return <MdOutlinePictureInPictureAlt className="w-4 mr-1" />;
        default:
          return <LuTruck className="w-4 mr-1" />;
      }
    case "sub_label":
      switch (timelineItem.data.label) {
        case "person":
          return <MdFaceUnlock className="w-4 mr-1" />;
        case "car":
          return <MdOutlinePictureInPictureAlt className="w-4 mr-1" />;
      }
  }
}

function getTimelineItemDescription(timelineItem: Timeline) {
  const label = (
    (Array.isArray(timelineItem.data.sub_label)
      ? timelineItem.data.sub_label[0]
      : timelineItem.data.sub_label) || timelineItem.data.label
  ).replaceAll("_", " ");

  switch (timelineItem.class_type) {
    case "visible":
      return `${label} detected`;
    case "entered_zone":
      return `${label} entered ${timelineItem.data.zones
        .join(" and ")
        .replaceAll("_", " ")}`;
    case "active":
      return `${label} became active`;
    case "stationary":
      return `${label} became stationary`;
    case "attribute": {
      let title = "";
      if (
        timelineItem.data.attribute == "face" ||
        timelineItem.data.attribute == "license_plate"
      ) {
        title = `${timelineItem.data.attribute.replaceAll(
          "_",
          " "
        )} detected for ${label}`;
      } else {
        title = `${
          timelineItem.data.sub_label
        } recognized as ${timelineItem.data.attribute.replaceAll("_", " ")}`;
      }
      return title;
    }
    case "sub_label":
      return `${timelineItem.data.label} recognized as ${timelineItem.data.sub_label}`;
    case "gone":
      return `${label} left`;
  }
}
