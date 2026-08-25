"""Tests for the recordings batch insert handler."""

import unittest
from unittest.mock import MagicMock, patch

from playhouse.sqlite_ext import SqliteExtDatabase

from frigate.comms.dispatcher import Dispatcher
from frigate.const import INSERT_MANY_RECORDINGS
from frigate.models import Recordings


def _recording(id: str, path: str) -> dict:
    return {
        Recordings.id.name: id,
        Recordings.camera.name: "front_door",
        Recordings.stream_type.name: "main",
        Recordings.path.name: path,
        Recordings.start_time.name: 1000.0,
        Recordings.end_time.name: 1010.0,
        Recordings.duration.name: 10.0,
        Recordings.motion.name: 0,
        Recordings.objects.name: 0,
        Recordings.dBFS.name: 0,
        Recordings.segment_size.name: 1.0,
    }


class TestInsertManyRecordings(unittest.TestCase):
    """A duplicate path must not cost the rest of the batch."""

    def setUp(self):
        self.db = SqliteExtDatabase(":memory:")
        self.db.bind([Recordings])
        self.db.create_tables([Recordings])

        with (
            patch("frigate.comms.dispatcher.CameraActivityManager"),
            patch("frigate.comms.dispatcher.AudioActivityManager"),
        ):
            self.dispatcher = Dispatcher(MagicMock(), MagicMock(), MagicMock(), {}, [])

    def tearDown(self):
        self.db.close()

    def test_batch_with_duplicate_keeps_the_other_rows(self):
        Recordings.insert(_recording("existing", "/rec/00.10.mp4")).execute()

        self.dispatcher._receive(
            INSERT_MANY_RECORDINGS,
            [
                _recording("a", "/rec/00.20.mp4"),
                _recording("b", "/rec/00.10.mp4"),
                _recording("c", "/rec/00.30.mp4"),
            ],
        )

        paths = {r.path for r in Recordings.select()}
        self.assertEqual(paths, {"/rec/00.10.mp4", "/rec/00.20.mp4", "/rec/00.30.mp4"})

    def test_clean_batch_inserts_every_row(self):
        self.dispatcher._receive(
            INSERT_MANY_RECORDINGS,
            [_recording("a", "/rec/00.20.mp4"), _recording("b", "/rec/00.30.mp4")],
        )

        self.assertEqual(Recordings.select().count(), 2)
