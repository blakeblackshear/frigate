from enum import Enum


class SeverityEnum(str, Enum):
    alert = "alert"
    detection = "detection"
    significant_motion = "significant_motion"
