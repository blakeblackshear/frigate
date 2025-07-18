"""Object attribute."""

import logging
import math
import os
from collections import defaultdict
from statistics import median
from typing import Any, Optional

import cv2
import numpy as np

from frigate.config import (
    CameraConfig,
    ModelConfig,
    SnapshotsConfig,
    UIConfig,
)
from frigate.const import CLIPS_DIR, THUMB_DIR
from frigate.review.types import SeverityEnum
from frigate.util.builtin import sanitize_float
from frigate.util.image import (
    area,
    calculate_region,
    draw_box_with_label,
    draw_timestamp,
    is_better_thumbnail,
)
from frigate.util.object import box_inside
from frigate.util.velocity import calculate_real_world_speed

logger = logging.getLogger(__name__)


class TrackedObject:
    def __init__(
        self,
        model_config: ModelConfig,
        camera_config: CameraConfig,
        ui_config: UIConfig,
        frame_cache,
        obj_data: dict[str, Any],
    ):
        # set the score history then remove as it is not part of object state
        self.score_history = obj_data["score_history"]
        del obj_data["score_history"]

        self.obj_data = obj_data
        self.colormap = model_config.colormap
        self.logos = model_config.all_attribute_logos
        self.camera_config = camera_config
        self.ui_config = ui_config
        self.frame_cache = frame_cache
        self.zone_presence: dict[str, int] = {}
        self.zone_loitering: dict[str, int] = {}
        self.current_zones = []
        self.entered_zones = []
        self.attributes = defaultdict(float)
        self.false_positive = True
        self.has_clip = False
        self.has_snapshot = False
        self.top_score = self.computed_score = 0.0
        self.thumbnail_data = None
        self.last_updated = 0
        self.last_published = 0
        self.frame = None
        self.active = True
        self.pending_loitering = False
        self.speed_history = []
        self.current_estimated_speed = 0
        self.average_estimated_speed = 0
        self.velocity_angle = 0
        self.path_data = []
        self.previous = self.to_dict()

    @property
    def max_severity(self) -> Optional[str]:
        review_config = self.camera_config.review

        if (
            self.camera_config.review.alerts.enabled
            and self.obj_data["label"] in review_config.alerts.labels
            and (
                not review_config.alerts.required_zones
                or set(self.entered_zones) & set(review_config.alerts.required_zones)
            )
        ):
            return SeverityEnum.alert

        if (
            self.camera_config.review.detections.enabled
            and (
                not review_config.detections.labels
                or self.obj_data["label"] in review_config.detections.labels
            )
            and (
                not review_config.detections.required_zones
                or set(self.entered_zones)
                & set(review_config.detections.required_zones)
            )
        ):
            return SeverityEnum.detection

        return None

    def _is_false_positive(self):
        # once a true positive, always a true positive
        if not self.false_positive:
            return False

        threshold = self.camera_config.objects.filters[self.obj_data["label"]].threshold
        return self.computed_score < threshold

    def compute_score(self):
        """get median of scores for object."""
        return median(self.score_history)

    def update(self, current_frame_time: float, obj_data, has_valid_frame: bool):
        thumb_update = False
        significant_change = False
        path_update = False
        autotracker_update = False
        # if the object is not in the current frame, add a 0.0 to the score history
        if obj_data["frame_time"] != current_frame_time:
            self.score_history.append(0.0)
        else:
            self.score_history.append(obj_data["score"])

        # only keep the last 10 scores
        if len(self.score_history) > 10:
            self.score_history = self.score_history[-10:]

        # calculate if this is a false positive
        self.computed_score = self.compute_score()
        if self.computed_score > self.top_score:
            self.top_score = self.computed_score
        self.false_positive = self._is_false_positive()
        self.active = self.is_active()

        if not self.false_positive and has_valid_frame:
            # determine if this frame is a better thumbnail
            if self.thumbnail_data is None or is_better_thumbnail(
                self.obj_data["label"],
                self.thumbnail_data,
                obj_data,
                self.camera_config.frame_shape,
            ):
                if obj_data["frame_time"] == current_frame_time:
                    self.thumbnail_data = {
                        "frame_time": obj_data["frame_time"],
                        "box": obj_data["box"],
                        "area": obj_data["area"],
                        "region": obj_data["region"],
                        "score": obj_data["score"],
                        "attributes": obj_data["attributes"],
                        "current_estimated_speed": self.current_estimated_speed,
                        "velocity_angle": self.velocity_angle,
                        "path_data": self.path_data.copy(),
                        "recognized_license_plate": obj_data.get(
                            "recognized_license_plate"
                        ),
                        "recognized_license_plate_score": obj_data.get(
                            "recognized_license_plate_score"
                        ),
                    }
                    thumb_update = True
                else:
                    logger.debug(
                        f"{self.camera_config.name}: Object frame time {obj_data['frame_time']} is not equal to the current frame time {current_frame_time}, not updating thumbnail"
                    )

        # check zones
        current_zones = []
        bottom_center = (obj_data["centroid"][0], obj_data["box"][3])
        in_loitering_zone = False
        in_speed_zone = False

        # check each zone
        for name, zone in self.camera_config.zones.items():
            # if the zone is not for this object type, skip
            if len(zone.objects) > 0 and obj_data["label"] not in zone.objects:
                continue
            contour = zone.contour
            zone_score = self.zone_presence.get(name, 0) + 1

            # check if the object is in the zone
            if cv2.pointPolygonTest(contour, bottom_center, False) >= 0:
                # if the object passed the filters once, dont apply again
                if name in self.current_zones or not zone_filtered(self, zone.filters):
                    # Calculate speed first if this is a speed zone
                    if (
                        zone.distances
                        and obj_data["frame_time"] == current_frame_time
                        and self.active
                    ):
                        speed_magnitude, self.velocity_angle = (
                            calculate_real_world_speed(
                                zone.contour,
                                zone.distances,
                                self.obj_data["estimate_velocity"],
                                bottom_center,
                                self.camera_config.detect.fps,
                            )
                        )

                        # users can configure speed zones incorrectly, so sanitize speed_magnitude
                        # and velocity_angle in case the values come back as inf or NaN
                        speed_magnitude = sanitize_float(speed_magnitude)
                        self.velocity_angle = sanitize_float(self.velocity_angle)

                        if self.ui_config.unit_system == "metric":
                            self.current_estimated_speed = (
                                speed_magnitude * 3.6
                            )  # m/s to km/h
                        else:
                            self.current_estimated_speed = (
                                speed_magnitude * 0.681818
                            )  # ft/s to mph

                        self.speed_history.append(self.current_estimated_speed)
                        if len(self.speed_history) > 10:
                            self.speed_history = self.speed_history[-10:]

                        self.average_estimated_speed = sum(self.speed_history) / len(
                            self.speed_history
                        )

                        # we've exceeded the speed threshold on the zone
                        # or we don't have a speed threshold set
                        if (
                            zone.speed_threshold is None
                            or self.average_estimated_speed > zone.speed_threshold
                        ):
                            in_speed_zone = True

                        logger.debug(
                            f"Camera: {self.camera_config.name}, tracked object ID: {self.obj_data['id']}, "
                            f"zone: {name}, pixel velocity: {str(tuple(np.round(self.obj_data['estimate_velocity']).flatten().astype(int)))}, "
                            f"speed magnitude: {speed_magnitude}, velocity angle: {self.velocity_angle}, "
                            f"estimated speed: {self.current_estimated_speed:.1f}, "
                            f"average speed: {self.average_estimated_speed:.1f}, "
                            f"length: {len(self.speed_history)}"
                        )

                    # Check zone entry conditions - for speed zones, require both inertia and speed
                    if zone_score >= zone.inertia:
                        if zone.distances and not in_speed_zone:
                            continue  # Skip zone entry for speed zones until speed threshold met

                        # if the zone has loitering time, update loitering status
                        if zone.loitering_time > 0:
                            in_loitering_zone = True

                        loitering_score = self.zone_loitering.get(name, 0) + 1

                        # loitering time is configured as seconds, convert to count of frames
                        if loitering_score >= (
                            self.camera_config.zones[name].loitering_time
                            * self.camera_config.detect.fps
                        ):
                            current_zones.append(name)

                            if name not in self.entered_zones:
                                self.entered_zones.append(name)
                        else:
                            self.zone_loitering[name] = loitering_score
                    else:
                        self.zone_presence[name] = zone_score
            else:
                # once an object has a zone inertia of 3+ it is not checked anymore
                if 0 < zone_score < zone.inertia:
                    self.zone_presence[name] = zone_score - 1

            # Reset speed if not in speed zone
            if zone.distances and name not in current_zones:
                self.current_estimated_speed = 0

        # update loitering status
        self.pending_loitering = in_loitering_zone

        # maintain attributes
        for attr in obj_data["attributes"]:
            if self.attributes[attr["label"]] < attr["score"]:
                self.attributes[attr["label"]] = attr["score"]

        # populate the sub_label for object with highest scoring logo
        if self.obj_data["label"] in ["car", "motorcycle", "package", "person"]:
            recognized_logos = {
                k: self.attributes[k] for k in self.logos if k in self.attributes
            }
            if len(recognized_logos) > 0:
                max_logo = max(recognized_logos, key=recognized_logos.get)

                # don't overwrite sub label if it is already set
                if (
                    self.obj_data.get("sub_label") is None
                    or self.obj_data["sub_label"][0] == max_logo
                ):
                    self.obj_data["sub_label"] = (max_logo, recognized_logos[max_logo])

        # check for significant change
        if not self.false_positive:
            # if the zones changed, signal an update
            if set(self.current_zones) != set(current_zones):
                significant_change = True

            # if the position changed, signal an update
            if self.obj_data["position_changes"] != obj_data["position_changes"]:
                significant_change = True

            if self.obj_data["attributes"] != obj_data["attributes"]:
                significant_change = True

            # if the state changed between stationary and active
            if self.previous["active"] != self.active:
                significant_change = True

            # update at least once per minute
            if self.obj_data["frame_time"] - self.previous["frame_time"] > 60:
                significant_change = True

            # update autotrack at most 3 objects per second
            if self.obj_data["frame_time"] - self.previous["frame_time"] >= (1 / 3):
                autotracker_update = True

            # update path
            width = self.camera_config.detect.width
            height = self.camera_config.detect.height
            bottom_center = (
                round(obj_data["centroid"][0] / width, 4),
                round(obj_data["box"][3] / height, 4),
            )

            # calculate a reasonable movement threshold (e.g., 5% of the frame diagonal)
            threshold = 0.05 * math.sqrt(width**2 + height**2) / max(width, height)

            if not self.path_data:
                self.path_data.append((bottom_center, obj_data["frame_time"]))
                path_update = True
            elif (
                math.dist(self.path_data[-1][0], bottom_center) >= threshold
                or len(self.path_data) == 1
            ):
                # check Euclidean distance before appending
                self.path_data.append((bottom_center, obj_data["frame_time"]))
                path_update = True
                logger.debug(
                    f"Point tracking: {obj_data['id']}, {bottom_center}, {obj_data['frame_time']}"
                )

        self.obj_data.update(obj_data)
        self.current_zones = current_zones
        logger.debug(
            f"{self.camera_config.name}: Updating {obj_data['id']}: thumb update? {thumb_update}, significant change? {significant_change}, path update? {path_update}, autotracker update? {autotracker_update} "
        )
        return (thumb_update, significant_change, path_update, autotracker_update)

    def to_dict(self):
        event = {
            "id": self.obj_data["id"],
            "camera": self.camera_config.name,
            "frame_time": self.obj_data["frame_time"],
            "snapshot": self.thumbnail_data,
            "label": self.obj_data["label"],
            "sub_label": self.obj_data.get("sub_label"),
            "top_score": self.top_score,
            "false_positive": self.false_positive,
            "start_time": self.obj_data["start_time"],
            "end_time": self.obj_data.get("end_time", None),
            "score": self.obj_data["score"],
            "box": self.obj_data["box"],
            "area": self.obj_data["area"],
            "ratio": self.obj_data["ratio"],
            "region": self.obj_data["region"],
            "active": self.active,
            "stationary": not self.active,
            "motionless_count": self.obj_data["motionless_count"],
            "position_changes": self.obj_data["position_changes"],
            "current_zones": self.current_zones.copy(),
            "entered_zones": self.entered_zones.copy(),
            "has_clip": self.has_clip,
            "has_snapshot": self.has_snapshot,
            "attributes": self.attributes,
            "current_attributes": self.obj_data["attributes"],
            "pending_loitering": self.pending_loitering,
            "max_severity": self.max_severity,
            "current_estimated_speed": self.current_estimated_speed,
            "average_estimated_speed": self.average_estimated_speed,
            "velocity_angle": self.velocity_angle,
            "path_data": self.path_data.copy(),
            "recognized_license_plate": self.obj_data.get("recognized_license_plate"),
        }

        return event

    def is_active(self) -> bool:
        return not self.is_stationary()

    def is_stationary(self) -> bool:
        return (
            self.obj_data["motionless_count"]
            > self.camera_config.detect.stationary.threshold
        )

    def get_thumbnail(self, ext: str) -> bytes | None:
        img_bytes = self.get_img_bytes(
            ext, timestamp=False, bounding_box=False, crop=True, height=175
        )

        if img_bytes:
            return img_bytes
        else:
            _, img = cv2.imencode(f".{ext}", np.zeros((175, 175, 3), np.uint8))
            return img.tobytes()

    def get_clean_png(self) -> bytes | None:
        if self.thumbnail_data is None:
            return None

        try:
            best_frame = cv2.cvtColor(
                self.frame_cache[self.thumbnail_data["frame_time"]]["frame"],
                cv2.COLOR_YUV2BGR_I420,
            )
        except KeyError:
            logger.warning(
                f"Unable to create clean png because frame {self.thumbnail_data['frame_time']} is not in the cache"
            )
            return None

        ret, png = cv2.imencode(".png", best_frame)
        if ret:
            return png.tobytes()
        else:
            return None

    def get_img_bytes(
        self,
        ext: str,
        timestamp=False,
        bounding_box=False,
        crop=False,
        height: int | None = None,
        quality: int | None = None,
    ) -> bytes | None:
        if self.thumbnail_data is None:
            return None

        try:
            best_frame = cv2.cvtColor(
                self.frame_cache[self.thumbnail_data["frame_time"]]["frame"],
                cv2.COLOR_YUV2BGR_I420,
            )
        except KeyError:
            logger.warning(
                f"Unable to create jpg because frame {self.thumbnail_data['frame_time']} is not in the cache"
            )
            return None

        if bounding_box:
            thickness = 2
            color = self.colormap.get(self.obj_data["label"], (255, 255, 255))

            # draw the bounding boxes on the frame
            box = self.thumbnail_data["box"]
            draw_box_with_label(
                best_frame,
                box[0],
                box[1],
                box[2],
                box[3],
                self.obj_data["label"],
                f"{int(self.thumbnail_data['score'] * 100)}% {int(self.thumbnail_data['area'])}"
                + (
                    f" {self.thumbnail_data['current_estimated_speed']:.1f}"
                    if self.thumbnail_data["current_estimated_speed"] != 0
                    else ""
                ),
                thickness=thickness,
                color=color,
            )

            # draw any attributes
            for attribute in self.thumbnail_data["attributes"]:
                box = attribute["box"]
                box_area = int((box[2] - box[0]) * (box[3] - box[1]))
                draw_box_with_label(
                    best_frame,
                    box[0],
                    box[1],
                    box[2],
                    box[3],
                    attribute["label"],
                    f"{attribute['score']:.0%} {str(box_area)}",
                    thickness=thickness,
                    color=color,
                )

        if crop:
            box = self.thumbnail_data["box"]
            box_size = 300
            region = calculate_region(
                best_frame.shape,
                box[0],
                box[1],
                box[2],
                box[3],
                box_size,
                multiplier=1.1,
            )
            best_frame = best_frame[region[1] : region[3], region[0] : region[2]]

        if height:
            width = int(height * best_frame.shape[1] / best_frame.shape[0])
            best_frame = cv2.resize(
                best_frame, dsize=(width, height), interpolation=cv2.INTER_AREA
            )
        if timestamp:
            color = self.camera_config.timestamp_style.color
            draw_timestamp(
                best_frame,
                self.thumbnail_data["frame_time"],
                self.camera_config.timestamp_style.format,
                font_effect=self.camera_config.timestamp_style.effect,
                font_thickness=self.camera_config.timestamp_style.thickness,
                font_color=(color.blue, color.green, color.red),
                position=self.camera_config.timestamp_style.position,
            )

        quality_params = None

        if ext == "jpg":
            quality_params = [int(cv2.IMWRITE_JPEG_QUALITY), quality or 70]
        elif ext == "webp":
            quality_params = [int(cv2.IMWRITE_WEBP_QUALITY), quality or 60]

        ret, jpg = cv2.imencode(f".{ext}", best_frame, quality_params)

        if ret:
            return jpg.tobytes()
        else:
            return None

    def write_snapshot_to_disk(self) -> None:
        snapshot_config: SnapshotsConfig = self.camera_config.snapshots
        jpg_bytes = self.get_img_bytes(
            ext="jpg",
            timestamp=snapshot_config.timestamp,
            bounding_box=snapshot_config.bounding_box,
            crop=snapshot_config.crop,
            height=snapshot_config.height,
            quality=snapshot_config.quality,
        )
        if jpg_bytes is None:
            logger.warning(f"Unable to save snapshot for {self.obj_data['id']}.")
        else:
            with open(
                os.path.join(
                    CLIPS_DIR, f"{self.camera_config.name}-{self.obj_data['id']}.jpg"
                ),
                "wb",
            ) as j:
                j.write(jpg_bytes)

        # write clean snapshot if enabled
        if snapshot_config.clean_copy:
            png_bytes = self.get_clean_png()
            if png_bytes is None:
                logger.warning(
                    f"Unable to save clean snapshot for {self.obj_data['id']}."
                )
            else:
                with open(
                    os.path.join(
                        CLIPS_DIR,
                        f"{self.camera_config.name}-{self.obj_data['id']}-clean.png",
                    ),
                    "wb",
                ) as p:
                    p.write(png_bytes)

    def write_thumbnail_to_disk(self) -> None:
        directory = os.path.join(THUMB_DIR, self.camera_config.name)

        if not os.path.exists(directory):
            os.makedirs(directory)

        thumb_bytes = self.get_thumbnail("webp")

        with open(os.path.join(directory, f"{self.obj_data['id']}.webp"), "wb") as f:
            f.write(thumb_bytes)


