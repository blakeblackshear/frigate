import { ObjectLifecycleSequence } from "@/types/timeline";
import { t } from "i18next";
import i18n, { getTranslatedLabel } from "./i18n";

export function getLifecycleItemDescription(
  lifecycleItem: ObjectLifecycleSequence,
) {
  const rawLabel = Array.isArray(lifecycleItem.data.sub_label)
    ? lifecycleItem.data.sub_label[0]
    : lifecycleItem.data.sub_label || lifecycleItem.data.label;

  const label = getTranslatedLabel(rawLabel);

  let supportedListFormat = false;
  let zonesFormatter: Intl.ListFormat | null = null;

  if (typeof Intl !== "undefined" && Intl.ListFormat) {
    supportedListFormat = true;
    zonesFormatter = new Intl.ListFormat(i18n.language, {
      style: "long",
      type: "conjunction",
    });
  }

  switch (lifecycleItem.class_type) {
    case "visible":
      return t("objectLifecycle.lifecycleItemDesc.visible", {
        ns: "views/explore",
        label,
      });
    case "entered_zone":
      return t("objectLifecycle.lifecycleItemDesc.entered_zone", {
        ns: "views/explore",
        label,
        zones:
          supportedListFormat && zonesFormatter
            ? zonesFormatter.format(
                lifecycleItem.data.zones_friendly_names?.map(
                  (x) => `<strong>${x}</strong>`,
                ) ??
                  lifecycleItem.data.zones.map((x) => `<strong>${x}</strong>`),
              )
            : (
                lifecycleItem.data.zones_friendly_names ??
                lifecycleItem.data.zones
              ).join(" and "),
      });
    case "active":
      return t("objectLifecycle.lifecycleItemDesc.active", {
        ns: "views/explore",
        label,
      });
    case "stationary":
      return t("objectLifecycle.lifecycleItemDesc.stationary", {
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
          "objectLifecycle.lifecycleItemDesc.attribute.faceOrLicense_plate",
          {
            ns: "views/explore",
            label,
            attribute: lifecycleItem.data.attribute.replaceAll("_", " "),
          },
        );
      } else {
        title = t("objectLifecycle.lifecycleItemDesc.attribute.other", {
          ns: "views/explore",
          label: lifecycleItem.data.label,
          attribute: lifecycleItem.data.attribute.replaceAll("_", " "),
        });
      }
      return title;
    }
    case "gone":
      return t("objectLifecycle.lifecycleItemDesc.gone", {
        ns: "views/explore",
        label,
      });
    case "heard":
      return t("objectLifecycle.lifecycleItemDesc.heard", {
        ns: "views/explore",
        label,
      });
    case "external":
      return t("objectLifecycle.lifecycleItemDesc.external", {
        ns: "views/explore",
        label,
      });
  }
}
