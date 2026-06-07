"""Tests for outbound WebSocket broadcast filtering."""

import json
import threading
import unittest
from types import SimpleNamespace
from typing import Any

from frigate.comms.ws import (
    WebSocketClient,
    _classify_outbound,
    _collect_zone_names,
    _extract_payload_camera,
    _materialize_for_ws,
    _ws_allowed_cameras,
    _ws_is_unrestricted,
)
from frigate.config import FrigateConfig


def _build_config(
    *,
    extra_roles: dict[str, list[str]] | None = None,
    extra_cameras: dict[str, dict[str, Any]] | None = None,
    extra_zones: dict[str, dict[str, dict[str, Any]]] | None = None,
) -> FrigateConfig:
    """Construct a FrigateConfig used by the outbound filter tests.

    The default fixture has three cameras: front_door, back_door, garage.
    Restricted role "house_only" sees front_door + back_door but not garage.
    """
    cameras: dict[str, dict[str, Any]] = {
        "front_door": {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.1:554/v", "roles": ["detect"]}],
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
        },
        "back_door": {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.2:554/v", "roles": ["detect"]}],
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
        },
        "garage": {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.3:554/v", "roles": ["detect"]}],
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
        },
    }
    if extra_cameras:
        cameras.update(extra_cameras)
    if extra_zones:
        for cam_name, zones in extra_zones.items():
            cameras[cam_name]["zones"] = zones

    roles = {"house_only": ["front_door", "back_door"]}
    if extra_roles:
        roles.update(extra_roles)

    return FrigateConfig(
        mqtt={"host": "mqtt"},
        auth={"roles": roles},
        cameras=cameras,
    )


def _ws(role: str | None) -> Any:
    """Build a fake ws4py-style websocket exposing ``environ``."""
    environ = {} if role is None else {"HTTP_REMOTE_ROLE": role}
    return SimpleNamespace(environ=environ, terminated=False, sent=[])


class TestClassifyOutbound(unittest.TestCase):
    """The pure classifier — bucket every topic into a scope."""

    def setUp(self):
        self.config = _build_config(
            extra_zones={"front_door": {"driveway": {"coordinates": "0,0,1,0,1,1,0,1"}}}
        )
        self.all_cameras = set(self.config.cameras.keys())
        self.all_zones = _collect_zone_names(self.config)

    def _classify(self, topic: str) -> tuple[str, Any]:
        return _classify_outbound(topic, self.all_cameras, self.all_zones)

    # --- Global allowlist ---

    def test_model_state_is_global(self):
        self.assertEqual(self._classify("model_state"), ("global", None))

    def test_profile_state_is_global(self):
        self.assertEqual(self._classify("profile/state"), ("global", None))

    def test_bare_notifications_state_is_global(self):
        """The 2-segment ``notifications/state`` is global; the 3-segment
        ``<camera>/notifications/state`` is camera-scoped (see below)."""
        self.assertEqual(self._classify("notifications/state"), ("global", None))

    def test_notification_test_is_global(self):
        self.assertEqual(self._classify("notification_test"), ("global", None))

    # --- Unrestricted-only ---

    def test_birdseye_layout_is_unrestricted_only(self):
        self.assertEqual(self._classify("birdseye_layout"), ("unrestricted_only", None))

    # --- Camera-prefixed ---

    def test_camera_state_topic_resolves_to_camera(self):
        self.assertEqual(
            self._classify("front_door/detect/state"), ("camera", "front_door")
        )

    def test_camera_motion_topic_resolves_to_camera(self):
        self.assertEqual(self._classify("back_door/motion"), ("camera", "back_door"))

    def test_camera_per_notification_topic_resolves_to_camera(self):
        self.assertEqual(
            self._classify("front_door/notifications/state"),
            ("camera", "front_door"),
        )

    def test_camera_label_counter_resolves_to_camera(self):
        self.assertEqual(self._classify("front_door/person"), ("camera", "front_door"))

    def test_camera_object_mask_state_resolves_to_camera(self):
        self.assertEqual(
            self._classify("front_door/object_mask/zone_1/state"),
            ("camera", "front_door"),
        )

    # --- Zone-prefixed ---

    def test_zone_aggregate_topic_is_unrestricted_only(self):
        self.assertEqual(self._classify("driveway/person"), ("unrestricted_only", None))

    def test_zone_all_topic_is_unrestricted_only(self):
        self.assertEqual(self._classify("driveway/all"), ("unrestricted_only", None))

    # --- Payload-camera ---

    def test_events_topic_marks_payload_camera_path(self):
        self.assertEqual(
            self._classify("events"), ("payload_camera", ("after", "camera"))
        )

    def test_reviews_topic_marks_payload_camera_path(self):
        self.assertEqual(
            self._classify("reviews"), ("payload_camera", ("after", "camera"))
        )

    def test_triggers_topic_marks_payload_camera_path(self):
        self.assertEqual(self._classify("triggers"), ("payload_camera", ("camera",)))

    def test_tracked_object_update_marks_payload_camera_path(self):
        self.assertEqual(
            self._classify("tracked_object_update"), ("payload_camera", ("camera",))
        )

    # --- Reshape ---

    def test_camera_activity_is_reshape_by_camera_key(self):
        self.assertEqual(
            self._classify("camera_activity"), ("reshape_by_camera_key", None)
        )

    def test_audio_detections_is_reshape_by_camera_key(self):
        self.assertEqual(
            self._classify("audio_detections"), ("reshape_by_camera_key", None)
        )

    def test_job_state_is_reshape_job_state(self):
        self.assertEqual(self._classify("job_state"), ("reshape_job_state", None))

    def test_stats_is_reshape_stats(self):
        self.assertEqual(self._classify("stats"), ("reshape_stats", None))

    # --- Fail-closed ---

    def test_unknown_topic_is_dropped(self):
        self.assertEqual(self._classify("some_random_topic"), ("drop", None))

    def test_unknown_camera_prefix_is_dropped(self):
        self.assertEqual(self._classify("ghost_camera/detect/state"), ("drop", None))


