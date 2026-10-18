"""Test camera user and password cleanup."""

import time
import unittest

from frigate.util.builtin import (
    clean_camera_user_pass,
    escape_special_characters,
    is_masked_camera_path,
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

    def test_masks_userinfo_and_credential_query_forms(self):
        cases = {
            "rtsp://first.last@mail.com:p%40w@10.0.0.2/live": "rtsp://*:*@10.0.0.2/live",
            "rtsp://user+tag:pw@10.0.0.2/live": "rtsp://*:*@10.0.0.2/live",
            "rtsp://:pw@10.0.0.2/live": "rtsp://*:*@10.0.0.2/live",
            "tapo://cloudpassword@10.0.0.2": "tapo://*:*@10.0.0.2",
            "rtsp://u:p@ss@10.0.0.2/live": "rtsp://*:*@10.0.0.2/live",
            "rtsp://user:pa/ss@10.0.0.2/live": "rtsp://*:*@10.0.0.2/live",
            "rtsp://u:p@ss#x@10.0.0.2/live": "rtsp://*:*@10.0.0.2/live",
            "rtsp://admin:2024/pw@10.0.0.2/x": "rtsp://*:*@10.0.0.2/x",
            "rtsp://admin:12#abc@10.0.0.2/x": "rtsp://*:*@10.0.0.2/x",
            "rtsp://admin:7?x@10.0.0.2/x": "rtsp://*:*@10.0.0.2/x",
            "rtsps://u:1/2@h/x": "rtsps://*:*@h/x",
            "rtsp://admin:pre&token=suf@10.0.0.2/x": "rtsp://*:*@",
            "rtsp://admin:a?pwd=b@10.0.0.2/x": "rtsp://*:*@",
            "rtsp://10.0.0.2:554/live?password=pre@suf": "rtsp://*:*@",
            "http://10.0.0.2:88/cgi?cmd=snap&usr=admin&pwd=P@ss": "http://*:*@",
            "ffmpeg:http://h:80/flv?user=u&password=p@ss#video=copy": (
                "ffmpeg:http://*:*@"
            ),
            "rtsp://u:p@10.0.0.2:554/live?token=t": "rtsp://*:*@10.0.0.2:554/live?token=*",
            "http://h/x?api_key=a&apikey=b&access_token=c": (
                "http://h/x?api_key=*&apikey=*&access_token=*"
            ),
            "http://h/cgi?user=admin&password=x": "http://h/cgi?user=*&password=*",
            "http://h/cgi?password=x&user=admin&channel=1": (
                "http://h/cgi?password=*&user=*&channel=1"
            ),
            "http://h/x?usr=a&pwd=b": "http://h/x?usr=*&pwd=*",
            "http://h/x?username=a&password=b": "http://h/x?username=*&password=*",
            "rtsp://host/live?user=admin&password=p@ss": (
                "rtsp://host/live?user=*&password=*"
            ),
            "ring:?refresh_token=abc.def": "ring:?refresh_token=*",
            "nest:?client_id=1&client_secret=s&refresh_token=t&project_id=p": (
                "nest:?client_id=1&client_secret=*&refresh_token=*&project_id=p"
            ),
            "homekit://10.0.0.2:51827?client_id=c&client_private=k&device_id=d": (
                "homekit://10.0.0.2:51827?client_id=c&client_private=*&device_id=d"
            ),
            "exec:ffmpeg -i rtsp://u:p@h/s -c copy -f rtsp {output}": (
                "exec:ffmpeg -i rtsp://*:*@h/s -c copy -f rtsp {output}"
            ),
            "ffmpeg -i rtsp://u:p@h/1 -i http://h/snap?user=a&password=b -f null": (
                "ffmpeg -i rtsp://*:*@h/1 -i http://h/snap?user=*&password=* -f null"
            ),
        }

        for line, expected in cases.items():
            with self.subTest(line=line):
                masked = clean_camera_user_pass(line)
                self.assertEqual(masked, expected)
                self.assertTrue(is_masked_camera_path(masked))
                self.assertEqual(clean_camera_user_pass(masked), masked)

    def test_safe_strings_unchanged(self):
        for line in (
            "rtsp://10.0.0.2:554/live",
            "ffmpeg:front_door#video=copy",
            "rtsp://127.0.0.1:8554/front_door?video=copy&audio=aac",
            "homekit://10.0.0.2:51827?device_id=d",
            "http://10.0.0.1/snap.jpg?email=me@x.com",
            "http://h/x?auth=a&author=b&authorization=c&user_agent=d&autoken=e",
            "http://h/x?private=1&passthrough=1",
            "Camera front_door is not responding",
        ):
            with self.subTest(line=line):
                self.assertEqual(clean_camera_user_pass(line), line)
                self.assertFalse(is_masked_camera_path(line))

    def test_commas_outside_credentials_survive(self):
        """ffprobe splits multiple paths on commas left after masking."""
        for line in (
            "rtsp://a/x,rtsp://u:p@b/y",
            "rtsp://a:554/x,rtsp://u:p@b/y",
        ):
            with self.subTest(line=line):
                self.assertIn(",", clean_camera_user_pass(line))
        self.assertNotIn(",", clean_camera_user_pass("rtsp://u:p,q@b/y"))

    def test_long_line_masks_in_linear_time(self):
        """Log lines run through the mask, so a long one must stay fast."""
        start = time.perf_counter()
        clean_camera_user_pass("rtsp://u:p" * 20000)
        clean_camera_user_pass("rtsp://" + "a." * 40000)
        self.assertLess(time.perf_counter() - start, 1)
