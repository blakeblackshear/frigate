"""Unit tests for the ONVIF analytics metadata decoder + cell→box mapper."""

import base64
import unittest

import numpy as np

from frigate.ptz.onvif_metadata import (
    _cells_to_boxes,
    _decode_cells,
    _extract_cells_from_doc,
    _packbits_decode,
)


class TestPackBits(unittest.TestCase):
    def test_spec_example(self):
        # ONVIF Analytics Annex B worked example:
        #   raw  = ff ff ff f0 f0 f0
        #   packed (PackBits) = fe ff fe f0
        packed = bytes.fromhex("feff fef0".replace(" ", ""))
        self.assertEqual(
            _packbits_decode(packed),
            bytes.fromhex("ffff fff0 f0f0".replace(" ", "")),
        )

    def test_idle_frame_from_live_camera(self):
        # `zwA=` is a representative idle-frame payload from a 22×18 grid:
        # 396 bits → 50 bytes after byte-padding; PackBits compresses 50
        # zeros to `cf 00` → base64 `zwA=`.
        packed = base64.b64decode("zwA=")
        self.assertEqual(packed, bytes.fromhex("cf 00".replace(" ", "")))
        raw = _packbits_decode(packed)
        self.assertEqual(len(raw), 50)
        self.assertEqual(raw, b"\x00" * 50)

    def test_literal_run(self):
        # Header 0x03 → 4 literal bytes follow.
        self.assertEqual(_packbits_decode(b"\x03ABCD"), b"ABCD")

    def test_noop_header(self):
        # 0x80 is no-op per spec; literal after should still decode normally.
        # \x80 → no-op; \x02 → literal of 3 bytes follows; "ABC" copied.
        self.assertEqual(_packbits_decode(b"\x80\x02ABC"), b"ABC")


class TestDecodeCells(unittest.TestCase):
    def test_idle(self):
        cells = _decode_cells("zwA=", 22, 18)
        self.assertIsNotNone(cells)
        self.assertEqual(cells.shape, (18, 22))
        self.assertEqual(int(cells.sum()), 0)

    def test_invalid_base64(self):
        self.assertIsNone(_decode_cells("not-base64!@", 22, 18))

    def test_short_payload_returns_none(self):
        # `cf 00` decodes to 50 bytes; ask for 100×100 grid (1250 bytes
        # needed) → expect None.
        self.assertIsNone(_decode_cells("zwA=", 100, 100))

    def test_top_left_active(self):
        # Build a 22×18 grid with only cell (0,0) active. Raw bitmap byte 0
        # = 0x80 (MSB set), bytes 1..49 = 0x00. PackBits of that 50-byte
        # sequence: literal-1-byte (header 0x00) of 0x80, then replicate of
        # 49 zeros (header 257-49=208=0xD0, byte 0x00).
        packed = bytes([0x00, 0x80, 0xD0, 0x00])
        b64 = base64.b64encode(packed).decode()
        cells = _decode_cells(b64, 22, 18)
        self.assertIsNotNone(cells)
        self.assertEqual(int(cells[0, 0]), 1)
        self.assertEqual(int(cells.sum()), 1)


class TestCellsToBoxes(unittest.TestCase):
    """Verify the cell-grid → detect-frame pixel mapping using a representative
    CellLayout (22x18, Translate(-1,-1), Scale(2/22, 2/18))."""

    LAYOUT = (22, 18, (-1.0, -1.0), (2.0 / 22, 2.0 / 18))
    DETECT = (1280, 720)

    def test_empty(self):
        cells = np.zeros((18, 22), dtype=np.uint8)
        self.assertEqual(_cells_to_boxes(cells, self.LAYOUT, self.DETECT), [])

    def test_top_left_cell(self):
        cells = np.zeros((18, 22), dtype=np.uint8)
        cells[0, 0] = 1
        boxes = _cells_to_boxes(cells, self.LAYOUT, self.DETECT)
        self.assertEqual(len(boxes), 1)
        x1, y1, x2, y2 = boxes[0]
        # Cell (0,0) covers normalized [-1, -1+2/22] × [-1, -1+2/18]
        # → detect px [0, 1280/22] × [0, 720/18] = [0, ~58] × [0, 40]
        self.assertEqual(x1, 0)
        self.assertEqual(y1, 0)
        self.assertAlmostEqual(x2, round(1280 / 22), delta=2)
        self.assertAlmostEqual(y2, round(720 / 18), delta=2)

    def test_bottom_right_cell(self):
        cells = np.zeros((18, 22), dtype=np.uint8)
        cells[17, 21] = 1
        boxes = _cells_to_boxes(cells, self.LAYOUT, self.DETECT)
        self.assertEqual(len(boxes), 1)
        x1, y1, x2, y2 = boxes[0]
        # Bottom-right edge clamps to detect_size - 1.
        self.assertEqual(x2, self.DETECT[0] - 1)
        self.assertEqual(y2, self.DETECT[1] - 1)
        self.assertAlmostEqual(x1, round(21 * 1280 / 22), delta=2)
        self.assertAlmostEqual(y1, round(17 * 720 / 18), delta=2)

    def test_two_separated_regions(self):
        cells = np.zeros((18, 22), dtype=np.uint8)
        # Region A: top-left 2×2 block
        cells[0:2, 0:2] = 1
        # Region B: bottom-right 2×2 block (separated by inactive cells)
        cells[15:17, 18:20] = 1
        boxes = _cells_to_boxes(cells, self.LAYOUT, self.DETECT)
        self.assertEqual(len(boxes), 2)


class TestExtractCellsFromDoc(unittest.TestCase):
    def test_typical_frame(self):
        doc = (
            b'<tt:MetadataStream xmlns:tt="http://www.onvif.org/ver10/schema">'
            b"<tt:VideoAnalytics>"
            b'<tt:Frame UtcTime="2026-05-29T14:12:20Z">'
            b"<tt:Extension>"
            b'<tt:MotionInCells Columns="22" Rows="18" Cells="zwA="/>'
            b"</tt:Extension></tt:Frame></tt:VideoAnalytics></tt:MetadataStream>"
        )
        cells_b64, cols, rows = _extract_cells_from_doc(doc)
        self.assertEqual(cells_b64, "zwA=")
        self.assertEqual(cols, 22)
        self.assertEqual(rows, 18)

    def test_malformed_xml(self):
        self.assertEqual(
            _extract_cells_from_doc(b"not-xml"),
            (None, 0, 0),
        )

    def test_doc_without_motioncells(self):
        doc = (
            b'<tt:MetadataStream xmlns:tt="http://www.onvif.org/ver10/schema">'
            b"<tt:VideoAnalytics><tt:Frame/></tt:VideoAnalytics>"
            b"</tt:MetadataStream>"
        )
        self.assertEqual(_extract_cells_from_doc(doc), (None, 0, 0))


if __name__ == "__main__":
    unittest.main()
