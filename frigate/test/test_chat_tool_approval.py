"""Tests for chat tool approval and the export and event image tools."""

import asyncio
import base64
import json
import os
import tempfile
import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import cv2
import numpy as np
from playhouse.sqlite_ext import SqliteExtDatabase

from frigate.api.chat import (
    TOOL_REJECTED_RESULT,
    _execute_create_export,
    _execute_get_event_image,
    _execute_get_export_cases,
    _execute_pending_tools,
    _pending_tool_calls_from_tail,
    _tool_calls_awaiting_approval,
)
from frigate.api.defs.request.chat_body import ChatCompletionRequest
from frigate.genai.prompts import (
    get_tool_definitions,
    get_write_tool_names,
    strip_tool_access,
)
from frigate.genai.utils import build_assistant_message_for_conversation
from frigate.jobs.export import ExportQueueFullError
from frigate.models import Event, Export, ExportCase, Previews, Recordings


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _request(role: str = "admin", supports_vision: bool = True):
    camera = SimpleNamespace(
        record=SimpleNamespace(export=SimpleNamespace(chapters=None)),
    )
    app = SimpleNamespace(
        frigate_config=SimpleNamespace(
            cameras={"driveway": camera, "garage": camera},
            proxy=SimpleNamespace(separator=","),
        ),
        genai_manager=SimpleNamespace(
            chat_client=SimpleNamespace(supports_vision=supports_vision),
        ),
    )
    return SimpleNamespace(app=app, headers={"remote-role": role})


def _body(**kwargs) -> ChatCompletionRequest:
    return ChatCompletionRequest(messages=[], **kwargs)


WRITE_TOOLS = get_write_tool_names(get_tool_definitions())


class TestToolRegistry(unittest.TestCase):
    def test_every_tool_declares_access(self):
        for tool in get_tool_definitions():
            self.assertIn(tool.get("access"), ("read", "write"), tool)

    def test_write_tools(self):
        self.assertEqual(
            WRITE_TOOLS,
            {
                "set_camera_state",
                "start_camera_watch",
                "stop_camera_watch",
                "create_export",
            },
        )

    def test_strip_tool_access_removes_frigate_field(self):
        for tool in strip_tool_access(get_tool_definitions()):
            self.assertNotIn("access", tool)
            self.assertEqual(set(tool), {"type", "function"})

    def test_new_tools_are_registered(self):
        names = {t["function"]["name"] for t in get_tool_definitions()}
        self.assertIn("get_export_cases", names)
        self.assertIn("create_export", names)
        self.assertIn("get_event_image", names)

    def test_create_export_requires_time_range(self):
        tool = next(
            t
            for t in get_tool_definitions()
            if t["function"]["name"] == "create_export"
        )
        params = tool["function"]["parameters"]
        self.assertEqual(params["required"], ["camera", "start_time", "end_time"])
        self.assertNotIn("event_id", params["properties"])
        self.assertNotIn("new_case_name", params["properties"])

    def test_get_event_image_requires_event_id(self):
        tool = next(
            t
            for t in get_tool_definitions()
            if t["function"]["name"] == "get_event_image"
        )
        self.assertEqual(tool["function"]["parameters"]["required"], ["event_id"])


