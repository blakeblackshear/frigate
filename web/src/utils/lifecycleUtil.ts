import { TrackingDetailsSequence } from "@/types/timeline";
import { t } from "i18next";
import { getTranslatedLabel } from "./i18n";
import { capitalizeFirstLetter } from "./stringUtil";

function formatZonesList(zones: string[]): string {
  if (zones.length === 0) return "";
  if (zones.length === 1) return zones[0];
  if (zones.length === 2) {
    return t("list.two", {
      0: zones[0],
      1: zones[1],
    });
  }

  const separatorWithSpace = t("list.separatorWithSpace", { ns: "common" });
  const allButLast = zones.slice(0, -1).join(separatorWithSpace);
  return t("list.many", {
    items: allButLast,
    last: zones[zones.length - 1],
  });
}

export function getLifecycleItemDescription(
  lifecycleItem: TrackingDetailsSequence,
) {
  const rawLabel = Array.isArray(lifecycleItem.data.sub_label)
    ? lifecycleItem.data.sub_label[0]
    : lifecycleItem.data.sub_label || lifecycleItem.data.label;

  const label = lifecycleItem.data.sub_label
    ? capitalizeFirstLetter(rawLabel)
    : getTranslatedLabel(rawLabel);

  switch (lifecycleItem.class_type) {
    case "visible":
      return t("trackingDetails.lifecycleItemDesc.visible", {
        ns: "views/explore",
        label,
      });
    case "entered_zone":
      return t("trackingDetails.lifecycleItemDesc.entered_zone", {
        ns: "views/explore",
        label,
        zones: formatZonesList(lifecycleItem.data.zones),
      });
    case "active":
      return t("trackingDetails.lifecycleItemDesc.active", {
        ns: "views/explore",
        label,
      });
    case "stationary":
      return t("trackingDetails.lifecycleItemDesc.stationary", {
        ns: "views/explore",
        label,
      });
    case "attribute": {
      let title = "";
      if (
        lifecycleItem.data.attribute == "face" ||
        lifecycleItem.data.attribute == "license_plate"
      ) {
        title = t(
          "trackingDetails.lifecycleItemDesc.attribute.faceOrLicense_plate",
          {
            ns: "views/explore",
            label,
            attribute: getTranslatedLabel(
              lifecycleItem.data.attribute.replaceAll("_", " "),
            ),
          },
        );
      } else {
        title = t("trackingDetails.lifecycleItemDesc.attribute.other", {
          ns: "views/explore",
          label: lifecycleItem.data.label,
          attribute: getTranslatedLabel(
            lifecycleItem.data.attribute.replaceAll("_", " "),
          ),
        });
      }
      return title;
    }
    case "gone":
      return t("trackingDetails.lifecycleItemDesc.gone", {
        ns: "views/explore",
        label,
      });
    case "heard":
      return t("trackingDetails.lifecycleItemDesc.heard", {
        ns: "views/explore",
        label,
      });
    case "external":
      return t("trackingDetails.lifecycleItemDesc.external", {
        ns: "views/explore",
        label,
      });
  }
}