class TestCollectZoneNames(unittest.TestCase):
    def test_zones_from_all_cameras(self):
        config = _build_config(
            extra_zones={
                "front_door": {"driveway": {"coordinates": "0,0,1,0,1,1,0,1"}},
                "back_door": {"yard": {"coordinates": "0,0,1,0,1,1,0,1"}},
            }
        )
        self.assertEqual(_collect_zone_names(config), {"driveway", "yard"})

    def test_no_zones_returns_empty(self):
        self.assertEqual(_collect_zone_names(_build_config()), set())


class TestExtractPayloadCamera(unittest.TestCase):
    def test_extract_from_dict_path(self):
        payload = {"after": {"camera": "front_door"}}
        self.assertEqual(
            _extract_payload_camera(payload, ("after", "camera")), "front_door"
        )

    def test_extract_from_json_string(self):
        payload = json.dumps({"after": {"camera": "front_door"}})
        self.assertEqual(
            _extract_payload_camera(payload, ("after", "camera")), "front_door"
        )

    def test_extract_single_segment_path(self):
        self.assertEqual(
            _extract_payload_camera({"camera": "garage"}, ("camera",)), "garage"
        )

    def test_missing_key_returns_none(self):
        self.assertIsNone(_extract_payload_camera({}, ("after", "camera")))

    def test_malformed_json_returns_none(self):
        self.assertIsNone(_extract_payload_camera("not-json", ("camera",)))

    def test_non_string_camera_returns_none(self):
        self.assertIsNone(_extract_payload_camera({"camera": 42}, ("camera",)))


class TestWsRoleHelpers(unittest.TestCase):
    def setUp(self):
        self.config = _build_config()

    def test_admin_is_unrestricted(self):
        self.assertTrue(_ws_is_unrestricted(_ws("admin"), self.config))

    def test_viewer_is_unrestricted(self):
        self.assertTrue(_ws_is_unrestricted(_ws("viewer"), self.config))

    def test_restricted_role_is_not_unrestricted(self):
        self.assertFalse(_ws_is_unrestricted(_ws("house_only"), self.config))

    def test_missing_role_is_not_unrestricted(self):
        self.assertFalse(_ws_is_unrestricted(_ws(None), self.config))

    def test_unknown_role_is_not_unrestricted(self):
        self.assertFalse(_ws_is_unrestricted(_ws("ghost"), self.config))

    def test_admin_allowed_cameras_is_all(self):
        self.assertEqual(
            _ws_allowed_cameras(_ws("admin"), self.config),
            {"front_door", "back_door", "garage"},
        )

    def test_restricted_role_allowed_cameras_is_subset(self):
        self.assertEqual(
            _ws_allowed_cameras(_ws("house_only"), self.config),
            {"front_door", "back_door"},
        )

    def test_missing_role_allowed_cameras_is_empty(self):
        self.assertEqual(_ws_allowed_cameras(_ws(None), self.config), set())

    def test_multi_role_union_grants_widest(self):
        self.assertEqual(
            _ws_allowed_cameras(_ws("house_only,admin"), self.config),
            {"front_door", "back_door", "garage"},
        )


