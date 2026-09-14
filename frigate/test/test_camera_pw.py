"""Test camera user and password cleanup."""

import unittest

from frigate.util.builtin import (
    clean_camera_user_pass,
    encode_go2rtc_source_password,
    escape_special_characters,
)


class TestUserPassCleanup(unittest.TestCase):
    def setUp(self) -> None:
        self.rtsp_with_pass = "rtsp://user:password@192.168.0.2:554/live"
        self.rtsp_with_special_pass = "rtsp://user:password`~!@#$%^&*()-_;',.<>:\"\\{\\}\\[\\]@@192.168.0.2:554/live"
        self.rtsp_no_pass = "rtsp://192.168.0.3:554/live"

    def test_cleanup(self):
        """Test that user / pass are cleaned up."""
        clean = clean_camera_user_pass(self.rtsp_with_pass)
        assert clean != self.rtsp_with_pass
        assert "user:password" not in clean

    def test_no_cleanup(self):
        """Test that nothing changes when no user / pass are defined."""
        clean = clean_camera_user_pass(self.rtsp_no_pass)
        assert clean == self.rtsp_no_pass

    def test_special_char_password(self):
        """Test that special characters in pw are escaped, but not others."""
        escaped = escape_special_characters(self.rtsp_with_special_pass)
        assert (
            escaped
            == "rtsp://user:password%60~%21%40%23%24%25%5E%26%2A%28%29-_%3B%27%2C.%3C%3E%3A%22%5C%7B%5C%7D%5C%5B%5C%5D%40@192.168.0.2:554/live"
        )

    def test_no_special_char_password(self):
        """Test that no change is made to path with no special characters."""
        escaped = escape_special_characters(self.rtsp_with_pass)
        assert escaped == self.rtsp_with_pass


class TestUserPassMasking(unittest.TestCase):
    def setUp(self) -> None:
        self.rtsp_log_message = "Did you mean file:rtsp://user:password@192.168.1.3:554"

    def test_rtsp_in_log_message(self):
        """Test that the rtsp url in a log message is escaped."""
        escaped = clean_camera_user_pass(self.rtsp_log_message)
        print(f"The escaped is {escaped}")
        assert escaped == "Did you mean file:rtsp://*:*@192.168.1.3:554"


class TestGo2rtcSourcePasswordEncoding(unittest.TestCase):
    def test_raw_reserved_characters_are_encoded(self):
        self.assertEqual(
            encode_go2rtc_source_password("rtsp://admin:ab#c?d/e@10.0.0.2:554/live"),
            "rtsp://admin:ab%23c%3Fd%2Fe@10.0.0.2:554/live",
        )

    def test_password_with_space_is_encoded(self):
        self.assertEqual(
            encode_go2rtc_source_password("rtsp://admin:ab cd@10.0.0.2:554/live"),
            "rtsp://admin:ab%20cd@10.0.0.2:554/live",
        )

    def test_at_after_host_is_not_part_of_password(self):
        for source in (
            "rtsp://admin:pass@10.0.0.2/cam?email=a@b.com",
            "rtsp://camera:554/live@x",
        ):
            self.assertEqual(encode_go2rtc_source_password(source), source)

    def test_at_after_host_with_raw_password_is_not_consumed(self):
        self.assertEqual(
            encode_go2rtc_source_password(
                "rtsp://admin:ab#cd@10.0.0.2/cam?email=a@b.com"
            ),
            "rtsp://admin:ab%23cd@10.0.0.2/cam?email=a@b.com",
        )

    def test_password_that_forms_a_valid_url_is_unchanged(self):
        # ambiguous: go2rtc reads host "ss", so it is left for the user to encode
        source = "rtsp://admin:P@ss#1@10.0.0.2/live"
        self.assertEqual(encode_go2rtc_source_password(source), source)

    def test_at_and_percent_in_password_are_encoded(self):
        self.assertEqual(
            encode_go2rtc_source_password("rtsp://username:$@foo%@192.168.1.100"),
            "rtsp://username:$%40foo%25@192.168.1.100",
        )

    def test_encoded_password_is_unchanged(self):
        source = "rtsp://username:$%40foo%25%23@192.168.1.100/live"
        self.assertEqual(encode_go2rtc_source_password(source), source)

    def test_partially_encoded_password_is_completed(self):
        self.assertEqual(
            encode_go2rtc_source_password("rtsp://admin:%40ab#cd@10.0.0.2/live"),
            "rtsp://admin:%40ab%23cd@10.0.0.2/live",
        )

    def test_encoding_is_idempotent(self):
        source = "rtsp://admin:p@ss:w#rd{é}@10.0.0.2/live"
        once = encode_go2rtc_source_password(source)
        self.assertEqual(once, "rtsp://admin:p%40ss%3Aw%23rd%7B%C3%A9%7D@10.0.0.2/live")
        self.assertEqual(encode_go2rtc_source_password(once), once)

    def test_ffmpeg_source_params_are_preserved(self):
        self.assertEqual(
            encode_go2rtc_source_password(
                "ffmpeg:rtsp://admin:ab#nQK4@10.0.0.2:554/cam?channel=1&subtype=0"
                "#video=copy#backchannel=0"
            ),
            "ffmpeg:rtsp://admin:ab%23nQK4@10.0.0.2:554/cam?channel=1&subtype=0"
            "#video=copy#backchannel=0",
        )

    def test_safe_password_is_unchanged(self):
        source = "rtsp://admin:Pass!word$1&2@10.0.0.2/live#backchannel=0"
        self.assertEqual(encode_go2rtc_source_password(source), source)

    def test_source_without_credentials_is_unchanged(self):
        for source in (
            "rtsp://10.0.0.2:554/live",
            "rtsp://127.0.0.1:8554/front_door",
            "ffmpeg:front_door#audio=opus",
        ):
            self.assertEqual(encode_go2rtc_source_password(source), source)

    def test_exec_sources_are_unchanged(self):
        source = "exec:ffmpeg -i rtsp://admin:ab#cd@10.0.0.2/live -f rtsp {output}"
        self.assertEqual(encode_go2rtc_source_password(source), source)