class TestApprovalHelpers(unittest.TestCase):
    def test_tail_without_tool_calls_is_not_pending(self):
        self.assertIsNone(_pending_tool_calls_from_tail([]))
        self.assertIsNone(
            _pending_tool_calls_from_tail([{"role": "user", "content": "hi"}])
        )
        self.assertIsNone(
            _pending_tool_calls_from_tail([{"role": "assistant", "content": "ok"}])
        )

    def test_tail_with_tool_calls_is_parsed(self):
        tail = build_assistant_message_for_conversation(
            None, [{"id": "call_1", "name": "create_export", "arguments": {"a": 1}}]
        )
        pending = _pending_tool_calls_from_tail([{"role": "user"}, tail])
        self.assertEqual(
            pending, [{"id": "call_1", "name": "create_export", "arguments": {"a": 1}}]
        )

    def test_read_tools_never_await_approval(self):
        pending = [{"id": "c1", "name": "search_objects", "arguments": {}}]
        self.assertEqual(
            _tool_calls_awaiting_approval(pending, _body(), WRITE_TOOLS), []
        )

    def test_write_tools_await_approval(self):
        pending = [
            {"id": "c1", "name": "search_objects", "arguments": {}},
            {"id": "c2", "name": "create_export", "arguments": {"camera": "x"}},
        ]
        awaiting = _tool_calls_awaiting_approval(pending, _body(), WRITE_TOOLS)
        self.assertEqual(
            awaiting,
            [{"id": "c2", "name": "create_export", "arguments": {"camera": "x"}}],
        )

    def test_decided_calls_skip_approval(self):
        pending = [
            {"id": "c2", "name": "create_export", "arguments": {}},
            {"id": "c3", "name": "set_camera_state", "arguments": {}},
        ]
        body = _body(tool_decisions={"c2": "approve", "c3": "reject"})
        self.assertEqual(_tool_calls_awaiting_approval(pending, body, WRITE_TOOLS), [])


class TestExecutePendingTools(unittest.TestCase):
    def test_rejected_call_is_not_executed(self):
        execute = AsyncMock(return_value={"success": True})
        pending = [{"id": "c1", "name": "create_export", "arguments": {}}]
        with patch("frigate.api.chat._execute_tool_internal", execute):
            calls, results, extra = _run(
                _execute_pending_tools(
                    pending, _request(), ["driveway"], decisions={"c1": "reject"}
                )
            )
        execute.assert_not_called()
        self.assertEqual(json.loads(results[0]["content"]), TOOL_REJECTED_RESULT)
        self.assertEqual(results[0]["tool_call_id"], "c1")
        self.assertEqual(calls[0].name, "create_export")
        # The user's intent goes to the model as a follow-up user message.
        self.assertEqual(len(extra), 1)
        self.assertEqual(extra[0]["role"], "user")
        text = extra[0]["content"][0]["text"]
        self.assertIn("do not want to proceed", text)
        self.assertIn("create export", text)
        self.assertIn("clarification", text)

    def test_approved_call_is_executed(self):
        execute = AsyncMock(return_value={"success": True})
        pending = [{"id": "c1", "name": "create_export", "arguments": {}}]
        with patch("frigate.api.chat._execute_tool_internal", execute):
            _calls, results, _extra = _run(
                _execute_pending_tools(
                    pending, _request(), ["driveway"], decisions={"c1": "approve"}
                )
            )
        execute.assert_awaited_once()
        self.assertEqual(json.loads(results[0]["content"]), {"success": True})

    def test_image_text_becomes_user_message(self):
        execute = AsyncMock(
            return_value={
                "id": "evt",
                "_image_url": "data:image/jpeg;base64,xx",
                "_image_text": "Here is the thumbnail.",
            }
        )
        pending = [{"id": "c1", "name": "get_event_image", "arguments": {}}]
        with patch("frigate.api.chat._execute_tool_internal", execute):
            _calls, results, extra = _run(
                _execute_pending_tools(pending, _request(), ["driveway"])
            )
        self.assertEqual(json.loads(results[0]["content"]), {"id": "evt"})
        self.assertEqual(extra[0]["role"], "user")
        self.assertEqual(extra[0]["content"][0]["text"], "Here is the thumbnail.")
        self.assertEqual(
            extra[0]["content"][1]["image_url"]["url"], "data:image/jpeg;base64,xx"
        )


