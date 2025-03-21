import { ObjectLifecycleSequence } from "@/types/timeline";
import { t } from "i18next";

export function getLifecycleItemDescription(
  lifecycleItem: ObjectLifecycleSequence,
) {
  // can't use useTranslation here
  const label = (
    (Array.isArray(lifecycleItem.data.sub_label)
      ? lifecycleItem.data.sub_label[0]
      : lifecycleItem.data.sub_label) || lifecycleItem.data.label
  ).replaceAll("_", " ");

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
        zones: lifecycleItem.data.zones.join(" and ").replaceAll("_", " "),
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
