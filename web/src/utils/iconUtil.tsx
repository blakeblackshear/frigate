import { IconName } from "@/components/icons/IconPicker";
import { FrigateConfig } from "@/types/frigateConfig";
import { EventType } from "@/types/search";
import { BsPersonWalking } from "react-icons/bs";
import {
  FaAmazon,
  FaBicycle,
  FaBus,
  FaCarSide,
  FaCat,
  FaCheckCircle,
  FaDhl,
  FaDog,
  FaFedex,
  FaFire,
  FaFootballBall,
  FaHockeyPuck,
  FaHorse,
  FaMotorcycle,
  FaMouse,
  FaRegTrashAlt,
  FaUmbrella,
  FaUps,
  FaUsps,
} from "react-icons/fa";
import {
  GiDeer,
  GiFox,
  GiGoat,
  GiKangaroo,
  GiPolarBear,
  GiPostStamp,
  GiRabbit,
  GiRaccoonHead,
  GiSailboat,
  GiSoundWaves,
  GiSquirrel,
} from "react-icons/gi";
import { LuBox, LuLassoSelect, LuScanBarcode } from "react-icons/lu";
import * as LuIcons from "react-icons/lu";
import { MdRecordVoiceOver } from "react-icons/md";
import { PiBirdFill } from "react-icons/pi";

export function getAttributeLabels(config?: FrigateConfig) {
  if (!config) {
    return [];
  }

  const labels = new Set();

  Object.values(config.model.attributes_map).forEach((values) =>
    values.forEach((label) => labels.add(label)),
  );
  return [...labels];
}

export function isValidIconName(value: string): value is IconName {
  return Object.keys(LuIcons).includes(value as IconName);
}

export function getIconForLabel(
  label: string,
  type: EventType = "object",
  className?: string,
) {
  if (label.endsWith("-verified")) {
    return getVerifiedIcon(label, className, type);
  } else if (label.endsWith("-plate")) {
    return getRecognizedPlateIcon(label, className, type);
  }

  switch (label) {
    // objects
    case "bear":
      return <GiPolarBear key={label} className={className} />;
    case "bicycle":
      return <FaBicycle key={label} className={className} />;
    case "bird":
      return <PiBirdFill key={label} className={className} />;
    case "boat":
      return <GiSailboat key={label} className={className} />;
    case "bus":
    case "school_bus":
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
    case "fox":
      return <GiFox key={label} className={className} />;
    case "goat":
      return <GiGoat key={label} className={className} />;
    case "horse":
      return <FaHorse key={label} className={className} />;
    case "kangaroo":
      return <GiKangaroo key={label} className={className} />;
    case "license_plate":
      return <LuScanBarcode key={label} className={className} />;
    case "motorcycle":
      return <FaMotorcycle key={label} className={className} />;
    case "mouse":
      return <FaMouse key={label} className={className} />;
    case "package":
      return <LuBox key={label} className={className} />;
    case "person":
      return <BsPersonWalking key={label} className={className} />;
    case "rabbit":
      return <GiRabbit key={label} className={className} />;
    case "raccoon":
      return <GiRaccoonHead key={label} className={className} />;
    case "robot_lawnmower":
      return <FaHockeyPuck key={label} className={className} />;
    case "sports_ball":
      return <FaFootballBall key={label} className={className} />;
    case "skunk":
      return <GiSquirrel key={label} className={className} />;
    case "squirrel":
      return <LuIcons.LuSquirrel key={label} className={className} />;
    case "umbrella":
      return <FaUmbrella key={label} className={className} />;
    case "waste_bin":
      return <FaRegTrashAlt key={label} className={className} />;
    // audio
    case "crying":
    case "laughter":
    case "scream":
    case "speech":
    case "yell":
      return <MdRecordVoiceOver key={label} className={className} />;
    case "fire_alarm":
      return <FaFire key={label} className={className} />;
    // sub labels
    case "amazon":
      return <FaAmazon key={label} className={className} />;
    case "an_post":
    case "canada_post":
    case "dpd":
    case "gls":
    case "nzpost":
    case "postnl":
    case "postnord":
    case "purolator":
    case "royal_mail":
      return <GiPostStamp key={label} className={className} />;
    case "dhl":
      return <FaDhl key={label} className={className} />;
    case "fedex":
      return <FaFedex key={label} className={className} />;
    case "ups":
      return <FaUps key={label} className={className} />;
    case "usps":
      return <FaUsps key={label} className={className} />;
    default:
      if (type === "audio") {
        return <GiSoundWaves key={label} className={className} />;
      }
      return <LuLassoSelect key={label} className={className} />;
  }
}

function getVerifiedIcon(
  label: string,
  className?: string,
  type: EventType = "object",
) {
  const simpleLabel = label.substring(0, label.lastIndexOf("-"));

  return (
    <div key={label} className="relative flex items-center">
      {getIconForLabel(simpleLabel, type, className)}
      <FaCheckCircle className="absolute -bottom-0.5 -right-0.5 size-2" />
    </div>
  );
}

function getRecognizedPlateIcon(
  label: string,
  className?: string,
  type: EventType = "object",
) {
  const simpleLabel = label.substring(0, label.lastIndexOf("-"));

  return (
    <div key={label} className="relative inline-flex items-center">
      {getIconForLabel(simpleLabel, type, className)}
      <LuScanBarcode className="absolute -bottom-0.5 -right-0.5 size-2" />
    </div>
  );
}