class DatabaseTestCase(unittest.TestCase):
    models = [Event, Export, ExportCase, Recordings, Previews]

    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.tmp.close()
        self.db = SqliteExtDatabase(self.tmp.name)
        for model in self.models:
            model.bind(self.db, bind_refs=False, bind_backrefs=False)
        self.db.connect()
        self.db.create_tables(self.models)

    def tearDown(self):
        self.db.close()
        os.unlink(self.tmp.name)

    def make_event(self, event_id, camera="driveway", thumbnail="", **overrides):
        fields = dict(
            id=event_id,
            label="car",
            sub_label=None,
            camera=camera,
            start_time=1_700_000_100,
            end_time=1_700_000_110,
            top_score=0.9,
            score=0.9,
            false_positive=False,
            zones=[],
            thumbnail=thumbnail,
            has_clip=True,
            has_snapshot=False,
            region=[0, 0, 1, 1],
            box=[0, 0, 1, 1],
            area=1,
            retain_indefinitely=False,
            ratio=1.0,
            plus_id="",
            model_hash="",
            detector_type="",
            model_type="",
            data={},
        )
        fields.update(overrides)
        return Event.create(**fields)

    def make_case(self, case_id, name="Case"):
        now = datetime.fromtimestamp(1_700_000_000)
        return ExportCase.create(
            id=case_id, name=name, description=None, created_at=now, updated_at=now
        )


def _jpeg_base64() -> str:
    frame = np.zeros((8, 8, 3), dtype=np.uint8)
    _, encoded = cv2.imencode(".jpg", frame)
    return base64.b64encode(encoded.tobytes()).decode("utf-8")


class TestGetEventImage(DatabaseTestCase):
    def test_requires_vision(self):
        self.make_event("evt", thumbnail=_jpeg_base64())
        result = _run(
            _execute_get_event_image(
                _request(supports_vision=False), {"event_id": "evt"}, ["driveway"]
            )
        )
        self.assertIn("vision", result["error"])

    def test_unknown_event(self):
        result = _run(
            _execute_get_event_image(_request(), {"event_id": "nope"}, ["driveway"])
        )
        self.assertIn("nope", result["error"])

    def test_camera_access_denied(self):
        self.make_event("evt", camera="garage", thumbnail=_jpeg_base64())
        result = _run(
            _execute_get_event_image(_request(), {"event_id": "evt"}, ["driveway"])
        )
        self.assertIn("access denied", result["error"])

    def test_thumbnail_is_attached(self):
        self.make_event(
            "evt", thumbnail=_jpeg_base64(), data={"description": "a red car"}
        )
        result = _run(
            _execute_get_event_image(_request(), {"event_id": "evt"}, ["driveway"])
        )
        self.assertEqual(result["id"], "evt")
        self.assertEqual(result["image"], "thumbnail")
        self.assertEqual(result["description"], "a red car")
        self.assertIn("start_time_local", result)
        self.assertTrue(result["_image_url"].startswith("data:image/jpeg;base64,"))
        self.assertIn("thumbnail", result["_image_text"])

    def test_snapshot_falls_back_to_thumbnail(self):
        self.make_event("evt", thumbnail=_jpeg_base64(), has_snapshot=False)
        result = _run(
            _execute_get_event_image(
                _request(), {"event_id": "evt", "image": "snapshot"}, ["driveway"]
            )
        )
        self.assertEqual(result["image"], "thumbnail")
        self.assertIn("note", result)

    def test_no_image_available(self):
        self.make_event("evt", thumbnail="")
        with patch("frigate.api.chat.get_event_thumbnail_bytes", return_value=None):
            result = _run(
                _execute_get_event_image(_request(), {"event_id": "evt"}, ["driveway"])
            )
        self.assertIn("error", result)


class TestGetExportCases(DatabaseTestCase):
    def test_no_cases(self):
        result = _execute_get_export_cases(["driveway"])
        self.assertEqual(result["cases"], [])
        self.assertIn("message", result)

    def test_counts_only_accessible_exports(self):
        self.make_case("case_a", name="Break-in")
        self.make_case("case_b", name="Empty")
        for idx, camera in enumerate(["driveway", "driveway", "garage"]):
            Export.create(
                id=f"exp_{idx}",
                camera=camera,
                name=f"Export {idx}",
                date=datetime.fromtimestamp(1_700_000_000 + idx),
                video_path=f"/exports/{idx}.mp4",
                thumb_path=f"/exports/{idx}.jpg",
                in_progress=False,
                export_case="case_a",
            )

        result = _execute_get_export_cases(["driveway"])
        by_id = {c["id"]: c for c in result["cases"]}
        self.assertEqual(by_id["case_a"]["export_count"], 2)
        self.assertEqual(by_id["case_b"]["export_count"], 0)
        self.assertEqual(by_id["case_a"]["name"], "Break-in")
        self.assertIn("created_at_local", by_id["case_a"])


