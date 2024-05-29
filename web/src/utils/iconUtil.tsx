import { IconName } from "@/components/icons/IconPicker";
import { BsPersonWalking } from "react-icons/bs";
import {
  FaAmazon,
  FaBicycle,
  FaBus,
  FaCarSide,
  FaCat,
  FaCheckCircle,
  FaDog,
  FaFedex,
  FaFire,
  FaUps,
} from "react-icons/fa";
import { GiDeer, GiHummingbird } from "react-icons/gi";
import { LuBox, LuLassoSelect } from "react-icons/lu";
import * as LuIcons from "react-icons/lu";
import { MdRecordVoiceOver } from "react-icons/md";

export function isValidIconName(value: string): value is IconName {
  return Object.keys(LuIcons).includes(value as IconName);
}

export function getIconForLabel(label: string, className?: string) {
  if (label.endsWith("-verified")) {
    return getVerifiedIcon(label, className);
  }

  switch (label) {
    case "bicycle":
      return <FaBicycle key={label} className={className} />;
    case "bird":
      return <GiHummingbird key={label} className={className} />;
    case "bus":
      return <FaBus key={label} className={className} />;
    case "car":
    case "vehicle":
      return <FaCarSide key={label} className={className} />;
    case "cat":
      return <FaCat key={label} className={className} />;
    case "deer":
      return <GiDeer key={label} className={className} />;
    case "animal":
    case "bark":
    case "dog":
      return <FaDog key={label} className={className} />;
    case "fire_alarm":
      return <FaFire key={label} className={className} />;
    case "package":
      return <LuBox key={label} className={className} />;
    case "person":
      return <BsPersonWalking key={label} className={className} />;
    // audio
    case "crying":
    case "laughter":
    case "scream":
    case "speech":
    case "yell":
      return <MdRecordVoiceOver key={label} className={className} />;
    // sub labels
    case "amazon":
      return <FaAmazon key={label} className={className} />;
    case "fedex":
      return <FaFedex key={label} className={className} />;
    case "ups":
      return <FaUps key={label} className={className} />;
    default:
      return <LuLassoSelect key={label} className={className} />;
  }
}

function getVerifiedIcon(label: string, className?: string) {
  const simpleLabel = label.substring(0, label.lastIndexOf("-"));

  return (
    <div key={label} className="flex items-center">
      {getIconForLabel(simpleLabel, className)}
      <FaCheckCircle className="absolute size-2 translate-x-[80%] translate-y-3/4" />
    </div>
  );
}
