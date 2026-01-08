import { TrackingDetailsSequence } from "@/types/timeline";
import { t } from "i18next";
import { getTranslatedLabel } from "./i18n";
import { capitalizeFirstLetter, formatList } from "./stringUtil";

export function getLifecycleItemDescription(
  lifecycleItem: TrackingDetailsSequence,
) {
  const rawLabel = Array.isArray(lifecycleItem.data.sub_label)
    ? lifecycleItem.data.sub_label[0]
    : lifecycleItem.data.sub_label || lifecycleItem.data.label;

  const label = lifecycleItem.data.sub_label
    ? capitalizeFirstLetter(rawLabel)
    : getTranslatedLabel(
        rawLabel,
        lifecycleItem.class_type === "heard" ? "audio" : "object",
      );

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
        zones: formatList(
          lifecycleItem.data.zones_friendly_names ?? lifecycleItem.data.zones,
        ),
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