def zone_filtered(obj: TrackedObject, object_config):
    object_name = obj.obj_data["label"]

    if object_name in object_config:
        obj_settings = object_config[object_name]

        # if the min area is larger than the
        # detected object, don't add it to detected objects
        if obj_settings.min_area > obj.obj_data["area"]:
            return True

        # if the detected object is larger than the
        # max area, don't add it to detected objects
        if obj_settings.max_area < obj.obj_data["area"]:
            return True

        # if the score is lower than the threshold, skip
        if obj_settings.threshold > obj.computed_score:
            return True

        # if the object is not proportionally wide enough
        if obj_settings.min_ratio > obj.obj_data["ratio"]:
            return True

        # if the object is proportionally too wide
        if obj_settings.max_ratio < obj.obj_data["ratio"]:
            return True

    return False


class TrackedObjectAttribute:
    def __init__(self, raw_data: tuple) -> None:
        self.label = raw_data[0]
        self.score = raw_data[1]
        self.box = raw_data[2]
        self.area = raw_data[3]
        self.ratio = raw_data[4]
        self.region = raw_data[5]

    def get_tracking_data(self) -> dict[str, Any]:
        """Return data saved to the object."""
        return {
            "label": self.label,
            "score": self.score,
            "box": self.box,
        }

    def find_best_object(self, objects: list[dict[str, Any]]) -> Optional[str]:
        """Find the best attribute for each object and return its ID."""
        best_object_area = None
        best_object_id = None
        best_object_label = None

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
                best_object_label = obj["label"]
            else:
                if best_object_label == obj["label"]:
                    # if multiple objects of the same type are overlapping
                    # then the attribute will not be assigned
                    return None
                elif object_area < best_object_area:
                    # if a car and person are overlapping then assign the label to the smaller object (which should be the person)
                    best_object_area = object_area
                    best_object_id = obj["id"]
                    best_object_label = obj["label"]

        return best_object_id
