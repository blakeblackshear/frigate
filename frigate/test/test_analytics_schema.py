"""Tests for the analytics report schema."""

import inspect
import re
import unittest
from enum import Enum
from typing import Any, get_args, get_origin

from pydantic import BaseModel

import frigate.detectors.hardware as detection_hardware
import frigate.util.hwaccel as hwaccel
from frigate.analytics.schema import (
    AnalyticsReport,
    DecodeFamily,
    HardwareKey,
    HwaccelKey,
    InputPresetKey,
    NoticeKindKey,
)
from frigate.ffmpeg_presets import PRESETS_HW_ACCEL_DECODE, PRESETS_INPUT
from frigate.notices.types import NOTICE_KINDS
from frigate.util.hwaccel import HwaccelFamily

# the only str fields: generated ids and strings the hardware reports
ALLOWED_STRINGS = {
    ("AnalyticsReport", "install_id"),
    ("AnalyticsReport", "report_id"),
    ("InstallSection", "version"),
    ("InstallSection", "kernel"),
    ("HardwareSection", "cpu_model"),
    ("GpuInfo", "name"),
    ("StorageInfo", "record_fs"),
    ("DetectionModel", "input"),
}


def nested_models(annotation: Any) -> list[type[BaseModel]]:
    if isinstance(annotation, type) and issubclass(annotation, BaseModel):
        return [annotation]

    return [model for arg in get_args(annotation) for model in nested_models(arg)]


def all_models(
    model: type[BaseModel], seen: set[type[BaseModel]] | None = None
) -> list[type[BaseModel]]:
    seen = set() if seen is None else seen

    if model in seen:
        return []

    seen.add(model)
    found = [model]

    for field in model.model_fields.values():
        for nested in nested_models(field.annotation):
            found += all_models(nested, seen)

    return found


def dict_key_types(annotation: Any) -> list[Any]:
    keys = [get_args(annotation)[0]] if get_origin(annotation) is dict else []
    return keys + [key for arg in get_args(annotation) for key in dict_key_types(arg)]


class TestSchemaDiscipline(unittest.TestCase):
    def test_every_field_has_a_description_and_public_flag(self):
        for model in all_models(AnalyticsReport):
            for name, field in model.model_fields.items():
                with self.subTest(field=f"{model.__name__}.{name}"):
                    self.assertTrue(field.description)
                    self.assertIsInstance(field.json_schema_extra, dict)
                    self.assertIsInstance(field.json_schema_extra.get("x-public"), bool)

    def test_strings_are_limited_to_ids_and_hardware_names(self):
        for model in all_models(AnalyticsReport):
            properties = model.model_json_schema()["properties"]

            for name, field in model.model_fields.items():
                if field.annotation is not str:
                    continue

                with self.subTest(field=f"{model.__name__}.{name}"):
                    self.assertIn((model.__name__, name), ALLOWED_STRINGS)
                    self.assertTrue(
                        "maxLength" in properties[name] or "pattern" in properties[name]
                    )

    def test_map_keys_are_enums(self):
        for model in all_models(AnalyticsReport):
            for name, field in model.model_fields.items():
                for key_type in dict_key_types(field.annotation):
                    with self.subTest(field=f"{model.__name__}.{name}"):
                        self.assertTrue(issubclass(key_type, Enum))


class TestEnumsTrackTheirSources(unittest.TestCase):
    def test_hardware_keys_cover_every_probe(self):
        probed = set(
            re.findall(
                r'_hardware\(\s*"([^"]+)"', inspect.getsource(detection_hardware)
            )
        )

        self.assertTrue(probed)
        self.assertLessEqual(probed, {key.value for key in HardwareKey})

    def test_decode_families_cover_every_hwaccel_family(self):
        families = {
            value.key
            for value in vars(hwaccel).values()
            if isinstance(value, HwaccelFamily)
        }

        self.assertTrue(families)
        self.assertLessEqual(families, {family.value for family in DecodeFamily})

    def test_preset_keys_mirror_the_presets(self):
        for enum, presets in (
            (HwaccelKey, PRESETS_HW_ACCEL_DECODE),
            (InputPresetKey, PRESETS_INPUT),
        ):
            with self.subTest(enum=enum.__name__):
                self.assertEqual(
                    {key.value for key in enum},
                    {name.removeprefix("preset-") for name in presets}
                    | {"custom", "none"},
                )

    def test_notice_keys_are_the_reportable_kinds(self):
        self.assertEqual(
            {key.value for key in NoticeKindKey},
            {key for key, kind in NOTICE_KINDS.items() if kind.reportable},
        )
        self.assertNotIn("analytics_prompt", {key.value for key in NoticeKindKey})