class TestMaterializeForWs(unittest.TestCase):
    def setUp(self):
        self.config = _build_config(
            extra_zones={"front_door": {"driveway": {"coordinates": "0,0,1,0,1,1,0,1"}}}
        )
        self.all_cameras = set(self.config.cameras.keys())
        self.all_zones = _collect_zone_names(self.config)

    def _materialize(self, ws: Any, topic: str, payload: Any) -> str | None:
        scope = _classify_outbound(topic, self.all_cameras, self.all_zones)
        from frigate.comms.ws import _parse_json_payload

        parsed = (
            _parse_json_payload(payload)
            if scope[0]
            in (
                "payload_camera",
                "reshape_by_camera_key",
                "reshape_job_state",
                "reshape_stats",
            )
            else None
        )
        full = json.dumps({"topic": topic, "payload": payload})
        return _materialize_for_ws(ws, topic, full, scope, parsed, self.config)

    # --- Globals: every authenticated client sees them ---

    def test_globals_reach_admin(self):
        self.assertIsNotNone(self._materialize(_ws("admin"), "model_state", "{}"))

    def test_globals_reach_restricted(self):
        self.assertIsNotNone(self._materialize(_ws("house_only"), "model_state", "{}"))

    def test_globals_reach_no_role(self):
        """A missing role header still gets globals (matches viewer-default
        for inbound)."""
        self.assertIsNotNone(self._materialize(_ws(None), "model_state", "{}"))

    # --- Unknown topic dropped for everyone ---

    def test_unknown_topic_dropped_for_admin(self):
        self.assertIsNone(self._materialize(_ws("admin"), "rogue_topic", "{}"))

    # --- Non-global topics require a role (fail-closed) ---

    def test_no_role_blocked_from_camera_topic(self):
        self.assertIsNone(self._materialize(_ws(None), "front_door/detect/state", "ON"))

    def test_no_role_blocked_from_events(self):
        payload = json.dumps({"after": {"camera": "front_door"}})
        self.assertIsNone(self._materialize(_ws(None), "events", payload))

    # --- Camera-prefixed ---

    def test_restricted_role_sees_allowed_camera(self):
        self.assertIsNotNone(
            self._materialize(_ws("house_only"), "front_door/detect/state", "ON")
        )

    def test_restricted_role_blocked_from_unallowed_camera(self):
        self.assertIsNone(
            self._materialize(_ws("house_only"), "garage/detect/state", "ON")
        )

    def test_admin_sees_all_camera_topics(self):
        self.assertIsNotNone(
            self._materialize(_ws("admin"), "garage/detect/state", "ON")
        )

    # --- Unrestricted-only (zones, birdseye_layout) ---

    def test_zone_aggregate_blocked_for_restricted(self):
        self.assertIsNone(self._materialize(_ws("house_only"), "driveway/person", 3))

    def test_zone_aggregate_visible_to_admin(self):
        self.assertIsNotNone(self._materialize(_ws("admin"), "driveway/person", 3))

    def test_birdseye_layout_blocked_for_restricted(self):
        payload = json.dumps(
            {"front_door": {"x": 0, "y": 0, "width": 100, "height": 100}}
        )
        self.assertIsNone(
            self._materialize(_ws("house_only"), "birdseye_layout", payload)
        )

    def test_birdseye_layout_visible_to_admin(self):
        payload = json.dumps(
            {"front_door": {"x": 0, "y": 0, "width": 100, "height": 100}}
        )
        self.assertIsNotNone(
            self._materialize(_ws("admin"), "birdseye_layout", payload)
        )

    # --- Payload-camera ---

    def test_events_filtered_by_payload_camera(self):
        payload = json.dumps({"after": {"camera": "garage"}})
        self.assertIsNone(self._materialize(_ws("house_only"), "events", payload))

        payload = json.dumps({"after": {"camera": "front_door"}})
        self.assertIsNotNone(self._materialize(_ws("house_only"), "events", payload))

    def test_events_with_missing_camera_dropped(self):
        payload = json.dumps({"after": {}})
        self.assertIsNone(self._materialize(_ws("house_only"), "events", payload))

    def test_triggers_filtered_by_payload_camera(self):
        payload = json.dumps({"name": "t1", "camera": "garage"})
        self.assertIsNone(self._materialize(_ws("house_only"), "triggers", payload))

    # --- Reshape: dict keyed by camera ---

    def test_camera_activity_filtered_to_allowed_keys(self):
        payload = json.dumps(
            {
                "front_door": {"objects": 1},
                "back_door": {"objects": 0},
                "garage": {"objects": 2},
            }
        )
        message = self._materialize(_ws("house_only"), "camera_activity", payload)
        self.assertIsNotNone(message)
        envelope = json.loads(message)  # type: ignore[arg-type]
        inner = json.loads(envelope["payload"])
        self.assertEqual(set(inner.keys()), {"front_door", "back_door"})
        self.assertNotIn("garage", inner)

    def test_camera_activity_unchanged_for_admin(self):
        payload = json.dumps({"front_door": {}, "back_door": {}, "garage": {}})
        message = self._materialize(_ws("admin"), "camera_activity", payload)
        envelope = json.loads(message)  # type: ignore[arg-type]
        self.assertEqual(envelope["payload"], payload)

    def test_camera_activity_with_no_allowed_returns_none(self):
        payload = json.dumps({"garage": {"objects": 2}})
        self.assertIsNone(
            self._materialize(_ws("house_only"), "camera_activity", payload)
        )

    def test_audio_detections_filtered_to_allowed_keys(self):
        payload = json.dumps({"front_door": {"bark": {}}, "garage": {"speech": {}}})
        message = self._materialize(_ws("house_only"), "audio_detections", payload)
        envelope = json.loads(message)  # type: ignore[arg-type]
        inner = json.loads(envelope["payload"])
        self.assertEqual(set(inner.keys()), {"front_door"})

    # --- Reshape: job_state ---

    def test_job_state_admin_sees_full_payload(self):
        payload = json.dumps(
            {
                "motion_search": {"job_type": "motion_search", "camera": "garage"},
                "media_sync": {"job_type": "media_sync"},
            }
        )
        message = self._materialize(_ws("admin"), "job_state", payload)
        envelope = json.loads(message)  # type: ignore[arg-type]
        self.assertEqual(envelope["payload"], payload)

    def test_job_state_restricted_keeps_allowed_camera_jobs(self):
        """Top-level camera field on a job entry: drop if not allowed."""
        payload = json.dumps(
            {
                "motion_search": {"job_type": "motion_search", "camera": "front_door"},
                "vlm_watch": {"job_type": "vlm_watch", "camera": "garage"},
            }
        )
        message = self._materialize(_ws("house_only"), "job_state", payload)
        envelope = json.loads(message)  # type: ignore[arg-type]
        inner = json.loads(envelope["payload"])
        self.assertIn("motion_search", inner)
        self.assertNotIn("vlm_watch", inner)

    def test_job_state_export_results_jobs_filtered_per_recipient(self):
        """The aggregated export broadcast nests per-camera sub-jobs under
        ``results.jobs``. Restricted users must only see allowed entries."""
        payload = json.dumps(
            {
                "export": {
                    "job_type": "export",
                    "status": "running",
                    "results": {
                        "jobs": [
                            {"job_type": "export", "camera": "front_door", "id": "a"},
                            {"job_type": "export", "camera": "garage", "id": "b"},
                            {"job_type": "export", "camera": "back_door", "id": "c"},
                        ]
                    },
                }
            }
        )
        message = self._materialize(_ws("house_only"), "job_state", payload)
        envelope = json.loads(message)  # type: ignore[arg-type]
        inner = json.loads(envelope["payload"])
        self.assertIn("export", inner)
        kept_cameras = [j["camera"] for j in inner["export"]["results"]["jobs"]]
        self.assertEqual(kept_cameras, ["front_door", "back_door"])
        # Sibling fields like ``status`` must survive reshaping.
        self.assertEqual(inner["export"]["status"], "running")

    def test_job_state_export_entry_dropped_when_no_jobs_allowed(self):
        payload = json.dumps(
            {
                "export": {
                    "job_type": "export",
                    "status": "running",
                    "results": {
                        "jobs": [
                            {"job_type": "export", "camera": "garage", "id": "b"},
                        ]
                    },
                }
            }
        )
        self.assertIsNone(self._materialize(_ws("house_only"), "job_state", payload))

    # --- Reshape: stats ---

    def _stats_payload(self) -> str:
        return json.dumps(
            {
                "cameras": {
                    "front_door": {"camera_fps": 5.0, "pid": 1234},
                    "back_door": {"camera_fps": 5.0, "pid": 1235},
                    "garage": {"camera_fps": 5.0, "pid": 1236},
                },
                "detectors": {"cpu": {"detection_start": 0.0, "inference_speed": 10}},
                "service": {"uptime": 12345, "version": "0.16.0"},
                "camera_fps": 15.0,
                "detection_fps": 6.0,
            }
        )

    def test_stats_admin_sees_full_payload(self):
        message = self._materialize(_ws("admin"), "stats", self._stats_payload())
        envelope = json.loads(message)  # type: ignore[arg-type]
        self.assertEqual(envelope["payload"], self._stats_payload())

    def test_stats_restricted_filters_camera_keys_but_keeps_aggregates(self):
        message = self._materialize(_ws("house_only"), "stats", self._stats_payload())
        envelope = json.loads(message)  # type: ignore[arg-type]
        inner = json.loads(envelope["payload"])
        self.assertEqual(set(inner["cameras"].keys()), {"front_door", "back_door"})
        self.assertNotIn("garage", inner["cameras"])
        # Aggregates, detectors, and service block must survive.
        self.assertEqual(inner["camera_fps"], 15.0)
        self.assertEqual(inner["detection_fps"], 6.0)
        self.assertIn("detectors", inner)
        self.assertIn("service", inner)

    def test_stats_restricted_with_no_allowed_cameras_still_sends_aggregates(self):
        """A restricted role whose allow-list contains only nonexistent cameras
        still gets the global aggregates and service block."""
        config = _build_config(extra_roles={"empty_role": ["nonexistent"]})
        from frigate.comms.ws import _parse_json_payload

        payload = self._stats_payload()
        all_cameras = set(config.cameras.keys())
        scope = _classify_outbound("stats", all_cameras, _collect_zone_names(config))
        full = json.dumps({"topic": "stats", "payload": payload})
        message = _materialize_for_ws(
            _ws("empty_role"),
            "stats",
            full,
            scope,
            _parse_json_payload(payload),
            config,
        )
        envelope = json.loads(message)  # type: ignore[arg-type]
        inner = json.loads(envelope["payload"])
        self.assertEqual(inner["cameras"], {})
        self.assertEqual(inner["camera_fps"], 15.0)
        self.assertIn("service", inner)

    def test_stats_without_cameras_key_passes_through(self):
        """A malformed stats payload missing the cameras sub-dict shouldn't
        break delivery for restricted users — fall back to the full message."""
        payload = json.dumps({"detectors": {}, "service": {}, "detection_fps": 0.0})
        message = self._materialize(_ws("house_only"), "stats", payload)
        envelope = json.loads(message)  # type: ignore[arg-type]
        self.assertEqual(envelope["payload"], payload)

    def test_job_state_export_entry_unchanged_for_admin(self):
        payload = json.dumps(
            {
                "export": {
                    "job_type": "export",
                    "status": "running",
                    "results": {
                        "jobs": [
                            {"job_type": "export", "camera": "garage", "id": "b"},
                        ]
                    },
                }
            }
        )
        message = self._materialize(_ws("admin"), "job_state", payload)
        envelope = json.loads(message)  # type: ignore[arg-type]
        self.assertEqual(envelope["payload"], payload)

    def test_job_state_restricted_keeps_global_jobs(self):
        """media_sync has no camera field; restricted users still see it."""
        payload = json.dumps(
            {"media_sync": {"job_type": "media_sync", "status": "running"}}
        )
        message = self._materialize(_ws("house_only"), "job_state", payload)
        envelope = json.loads(message)  # type: ignore[arg-type]
        inner = json.loads(envelope["payload"])
        self.assertIn("media_sync", inner)

    def test_job_state_debug_replay_nested_source_camera_filtered(self):
        """debug_replay puts ``source_camera`` inside ``results`` (see
        jobs/debug_replay.py:to_dict). Restricted users must not receive
        entries whose nested source camera is unauthorized."""
        payload = json.dumps(
            {
                "debug_replay": {
                    "id": "bd6dc99d-a7d",
                    "job_type": "debug_replay",
                    "status": "running",
                    "start_time": 1.0,
                    "end_time": None,
                    "error_message": None,
                    "results": {
                        "current_step": "preparing_clip",
                        "progress_percent": 0.0,
                        "source_camera": "garage",
                        "replay_camera_name": "_replay_garage",
                        "start_ts": 0.0,
                        "end_ts": 1.0,
                    },
                }
            }
        )
        self.assertIsNone(self._materialize(_ws("house_only"), "job_state", payload))

    def test_job_state_debug_replay_nested_source_camera_allowed(self):
        payload = json.dumps(
            {
                "debug_replay": {
                    "id": "bd6dc99d-a7d",
                    "job_type": "debug_replay",
                    "status": "running",
                    "results": {
                        "source_camera": "front_door",
                        "replay_camera_name": "_replay_front_door",
                    },
                }
            }
        )
        message = self._materialize(_ws("house_only"), "job_state", payload)
        envelope = json.loads(message)  # type: ignore[arg-type]
        inner = json.loads(envelope["payload"])
        self.assertIn("debug_replay", inner)
        self.assertEqual(
            inner["debug_replay"]["results"]["source_camera"], "front_door"
        )


