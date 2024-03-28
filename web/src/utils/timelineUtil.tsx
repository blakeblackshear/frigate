import {
  LuCamera,
  LuCar,
  LuCat,
  LuCircle,
  LuCircleDot,
  LuDog,
  LuEar,
  LuPackage,
  LuPersonStanding,
  LuPlay,
  LuPlayCircle,
  LuTruck,
} from "react-icons/lu";
import { GiDeer } from "react-icons/gi";
import { IoMdExit } from "react-icons/io";
import {
  MdFaceUnlock,
  MdOutlineLocationOn,
  MdOutlinePictureInPictureAlt,
} from "react-icons/md";
import { FaBicycle } from "react-icons/fa";
import { endOfHourOrCurrentTime } from "./dateUtil";
import { TimeRange, Timeline } from "@/types/timeline";

export function getTimelineIcon(timelineItem: Timeline) {
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
    case "heard":
      return <LuEar className="w-4 mr-1" />;
    case "external":
      return <LuCircleDot className="w-4 mr-1" />;
  }
}

/**
 * Get icon representing detection, either label specific or generic detection icon
 * @param timelineItem timeline item
 * @returns icon for label
 */
export function getTimelineDetectionIcon(timelineItem: Timeline) {
  switch (timelineItem.data.label) {
    case "bicycle":
      return <FaBicycle className="w-4 mr-1" />;
    case "car":
      return <LuCar className="w-4 mr-1" />;
    case "cat":
      return <LuCat className="w-4 mr-1" />;
    case "deer":
      return <GiDeer className="w-4 mr-1" />;
    case "dog":
      return <LuDog className="w-4 mr-1" />;
    case "package":
      return <LuPackage className="w-4 mr-1" />;
    case "person":
      return <LuPersonStanding className="w-4 mr-1" />;
    default:
      return <LuCamera className="w-4 mr-1" />;
  }
}

export function getTimelineItemDescription(timelineItem: Timeline) {
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
          " ",
        )} detected for ${label}`;
      } else {
        title = `${
          timelineItem.data.sub_label
        } recognized as ${timelineItem.data.attribute.replaceAll("_", " ")}`;
      }
      return title;
    }
    case "gone":
      return `${label} left`;
    case "heard":
      return `${label} heard`;
    case "external":
      return `${label} detected`;
  }
}

/**
 *
 * @param timeRange
 * @returns timeRange chunked into individual hours
 */
export function getChunkedTimeDay(timeRange: TimeRange): TimeRange[] {
  const endOfThisHour = new Date(timeRange.before * 1000);
  endOfThisHour.setSeconds(0, 0);
  const data: TimeRange[] = [];
  const startDay = new Date(timeRange.after * 1000);
  startDay.setMinutes(0, 0, 0);
  let start = startDay.getTime() / 1000;
  let end = 0;

  for (let i = 0; i < 24; i++) {
    startDay.setHours(startDay.getHours() + 1, 0, 0, 0);

    if (startDay > endOfThisHour) {
      break;
    }

    end = endOfHourOrCurrentTime(startDay.getTime() / 1000);
    data.push({
      after: start,
      before: end,
    });
    start = startDay.getTime() / 1000;
  }

  data.push({
    after: start,
    before: Math.floor(timeRange.before),
  });

  return data;
}

export function getChunkedTimeRange(
  startTimestamp: number,
  endTimestamp: number,
) {
  const endOfThisHour = new Date();
  endOfThisHour.setHours(endOfThisHour.getHours() + 1, 0, 0, 0);
  const data: TimeRange[] = [];
  const startDay = new Date(startTimestamp * 1000);
  startDay.setMinutes(0, 0, 0);
  let start = startDay.getTime() / 1000;
  let end = 0;

  while (end < endTimestamp) {
    startDay.setHours(startDay.getHours() + 1);

    if (startDay > endOfThisHour) {
      break;
    }

    end = endOfHourOrCurrentTime(startDay.getTime() / 1000);
    data.push({
      after: start,
      before: end,
    });
    start = startDay.getTime() / 1000;
  }

  return { start: startTimestamp, end: endTimestamp, ranges: data };
}
