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
        label,
        ns: "views/explore",
      });
    case "entered_zone":
      return t("objectLifecycle.lifecycleItemDesc.entered_zone", {
        label,
        ns: "views/explore",
        zones: lifecycleItem.data.zones.join(" and ").replaceAll("_", " "),
      });
    case "active":
      return t("objectLifecycle.lifecycleItemDesc.active", {
        label,
        ns: "views/explore",
      });
    case "stationary":
      return t("objectLifecycle.lifecycleItemDesc.stationary", {
        label,
        ns: "views/explore",
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
            label,
            attribute: lifecycleItem.data.attribute.replaceAll("_", " "),
            ns: "views/explore",
          },
        );
      } else {
        title = t("objectLifecycle.lifecycleItemDesc.attribute.other", {
          label: lifecycleItem.data.label,
          attribute: lifecycleItem.data.attribute.replaceAll("_", " "),
          ns: "views/explore",
        });
      }
      return title;
    }
    case "gone":
      return t("objectLifecycle.lifecycleItemDesc.gone", {
        label,
        ns: "views/explore",
      });
    case "heard":
      return t("objectLifecycle.lifecycleItemDesc.heard", {
        label,
        ns: "views/explore",
      });
    case "external":
      return t("objectLifecycle.lifecycleItemDesc.external", {
        label,
        ns: "views/explore",
      });
  }
}
