"""Tests for the WAV helpers and transcript stitcher in frigate.util.audio."""

import io
import struct
import unittest
import wave

import numpy as np

from frigate.const import AUDIO_SAMPLE_RATE
from frigate.util.audio import fix_wav_header, pcm16_to_wav, stitch_transcripts


def _wav(samples: np.ndarray, sample_rate: int = AUDIO_SAMPLE_RATE) -> bytes:
    buffer = io.BytesIO()

    with wave.open(buffer, "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(sample_rate)
        out.writeframes(samples.tobytes())

    return buffer.getvalue()


class TestPcm16ToWav(unittest.TestCase):
    def test_round_trips_through_wave(self):
        samples = np.arange(-1000, 1000, dtype=np.int16)

        with wave.open(io.BytesIO(pcm16_to_wav(samples)), "rb") as wav:
            self.assertEqual(wav.getnchannels(), 1)
            self.assertEqual(wav.getsampwidth(), 2)
            self.assertEqual(wav.getframerate(), AUDIO_SAMPLE_RATE)
            self.assertEqual(wav.getnframes(), samples.size)
            decoded = np.frombuffer(wav.readframes(wav.getnframes()), dtype=np.int16)

        np.testing.assert_array_equal(decoded, samples)

    def test_casts_non_int16_input(self):
        samples = np.array([0.0, 100.0, -100.0], dtype=np.float32)

        with wave.open(io.BytesIO(pcm16_to_wav(samples)), "rb") as wav:
            decoded = np.frombuffer(wav.readframes(wav.getnframes()), dtype=np.int16)

        np.testing.assert_array_equal(decoded, np.array([0, 100, -100], np.int16))

    def test_honors_sample_rate(self):
        with wave.open(
            io.BytesIO(pcm16_to_wav(np.zeros(4, np.int16), 8000)), "rb"
        ) as w:
            self.assertEqual(w.getframerate(), 8000)


class TestFixWavHeader(unittest.TestCase):
    def test_rewrites_placeholder_sizes(self):
        samples = np.arange(64, dtype=np.int16)
        data = bytearray(_wav(samples))

        # ffmpeg piping to non-seekable stdout leaves both sizes unpatched
        struct.pack_into("<I", data, 4, 0xFFFFFFFF)
        data_offset = data.index(b"data")
        struct.pack_into("<I", data, data_offset + 4, 0xFFFFFFFF)

        fixed = fix_wav_header(bytes(data))

        self.assertEqual(struct.unpack_from("<I", fixed, 4)[0], len(fixed) - 8)
        self.assertEqual(
            struct.unpack_from("<I", fixed, data_offset + 4)[0],
            len(fixed) - (data_offset + 8),
        )

        with wave.open(io.BytesIO(fixed), "rb") as wav:
            self.assertEqual(wav.getnframes(), samples.size)

    def test_leaves_a_well_formed_header_alone(self):
        data = _wav(np.arange(32, dtype=np.int16))
        self.assertEqual(fix_wav_header(data), data)

    def test_non_riff_payload_passes_through(self):
        self.assertEqual(fix_wav_header(b"not a wav"), b"not a wav")
        self.assertEqual(fix_wav_header(b""), b"")


class TestStitchTranscripts(unittest.TestCase):
    def test_table(self):
        cases = [
            # (committed, incoming, expected, description)
            (
                "the quick brown",
                "brown fox jumps",
                "the quick brown fox jumps",
                "one word",
            ),
            (
                "and then the quick brown",
                "the quick brown fox",
                "and then the quick brown fox",
                "multi word",
            ),
            (
                "hello there",
                "general kenobi",
                "hello there general kenobi",
                "no overlap",
            ),
            ("the quick brown fox", "brown fox", "the quick brown fox", "contained"),
            ("", "first words", "first words", "empty committed"),
            ("already here", "", "already here", "empty incoming"),
            (
                "  spaced   out  ",
                "out again",
                "spaced out again",
                "whitespace normalized",
            ),
        ]

        for committed, incoming, expected, description in cases:
            with self.subTest(description):
                self.assertEqual(stitch_transcripts(committed, incoming), expected)

    def test_overlap_found_mid_window(self):
        """The shared run is rarely at the start of the new window.

        The provider re-transcribes the overlapping audio independently and
        often renders its first word differently, so anchoring the match to the
        start of the incoming window duplicates the whole phrase.
        """
        self.assertEqual(
            stitch_transcripts(
                "this is just gonna be a fun time", "It's gonna be a fun time."
            ),
            "this is just gonna be a fun time",
        )

    def test_overlap_longer_than_five_words(self):
        """The cap is bounded by window duration, not by the old 5-word n-gram."""
        self.assertEqual(
            stitch_transcripts(
                "well anyway one two three four five six",
                "one two three four five six seven",
            ),
            "well anyway one two three four five six seven",
        )

    def test_repeated_phrase_keeps_its_second_utterance(self):
        """Preferring the earliest match is what protects a real repeat."""
        self.assertEqual(
            stitch_transcripts("a b c fun time", "fun time fun time"),
            "a b c fun time fun time",
        )

    def test_window_wholly_repeating_the_tail_is_dropped(self):
        """The accepted trade-off: an entirely redundant window adds nothing."""
        self.assertEqual(stitch_transcripts("go go go", "go go go"), "go go go")

    def test_revises_a_mistranscribed_tail(self):
        """A wrong last word would otherwise block every alignment.

        Those words came from the newest audio, which the next window re-covers,
        so replacing them is better than duplicating the phrase behind them.
        """
        self.assertEqual(
            stitch_transcripts("Yeah. this is Jessica.", "This is just gonna be fun."),
            "Yeah. this is just gonna be fun.",
        )

    def test_revision_needs_more_than_one_shared_word(self):
        """A revision deletes published text, so it takes real evidence."""
        self.assertEqual(
            stitch_transcripts("the cat sat on a mat", "a dog barked"),
            "the cat sat on a mat a dog barked",
        )


if __name__ == "__main__":
    unittest.main()
