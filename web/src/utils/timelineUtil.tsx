import {
  LuCircle,
  LuCircleDot,
  LuEar,
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
    case "sub_label":
      switch (timelineItem.data.label) {
        case "person":
          return <MdFaceUnlock className="w-4 mr-1" />;
        case "car":
          return <MdOutlinePictureInPictureAlt className="w-4 mr-1" />;
        default:
          return <LuCircleDot className="w-4 mr-1" />;
      }
    case "heard":
      return <LuEar className="w-4 mr-1" />;
    case "external":
      return <LuCircleDot className="w-4 mr-1" />;
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
    case "heard":
      return `${label} heard`;
    case "external":
      return `${label} detected`;
  }
}