class _FakeManager:
    """Minimal ws4py manager: holds clients and exposes a lock."""

    def __init__(self, clients: list[Any]) -> None:
        self.lock = threading.Lock()
        self.websockets = {id(c): c for c in clients}


class _FakeServer:
    def __init__(self, manager: _FakeManager) -> None:
        self.manager = manager


class _CapturingWs(SimpleNamespace):
    """Fake ws4py client that records what was sent."""

    def __init__(self, role: str | None) -> None:
        environ = {} if role is None else {"HTTP_REMOTE_ROLE": role}
        super().__init__(environ=environ, terminated=False)
        self.sent: list[str] = []

    def send(self, message: str) -> None:  # noqa: D401 - matches ws4py API
        self.sent.append(message)


class TestPublishEndToEnd(unittest.TestCase):
    """Drive WebSocketClient.publish() against fake clients with different roles."""

    def setUp(self):
        self.config = _build_config(
            extra_zones={"front_door": {"driveway": {"coordinates": "0,0,1,0,1,1,0,1"}}}
        )
        self.admin = _CapturingWs("admin")
        self.restricted = _CapturingWs("house_only")
        self.anon = _CapturingWs(None)
        self.client = WebSocketClient(self.config)
        self.client.websocket_server = _FakeServer(
            _FakeManager([self.admin, self.restricted, self.anon])
        )

    def _payloads(self, ws: _CapturingWs) -> list[Any]:
        return [json.loads(m)["payload"] for m in ws.sent]

    def test_global_topic_reaches_everyone(self):
        self.client.publish("model_state", "{}")
        self.assertEqual(len(self.admin.sent), 1)
        self.assertEqual(len(self.restricted.sent), 1)
        self.assertEqual(len(self.anon.sent), 1)

    def test_camera_topic_filters_restricted_recipient(self):
        self.client.publish("garage/detect/state", "ON")
        self.assertEqual(len(self.admin.sent), 1)
        self.assertEqual(len(self.restricted.sent), 0)
        self.assertEqual(len(self.anon.sent), 0)

    def test_camera_topic_allows_restricted_recipient_for_allowed_camera(self):
        self.client.publish("front_door/detect/state", "ON")
        self.assertEqual(len(self.admin.sent), 1)
        self.assertEqual(len(self.restricted.sent), 1)
        self.assertEqual(len(self.anon.sent), 0)

    def test_events_payload_filtered(self):
        self.client.publish("events", json.dumps({"after": {"camera": "garage"}}))
        self.assertEqual(len(self.admin.sent), 1)
        self.assertEqual(len(self.restricted.sent), 0)

    def test_camera_activity_reshaped_per_recipient(self):
        self.client.publish(
            "camera_activity",
            json.dumps(
                {
                    "front_door": {"objects": 1},
                    "back_door": {"objects": 0},
                    "garage": {"objects": 2},
                }
            ),
        )
        self.assertEqual(len(self.admin.sent), 1)
        admin_inner = json.loads(self._payloads(self.admin)[0])
        self.assertEqual(set(admin_inner.keys()), {"front_door", "back_door", "garage"})

        self.assertEqual(len(self.restricted.sent), 1)
        restricted_inner = json.loads(self._payloads(self.restricted)[0])
        self.assertEqual(set(restricted_inner.keys()), {"front_door", "back_door"})

        self.assertEqual(len(self.anon.sent), 0)

    def test_birdseye_layout_blocked_for_restricted_and_anon(self):
        self.client.publish(
            "birdseye_layout",
            json.dumps({"front_door": {"x": 0, "y": 0, "width": 1, "height": 1}}),
        )
        self.assertEqual(len(self.admin.sent), 1)
        self.assertEqual(len(self.restricted.sent), 0)
        self.assertEqual(len(self.anon.sent), 0)

    def test_zone_aggregate_blocked_for_restricted(self):
        self.client.publish("driveway/person", 2)
        self.assertEqual(len(self.admin.sent), 1)
        self.assertEqual(len(self.restricted.sent), 0)

    def test_stats_reshaped_per_recipient(self):
        self.client.publish(
            "stats",
            json.dumps(
                {
                    "cameras": {
                        "front_door": {"camera_fps": 5.0},
                        "garage": {"camera_fps": 5.0},
                    },
                    "service": {"uptime": 1},
                    "camera_fps": 10.0,
                }
            ),
        )
        self.assertEqual(len(self.admin.sent), 1)
        admin_inner = json.loads(self._payloads(self.admin)[0])
        self.assertEqual(set(admin_inner["cameras"].keys()), {"front_door", "garage"})

        self.assertEqual(len(self.restricted.sent), 1)
        restricted_inner = json.loads(self._payloads(self.restricted)[0])
        self.assertEqual(set(restricted_inner["cameras"].keys()), {"front_door"})
        self.assertEqual(restricted_inner["camera_fps"], 10.0)
        self.assertIn("service", restricted_inner)

        # Stats requires a role; anonymous gets nothing.
        self.assertEqual(len(self.anon.sent), 0)

    def test_export_job_state_filters_results_jobs_per_recipient(self):
        self.client.publish(
            "job_state",
            json.dumps(
                {
                    "export": {
                        "job_type": "export",
                        "status": "running",
                        "results": {
                            "jobs": [
                                {"camera": "front_door", "id": "a"},
                                {"camera": "garage", "id": "b"},
                            ]
                        },
                    }
                }
            ),
        )
        self.assertEqual(len(self.admin.sent), 1)
        admin_inner = json.loads(self._payloads(self.admin)[0])
        self.assertEqual(
            [j["camera"] for j in admin_inner["export"]["results"]["jobs"]],
            ["front_door", "garage"],
        )

        self.assertEqual(len(self.restricted.sent), 1)
        restricted_inner = json.loads(self._payloads(self.restricted)[0])
        self.assertEqual(
            [j["camera"] for j in restricted_inner["export"]["results"]["jobs"]],
            ["front_door"],
        )

    def test_unknown_topic_dropped_for_everyone(self):
        self.client.publish("some_rogue_topic", "data")
        self.assertEqual(self.admin.sent, [])
        self.assertEqual(self.restricted.sent, [])
        self.assertEqual(self.anon.sent, [])

    def test_terminated_client_is_skipped(self):
        self.restricted.terminated = True
        self.client.publish("front_door/detect/state", "ON")
        self.assertEqual(len(self.admin.sent), 1)
        self.assertEqual(len(self.restricted.sent), 0)


if __name__ == "__main__":
    unittest.main()
