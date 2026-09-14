"""Synthetic IPC regression; no camera, model, database or production endpoint.

Run with Python + pyzmq: FRIGATE_SOURCE_ROOT=/checkout/frigate python this_file.py
Import-only AST substitution permits testing the full real modules without the
Frigate image's OpenCV/ORM dependencies. Transport and producer bodies are intact.
"""

import __future__

import ast
import os
import tempfile
import threading
import types
import unittest
from pathlib import Path

import zmq


class ImportsOnly(ast.NodeTransformer):
    def visit_Import(self, node):
        names = [n for n in node.names if n.name not in ("cv2", "numpy")]
        return ast.copy_location(ast.Import(names=names), node) if names else ast.Pass()

    def visit_ImportFrom(self, node):
        if node.level or (node.module or "").startswith(("frigate", "peewee")):
            return ast.copy_location(ast.Pass(), node)
        return node


class Meter:
    def __init__(self, *args):
        self.updates = []

    def start(self):
        pass

    def update(self, *args):
        self.updates.append(args)

    def eps(self):
        return len(self.updates)


class DescriptionIPC(unittest.TestCase):
    def source(self, name):
        root = Path(os.environ.get("FRIGATE_SOURCE_ROOT", "frigate"))
        return (root / name).read_text()

    def setUp(self):
        self.ns = {"__name__": "synthetic_description_ipc", "TYPE_CHECKING": False}
        for name in (
            "comms/base_communicator.py",
            "comms/inter_process.py",
            "data_processing/post/api.py",
            "data_processing/post/object_descriptions.py",
        ):
            tree = ImportsOnly().visit(ast.parse(self.source(name), filename=name))
            ast.fix_missing_locations(tree)
            exec(
                compile(tree, name, "exec", flags=__future__.annotations.compiler_flag),
                self.ns,
            )
        self.ns.update(
            EventsPerSecond=Meter,
            InferenceSpeed=Meter,
            ensure_jpeg_bytes=lambda value: value,
            UPDATE_EVENT_DESCRIPTION="update_event_description",
            TrackedObjectUpdateTypesEnum=types.SimpleNamespace(
                description="description"
            ),
        )
        self.tmp = tempfile.TemporaryDirectory(prefix="description-ipc-", dir="/tmp")
        self.addCleanup(self.tmp.cleanup)
        self.ns["SOCKET_REP_REQ"] = "ipc://" + self.tmp.name + "/rep"
        self.contexts = []
        self.sockets = []
        # Observe real resources; do not replace any socket operation.
        contexts, sockets = self.contexts, self.sockets

        class Context(zmq.Context):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
                contexts.append(self)

            def socket(self, *args, **kwargs):
                result = super().socket(*args, **kwargs)
                sockets.append(result)
                return result

        self.ns["zmq"] = types.SimpleNamespace(**{k: getattr(zmq, k) for k in dir(zmq)})
        self.ns["zmq"].Context = Context
        self.shared = self.ns["InterProcessRequestor"]()
        self.addCleanup(self.shared.stop)
        camera = types.SimpleNamespace(
            objects=types.SimpleNamespace(
                genai=types.SimpleNamespace(
                    use_snapshot=False, debug_save_thumbnails=False
                )
            )
        )
        config = types.SimpleNamespace(
            cameras={"synthetic_camera": camera},
            semantic_search=types.SimpleNamespace(enabled=False),
        )
        self.descriptions = {
            "A": '  Synthetic café "quoted"\nline two  ',
            "B": "Synthetic B",
        }
        self.generated = []

        def generate(camera, thumbnails, event):
            self.generated.append(event.id)
            return self.descriptions[event.id]

        client = types.SimpleNamespace(generate_object_description=generate)
        client.description_client = client
        self.processor = self.ns["ObjectDescriptionProcessor"](
            config,
            None,
            self.shared,
            types.SimpleNamespace(object_desc_speed=None),
            client,
            None,
        )
        self.camera = camera
        self.workers = []

        def new_thread(*args, **kwargs):
            thread = threading.Thread(*args, **kwargs)
            self.workers.append(thread)
            return thread

        self.ns["threading"] = types.SimpleNamespace(Thread=new_thread)
        self.received = []
        self.acks = []
        self.first = threading.Event()
        self.release = threading.Event()
        self.stop = threading.Event()
        self.ready = threading.Event()
        self.server_errors = []
        self.reply = []
        self.server = None
        self.addCleanup(self.cleanup_transport)

    def cleanup_transport(self):
        self.release.set()
        self.stop.set()
        for thread in self.workers + ([self.server] if self.server else []):
            thread.join(3)
            self.assertFalse(thread.is_alive(), thread.name)
        # Shared requestor is still usable/owned by the maintainer. All NEW
        # description resources must already be closed, before shared.stop().
        self.assertTrue(all(s.closed for s in self.sockets[1:]))
        self.assertTrue(all(c.closed for c in self.contexts[1:]))
        self.assertFalse(self.shared.context.closed)
        self.assertFalse(self.shared.socket.closed)
        self.assertEqual(self.server_errors, [])

    def start_server(self, hold=False):
        endpoint = self.ns["SOCKET_REP_REQ"]

        def serve():
            try:
                with zmq.Context() as context:
                    with context.socket(zmq.REP) as socket:
                        socket.setsockopt(zmq.LINGER, 0)
                        socket.bind(endpoint)
                        self.ready.set()
                        while not self.stop.is_set():
                            if not socket.poll(50):
                                continue
                            self.received.append(socket.recv_json())
                            if len(self.received) == 1:
                                self.first.set()
                                if hold and not self.release.wait(2):
                                    raise AssertionError("reply hold was not released")
                            socket.send_json(self.reply)
                            self.acks.append(self.received[-1])
            except BaseException as exc:
                self.server_errors.append(type(exc).__name__)
                self.ready.set()

        self.server = threading.Thread(target=serve, name="private-rep", daemon=True)
        self.server.start()
        self.assertTrue(self.ready.wait(2))

    def event(self, name):
        return types.SimpleNamespace(
            id=name, camera="synthetic_camera", has_snapshot=False
        )

    def spawn(self, name):
        self.processor._process_genai_description(
            self.event(name), self.camera, b"synthetic-jpeg"
        )
        return self.workers[-1]

    def call(self, name):
        self.processor._genai_embed_description(self.event(name), [b"synthetic-jpeg"])

    def assert_updates(self, count):
        self.assertEqual(len(self.processor.object_desc_speed.updates), count)
        self.assertEqual(len(self.processor.object_desc_dps.updates), count)

    def test_sequential_payload_is_exact(self):
        self.start_server()
        self.call("A")
        self.call("B")
        self.assertEqual(
            self.received,
            [
                [
                    "update_event_description",
                    {
                        "type": "description",
                        "id": name,
                        "description": self.descriptions[name],
                        "camera": "synthetic_camera",
                    },
                ]
                for name in ("A", "B")
            ],
        )
        self.assert_updates(2)

    def test_overlapping_real_producers_both_acknowledged(self):
        self.start_server(hold=True)
        b_sent = threading.Event()
        errors = []

        def trace(frame, event, arg):
            if frame.f_code.co_name == "send_json":
                obj = frame.f_locals.get("obj")
                if (
                    isinstance(obj, tuple)
                    and isinstance(obj[1], dict)
                    and obj[1].get("id") == "B"
                ):
                    if event == "exception" and isinstance(arg[1], zmq.ZMQError):
                        errors.append(arg[1].errno)
                    if event == "return":
                        b_sent.set()
            return trace

        old = threading.gettrace()
        threading.settrace(trace)
        try:
            a = self.spawn("A")
            self.assertTrue(self.first.wait(2))
            self.assertTrue(a.is_alive())
            b = self.spawn("B")
            self.assertTrue(
                b_sent.wait(2), "B must attempt send while A's reply is held"
            )
            self.assertTrue(a.is_alive())
            self.release.set()
            a.join(2)
            b.join(2)
            self.assertFalse(a.is_alive())
            self.assertFalse(b.is_alive())
        finally:
            threading.settrace(old)
        self.assertEqual(errors, [], "shared REQ EFSM silently discards B")
        self.assertEqual([x[1]["id"] for x in self.received], ["A", "B"])
        self.assertEqual(len(self.acks), 2)
        self.assert_updates(2)

    def test_no_listener_is_bounded_and_not_success(self):
        self.ns["DESCRIPTION_IPC_TIMEOUT_MS"] = 100
        with self.assertLogs("synthetic_description_ipc", level="WARNING") as captured:
            self.call("A")
        self.assertIn("description_ipc_timeout", " ".join(captured.output))
        self.assertNotIn(self.descriptions["A"], " ".join(captured.output))
        self.assert_updates(0)

    def test_missing_reply_does_not_stall_shared_sender(self):
        self.ns["DESCRIPTION_IPC_TIMEOUT_MS"] = 100
        self.start_server(hold=True)
        worker = self.spawn("A")
        self.assertTrue(self.first.wait(2))
        worker.join(1)
        self.assertFalse(worker.is_alive(), "description recv must be bounded")
        self.assert_updates(0)
        # No new global lock or global context change; use the actual ordinary
        # sender after the deliberately blocked single REP is released.
        self.release.set()
        self.assertEqual(self.shared.send_data("ordinary", {"value": "unchanged"}), [])
        self.assertEqual(self.received[-1], ["ordinary", {"value": "unchanged"}])

    def test_ordinary_sender_runs_while_description_is_waiting(self):
        self.start_server()
        self.ns["DESCRIPTION_IPC_TIMEOUT_MS"] = 2000
        # The maintainer requestor already owns the first private endpoint.
        # Only the new description call connects to the missing endpoint.
        self.ns["SOCKET_REP_REQ"] = "ipc://" + self.tmp.name + "/missing"
        entered = threading.Event()

        def trace(frame, event, arg):
            if event == "call" and frame.f_code.co_name == "send_json":
                obj = frame.f_locals.get("obj")
                if isinstance(obj, tuple) and obj[0] == "update_event_description":
                    entered.set()
            return trace

        old = threading.gettrace()
        threading.settrace(trace)
        try:
            worker = self.spawn("A")
            self.assertTrue(entered.wait(1))
            self.assertEqual(
                self.shared.send_data("ordinary", {"value": "unchanged"}), []
            )
            self.assertTrue(
                worker.is_alive(), "ordinary sender waited for description timeout"
            )
            worker.join(3)
            self.assertFalse(worker.is_alive())
        finally:
            threading.settrace(old)
        self.assert_updates(0)

    def test_invalid_reply_is_not_success(self):
        self.start_server()
        self.reply = ""
        with self.assertLogs("synthetic_description_ipc", level="WARNING") as captured:
            self.call("A")
        self.assertIn("description_ipc_invalid_reply", " ".join(captured.output))
        self.assert_updates(0)

    def test_transport_exception_cleans_up_and_has_safe_class(self):
        self.ns["SOCKET_REP_REQ"] = "invalid-transport://synthetic"
        with self.assertLogs("synthetic_description_ipc", level="WARNING") as captured:
            self.call("A")
        self.assertIn("description_ipc_transport_error", " ".join(captured.output))
        self.assertNotIn("invalid-transport", " ".join(captured.output))
        self.assert_updates(0)

    def test_success_preserves_embedding_and_trigger_payload(self):
        self.start_server()
        embedded, triggered = [], []
        self.processor.config.semantic_search.enabled = True
        self.processor.embeddings = types.SimpleNamespace(
            embed_description=lambda *args: embedded.append(args)
        )
        self.processor.semantic_trigger_processor = types.SimpleNamespace(
            process_data=lambda *args: triggered.append(args)
        )
        self.ns["PostProcessDataEnum"] = types.SimpleNamespace(
            tracked_object="tracked_object"
        )
        self.call("A")
        self.assertEqual(embedded, [("A", self.descriptions["A"])])
        self.assertEqual(
            triggered,
            [
                (
                    {"event_id": "A", "camera": "synthetic_camera", "type": "text"},
                    "tracked_object",
                )
            ],
        )
        self.assert_updates(1)

    def test_failed_transport_does_not_embed_or_trigger(self):
        self.ns["DESCRIPTION_IPC_TIMEOUT_MS"] = 100
        self.processor.config.semantic_search.enabled = True
        # None would raise if the failure path fell through into embedding.
        with self.assertLogs("synthetic_description_ipc", level="WARNING"):
            self.call("A")
        self.assert_updates(0)

    def test_serialization_failure_cleans_up_and_has_safe_class(self):
        self.descriptions["A"] = object()
        with self.assertLogs("synthetic_description_ipc", level="WARNING") as captured:
            self.call("A")
        self.assertIn("description_ipc_invalid_payload", " ".join(captured.output))
        self.assert_updates(0)

    def test_empty_generation_allocates_no_transport(self):
        self.descriptions["A"] = ""
        self.call("A")
        self.assertEqual(len(self.contexts), 1)
        self.assert_updates(0)


if __name__ == "__main__":
    unittest.main()