class TestCreateExport(DatabaseTestCase):
    def setUp(self):
        super().setUp()
        Recordings.create(
            id="rec_1",
            camera="driveway",
            path="/recordings/rec_1.mp4",
            start_time=1_700_000_000,
            end_time=1_700_001_000,
            duration=1000,
        )

    @staticmethod
    def _iso(timestamp: int) -> str:
        return datetime.fromtimestamp(timestamp).strftime("%Y-%m-%dT%H:%M:%S")

    def _args(self, **overrides):
        args = {
            "camera": "driveway",
            "start_time": self._iso(1_700_000_100),
            "end_time": self._iso(1_700_000_200),
        }
        args.update(overrides)
        return args

    def test_requires_camera_and_range(self):
        result = _run(_execute_create_export(_request(), {}, ["driveway"]))
        self.assertIn("required", result["error"])

    def test_camera_access_denied(self):
        result = _run(
            _execute_create_export(
                _request(), self._args(camera="garage"), ["driveway"]
            )
        )
        self.assertIn("access denied", result["error"])

    def test_end_before_start(self):
        result = _run(
            _execute_create_export(
                _request(),
                self._args(end_time=self._iso(1_700_000_050)),
                ["driveway"],
            )
        )
        self.assertIn("after start_time", result["error"])

    def test_existing_case_requires_admin(self):
        self.make_case("case_a")
        result = _run(
            _execute_create_export(
                _request(role="viewer"),
                self._args(export_case_id="case_a"),
                ["driveway"],
            )
        )
        self.assertIn("admins", result["error"])

    def test_unknown_case(self):
        result = _run(
            _execute_create_export(
                _request(), self._args(export_case_id="nope"), ["driveway"]
            )
        )
        self.assertIn("nope", result["error"])

    def test_export_is_queued(self):
        self.make_case("case_a")
        with patch("frigate.api.chat.start_export_job") as start:
            result = _run(
                _execute_create_export(
                    _request(),
                    self._args(name="Delivery", export_case_id="case_a"),
                    ["driveway"],
                )
            )
        self.assertTrue(result["success"])
        self.assertEqual(result["status"], "queued")
        self.assertEqual(result["camera"], "driveway")
        self.assertEqual(result["export_case_id"], "case_a")
        job = start.call_args.args[1]
        self.assertEqual(job.camera, "driveway")
        self.assertEqual(job.request_start_time, 1_700_000_100)
        self.assertEqual(job.request_end_time, 1_700_000_200)
        self.assertEqual(job.name, "Delivery")
        self.assertEqual(job.export_case_id, "case_a")

    def test_no_recordings_in_range(self):
        result = _run(
            _execute_create_export(
                _request(),
                {
                    "camera": "driveway",
                    "start_time": "2030-01-01T00:00:00",
                    "end_time": "2030-01-01T01:00:00",
                },
                ["driveway"],
            )
        )
        self.assertIn("No recordings", result["error"])

    def test_queue_full(self):
        with patch(
            "frigate.api.chat.start_export_job", side_effect=ExportQueueFullError()
        ):
            result = _run(
                _execute_create_export(_request(), self._args(), ["driveway"])
            )
        self.assertIn("queue is full", result["error"])


class TestSetCameraStateRoles(unittest.TestCase):
    def test_non_admin_is_rejected(self):
        from frigate.api.chat import _execute_set_camera_state

        result = _run(
            _execute_set_camera_state(
                _request(role="viewer"),
                {"camera": "driveway", "feature": "detect", "value": "OFF"},
            )
        )
        self.assertIn("Admin", result["error"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
