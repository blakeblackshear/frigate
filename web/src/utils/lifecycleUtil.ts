import { ObjectLifecycleSequence } from "@/types/timeline";

export function getLifecycleItemDescription(
  lifecycleItem: ObjectLifecycleSequence,
) {
  const label = (
    (Array.isArray(lifecycleItem.data.sub_label)
      ? lifecycleItem.data.sub_label[0]
      : lifecycleItem.data.sub_label) || lifecycleItem.data.label
  ).replaceAll("_", " ");

  switch (lifecycleItem.class_type) {
    case "visible":
      return `${label} detected`;
    case "entered_zone":
      return `${label} entered ${lifecycleItem.data.zones
        .join(" and ")
        .replaceAll("_", " ")}`;
    case "active":
      return `${label} became active`;
    case "stationary":
      return `${label} became stationary`;
    case "attribute": {
      let title = "";
      if (
        lifecycleItem.data.attribute == "face" ||
        lifecycleItem.data.attribute == "license_plate"
      ) {
        title = `${lifecycleItem.data.attribute.replaceAll(
          "_",
          " ",
        )} detected for ${label}`;
      } else {
        title = `${
          lifecycleItem.data.label
        } recognized as ${lifecycleItem.data.attribute.replaceAll("_", " ")}`;
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
