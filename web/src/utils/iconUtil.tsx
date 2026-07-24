import { IconName } from "@/components/icons/IconPicker";
import SkunkIcon from "@/components/icons/SkunkIcon";
import { FrigateConfig } from "@/types/frigateConfig";
import { EventType } from "@/types/search";
import { BsPersonWalking } from "react-icons/bs";
import {
  FaAmazon,
  FaBaby,
  FaBabyCarriage,
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
  GiBarbecue,
  GiCow,
  GiDeer,
  GiFox,
  GiGoat,
  GiKangaroo,
  GiPolarBear,
  GiPostStamp,
  GiRabbit,
  GiRaccoonHead,
  GiRat,
  GiSailboat,
  GiSeatedMouse,
  GiSoundWaves,
  GiSquirrel,
} from "react-icons/gi";
import { LuBox, LuLassoSelect, LuScanBarcode } from "react-icons/lu";
import * as LuIcons from "react-icons/lu";
import { MdRecordVoiceOver } from "react-icons/md";
import { PiBirdFill } from "react-icons/pi";
import { HiMiniTruck } from "react-icons/hi2";

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
  key?: string,
) {
  const iconKey = key || label;

  if (label.endsWith("-verified")) {
    return getVerifiedIcon(label, className, type, iconKey);
  } else if (label.endsWith("-plate")) {
    return getRecognizedPlateIcon(label, className, type, iconKey);
  }

  switch (label) {
    // objects
    case "baby":
      return <FaBaby key={iconKey} className={className} />;
    case "baby_stroller":
      return <FaBabyCarriage key={iconKey} className={className} />;
    case "bbq_grill":
      return <GiBarbecue key={iconKey} className={className} />;
    case "bear":
      return <GiPolarBear key={iconKey} className={className} />;
    case "bicycle":
      return <FaBicycle key={iconKey} className={className} />;
    case "bird":
      return <PiBirdFill key={iconKey} className={className} />;
    case "boat":
      return <GiSailboat key={iconKey} className={className} />;
    case "bus":
    case "school_bus":
      return <FaBus key={iconKey} className={className} />;
    case "car":
    case "vehicle":
      return <FaCarSide key={iconKey} className={className} />;
    case "cat":
      return <FaCat key={iconKey} className={className} />;
    case "cow":
      return <GiCow key={iconKey} className={className} />;
    case "deer":
      return <GiDeer key={iconKey} className={className} />;
    case "animal":
    case "bark":
    case "dog":
      return <FaDog key={iconKey} className={className} />;
    case "fox":
      return <GiFox key={iconKey} className={className} />;
    case "garbage_truck":
      return <HiMiniTruck key={iconKey} className={className} />;
    case "goat":
      return <GiGoat key={iconKey} className={className} />;
    case "horse":
      return <FaHorse key={iconKey} className={className} />;
    case "kangaroo":
      return <GiKangaroo key={iconKey} className={className} />;
    case "license_plate":
      return <LuScanBarcode key={iconKey} className={className} />;
    case "motorcycle":
      return <FaMotorcycle key={iconKey} className={className} />;
    case "mouse":
      return <FaMouse key={iconKey} className={className} />;
    case "package":
      return <LuBox key={iconKey} className={className} />;
    case "person":
      return <BsPersonWalking key={iconKey} className={className} />;
    case "possum":
      return <GiSeatedMouse key={iconKey} className={className} />;
    case "rabbit":
      return <GiRabbit key={iconKey} className={className} />;
    case "raccoon":
      return <GiRaccoonHead key={iconKey} className={className} />;
    case "robot_lawnmower":
      return <FaHockeyPuck key={iconKey} className={className} />;
    case "rodent":
      return <GiRat key={iconKey} className={className} />;
    case "sports_ball":
      return <FaFootballBall key={iconKey} className={className} />;
    case "skunk":
      return <SkunkIcon key={iconKey} className={className} />;
    case "squirrel":
      return <GiSquirrel key={iconKey} className={className} />;
    case "umbrella":
      return <FaUmbrella key={iconKey} className={className} />;
    case "waste_bin":
      return <FaRegTrashAlt key={iconKey} className={className} />;
    // audio
    case "crying":
    case "laughter":
    case "scream":
    case "speech":
    case "yell":
      return <MdRecordVoiceOver key={iconKey} className={className} />;
    case "fire_alarm":
      return <FaFire key={iconKey} className={className} />;
    // sub labels
    case "amazon":
      return <FaAmazon key={iconKey} className={className} />;
    case "an_post":
    case "canada_post":
    case "dpd":
    case "gls":
    case "nzpost":
    case "postnl":
    case "postnord":
    case "purolator":
    case "royal_mail":
      return <GiPostStamp key={iconKey} className={className} />;
    case "dhl":
      return <FaDhl key={iconKey} className={className} />;
    case "fedex":
      return <FaFedex key={iconKey} className={className} />;
    case "ups":
      return <FaUps key={iconKey} className={className} />;
    case "usps":
      return <FaUsps key={iconKey} className={className} />;
    default:
      if (type === "audio") {
        return <GiSoundWaves key={iconKey} className={className} />;
      }
      return <LuLassoSelect key={iconKey} className={className} />;
  }
}

function getVerifiedIcon(
  label: string,
  className?: string,
  type: EventType = "object",
  key?: string,
) {
  const simpleLabel = label.substring(0, label.lastIndexOf("-"));

  return (
    <div key={key} className="relative flex items-center">
      {getIconForLabel(simpleLabel, type, className)}
      <FaCheckCircle className="absolute -bottom-0.5 -right-0.5 size-2" />
    </div>
  );
}

function getRecognizedPlateIcon(
  label: string,
  className?: string,
  type: EventType = "object",
  key?: string,
) {
  const simpleLabel = label.substring(0, label.lastIndexOf("-"));

  return (
    <div key={key} className="relative inline-flex items-center">
      {getIconForLabel(simpleLabel, type, className)}
      <LuScanBarcode className="absolute -bottom-0.5 -right-0.5 size-2" />
    </div>
  );
}
