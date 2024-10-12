"""Object attribute."""

from frigate.util.object import area, box_inside


class ObjectAttribute:
    def __init__(self, raw_data: tuple) -> None:
        self.label = raw_data[0]
        self.score = raw_data[1]
        self.box = raw_data[2]
        self.area = raw_data[3]
        self.ratio = raw_data[4]
        self.region = raw_data[5]

    def get_tracking_data(self) -> dict[str, any]:
        """Return data saved to the object."""
        return {
            "label": self.label,
            "score": self.score,
            "box": self.box,
        }

    def find_best_object(self, objects: list[dict[str, any]]) -> str:
        """Find the best attribute for each object and return its ID."""
        best_object_area = None
        best_object_id = None

        for obj in objects:
            if not box_inside(obj["box"], self.box):
                continue

            object_area = area(obj["box"])

            # if multiple objects have the same attribute then they
            # are overlapping, it is most likely that the smaller object
            # is the one with the attribute
            if best_object_area is None:
                best_object_area = object_area
                best_object_id = obj["id"]
            elif object_area < best_object_area:
                best_object_area = object_area
                best_object_id = obj["id"]

        return best_object_id
