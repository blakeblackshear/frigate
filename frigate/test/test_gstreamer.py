from unittest import TestCase, main, mock
from frigate.gstreamer import (
    gst_discover,
    gst_inspect_find_codec,
    autodetect_decoder_pipeline,
    GstreamerBuilder,
)


class TestGstTools(TestCase):
    def test_gst_discover(self):
        response = """
            Topology:
            unknown: application/x-rtp, media=(string)video, payload=(int)98, clock-rate=(int)90000, encoding-name=(string)H265, profile-id=(string)1, sprop-sps=(string)"QgEBAWAAAAMAsAAAAwAAAwBaoAeCAeFja5JMvTcBAQEAgA\=\=", sprop-pps=(string)"RAHA8vA8kA\=\=", sprop-vps=(string)"QAEMAf//AWAAAAMAsAAAAwAAAwBarAk\=", a-packetization-supported=(string)DH, a-rtppayload-supported=(string)DH, a-framerate=(string)15.000000, a-recvonly=(string)"", ssrc=(uint)1080610384, clock-base=(uint)52816, seqnum-base=(uint)52816, npt-start=(guint64)0, play-speed=(double)1, play-scale=(double)1
                video: video/x-h265, stream-format=(string)byte-stream, alignment=(string)au, width=(int)960, height=(int)480, chroma-format=(string)4:2:0, bit-depth-luma=(uint)8, bit-depth-chroma=(uint)8, parsed=(boolean)true, profile=(string)main, tier=(string)main, level=(string)3
                Tags:
                    video codec: H.265 (Main Profile)
                
                Codec:
                    video/x-h265, stream-format=(string)byte-stream, alignment=(string)au, width=(int)960, height=(int)480, chroma-format=(string)4:2:0, bit-depth-luma=(uint)8, bit-depth-chroma=(uint)8, parsed=(boolean)true, profile=(string)main, tier=(string)main, level=(string)3
                Additional info:
                    None
                Stream ID: b9049c323800fa1dbf0c9c2f5d6dcf0e63b50fc2c5030d1c14e44a893d14e333/video:0:0:RTP:AVP:98
                Width: 960
                Height: 480
                Depth: 24
                Frame rate: 0/1

            Properties:
            Duration: 99:99:99.999999999
            Seekable: no
            Live: yes
            Tags: 
                video codec: H.265 (Main Profile)        
        """
        with mock.patch(
            "frigate.gstreamer.sp.check_output", return_value=response
        ) as mock_checkout:
            result = gst_discover("path to stream", ["width", "height", "video codec"])
            assert result == {"height": "480", "video codec": "H.265", "width": "960"}
            mock_checkout.assert_called_once_with(
                ["gst-discoverer-1.0", "-v", "path to stream"],
                universal_newlines=True,
                start_new_session=True,
                stderr=None,
            )

    def test_gst_inspect_find_codec(self):
        response = """
            omx:  omxh264dec: OpenMAX H.264 Video Decoder
            omx:  omxh264enc: OpenMAX H.264 Video Encoder
            libav:  avenc_h264_omx: libav OpenMAX IL H.264 video encoder encoder
            libav:  avdec_h264: libav H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10 decoder
            typefindfunctions: video/x-h264: h264, x264, 264
            rtp:  rtph264depay: RTP H264 depayloader
            rtp:  rtph264pay: RTP H264 payloader
            nvvideo4linux2:  nvv4l2h264enc: V4L2 H.264 Encoder
            uvch264:  uvch264mjpgdemux: UVC H264 MJPG Demuxer
            uvch264:  uvch264src: UVC H264 Source
            videoparsersbad:  h264parse: H.264 parser
            omx:  omxh265dec: OpenMAX H.265 Video Decoder
            omx:  omxh265enc: OpenMAX H.265 Video Encoder
            libav:  avdec_h265: libav HEVC (High Efficiency Video Coding) decoder
            typefindfunctions: video/x-h265: h265, x265, 265
            rtp:  rtph265depay: RTP H265 depayloader
            rtp:  rtph265pay: RTP H265 payloader
            nvvideo4linux2:  nvv4l2h265enc: V4L2 H.265 Encoder
            videoparsersbad:  h265parse: H.265 parser       
        """
        with mock.patch(
            "frigate.gstreamer.sp.check_output", return_value=response
        ) as mock_checkout:
            result = gst_inspect_find_codec("h264")
            assert result == [
                "omxh264dec",
                "omxh264enc",
                "avenc_h264_omx",
                "avdec_h264",
                "video/x-h264",
                "rtph264depay",
                "rtph264pay",
                "nvv4l2h264enc",
                "uvch264mjpgdemux",
                "uvch264src",
                "h264parse",
            ]
            mock_checkout.assert_called_once_with(
                ["gst-inspect-1.0"],
                universal_newlines=True,
                start_new_session=True,
                stderr=None,
            )
            result = gst_inspect_find_codec("h265")
            assert result == [
                "omxh265dec",
                "omxh265enc",
                "avdec_h265",
                "video/x-h265",
                "rtph265depay",
                "rtph265pay",
                "nvv4l2h265enc",
                "h265parse",
            ]

    def test_autodetect_decoder_pipeline(self):
        test_data = [
            # has omx* codec with hw accel
            (
                "H.264",
                "h264",
                [
                    "omxh264dec",
                    "omxh264enc",
                    "avenc_h264_omx",
                    "avdec_h264",
                    "nvv4l2h264enc",
                    "uvch264mjpgdemux",
                ],
                ["rtph264depay", "h264parse", "omxh264dec"],
            ),
            # has no hardware omx* codecs
            (
                "H.264",
                "h264",
                [
                    "avenc_h264_omx",
                    "avdec_h264",
                    "nvv4l2h264enc",
                    "uvch264mjpgdemux",
                ],
                ["rtph264depay", "h264parse", "avdec_h264"],
            ),
            # has no avenc_ codecs.
            (
                "H.264",
                "h264",
                [
                    "nvv4l2h264enc",
                    "uvch264mjpgdemux",
                ],
                None,
            ),
            # H.265 has omx* codec with hw accel
            (
                "H.265",
                "h265",
                [
                    "omxh265dec",
                    "omxh265enc",
                    "avdec_h265",
                    "nvv4l2h265enc",
                ],
                ["rtph265depay", "h265parse", "omxh265dec"],
            ),
            # H.265 has no omx* codecs
            (
                "H.265",
                "h265",
                [
                    "avdec_h265",
                    "nvv4l2h265enc",
                ],
                ["rtph265depay", "h265parse", "avdec_h265"],
            ),
            # H.265 has no omx* and avdec codecs
            (
                "H.265",
                "h265",
                [
                    "nvv4l2h265enc",
                ],
                None,
            ),
        ]
        for codec, codec_t, inspect, expected in test_data:
            with self.subTest(codec=codec):
                with mock.patch(
                    "frigate.gstreamer.gst_inspect_find_codec", return_value=inspect
                ) as mock_instpect:
                    pipeline = autodetect_decoder_pipeline(codec)
                    assert pipeline == expected
                    mock_instpect.assert_called_with(codec_t)


class TestGstreamerBuilder(TestCase):
    def setUp(self):
        self.builder = GstreamerBuilder("rtsp://", 320, 240, "cam_name")

    @mock.patch("frigate.gstreamer.autodetect_decoder_pipeline")
    def test_manual_decoder_and_cource(self, mock_autodetect_pipeline):
        builder = self.builder.with_decoder_pipeline(["a", "b", "c"], caps=None)
        builder = builder.with_source_format_pipeline(["d", "e", "f"])
        assert builder.build(use_detect=True, use_record=False) == [
            "gst-launch-1.0",
            "-q",
            "rtspsrc",
            'location="rtsp://"',
            "latency=0",
            "do-timestamp=true",
            "!",
            "a",
            "!",
            "b",
            "!",
            "c",
            "!",
            "d",
            "!",
            "e",
            "!",
            "f",
            "!",
            "video/x-raw,width=(int)320,height=(int)240,format=(string)I420",
            "!",
            "videoconvert",
            "!",
            "fdsink",
        ]
        mock_autodetect_pipeline.assert_not_called()

    @mock.patch("frigate.gstreamer.autodetect_decoder_pipeline")
    def test_autodetect_codecs_success(self, mock_pipeline):
        mock_pipeline.return_value = ["rtph264depay", "h264parse", "omxh264dec"]
        builder = self.builder.with_decoder_pipeline([], caps={"video codec": "H.264"})
        builder = builder.with_source_format_pipeline([])
        assert builder.build(use_detect=True, use_record=False) == [
            "gst-launch-1.0",
            "-q",
            "rtspsrc",
            'location="rtsp://"',
            "latency=0",
            "do-timestamp=true",
            "!",
            "rtph264depay",
            "!",
            "h264parse",
            "!",
            "omxh264dec",
            "!",
            "video/x-raw,format=(string)NV12",
            "!",
            "videoconvert",
            "!",
            "videoscale",
            "!",
            "video/x-raw,width=(int)320,height=(int)240,format=(string)I420",
            "!",
            "videoconvert",
            "!",
            "fdsink",
        ]
        assert builder.build(use_detect=True, use_record=True) == [
            "gst-launch-1.0",
            "-q",
            "rtspsrc",
            'location="rtsp://"',
            "latency=0",
            "do-timestamp=true",
            "!",
            "rtph264depay",
            "!",
            "h264parse",
            "!",
            "omxh264dec",
            "!",
            "video/x-raw,format=(string)NV12",
            "!",
            "videoconvert",
            "!",
            "videoscale",
            "!",
            "video/x-raw,width=(int)320,height=(int)240,format=(string)I420",
            "!",
            "videoconvert",
            "!",
            "tee",
            "name=t",
            "!",
            "fdsink",
            "t.",
            "!",
            "queue",
            "!",
            "omxh264enc",
            "!",
            "h264parse",
            "!",
            "splitmuxsink",
            "async-handling=true",
            "location=/tmp/cache/cam_name-gstsplitmuxchunk-%05d.mp4",
            "max-size-time=10000000000",
        ]
        assert builder.build(use_detect=False, use_record=True) == [
            "gst-launch-1.0",
            "-q",
            "rtspsrc",
            'location="rtsp://"',
            "latency=0",
            "do-timestamp=true",
            "!",
            "rtph264depay",
            "!",
            "h264parse",
            "!",
            "omxh264dec",
            "!",
            "videoconvert",
            "!",
            "videoscale",
            "!",
            "queue",
            "!",
            "omxh264enc",
            "!",
            "h264parse",
            "!",
            "splitmuxsink",
            "async-handling=true",
            "location=/tmp/cache/cam_name-gstsplitmuxchunk-%05d.mp4",
            "max-size-time=10000000000",
        ]

    @mock.patch("frigate.gstreamer.autodetect_decoder_pipeline")
    def test_autodetect_codecs_failure(self, mock_pipeline):
        mock_pipeline.return_value = None
        builder = self.builder.with_decoder_pipeline([], caps={"video codec": "H.264"})
        builder = builder.with_source_format_pipeline([])
        assert builder.build(use_detect=True, use_record=False) == [
            "gst-launch-1.0",
            "-q",
            "videotestsrc",
            "pattern=0",
            "!",
            "video/x-raw,width=(int)320,height=(int)240,format=(string)I420",
            "!",
            "fdsink",
        ]

    @mock.patch("frigate.gstreamer.autodetect_decoder_pipeline")
    def test_rtmp_source(self, mock_autodetect_pipeline):
        self.builder = GstreamerBuilder("rtmp://", 320, 240, "cam_name")
        builder = self.builder.with_decoder_pipeline(["a"], caps=None)
        builder = builder.with_source_format_pipeline(["d"])
        assert builder.build(use_detect=True, use_record=False) == [
            "gst-launch-1.0",
            "-q",
            "rtmpsrc",
            'location="rtmp://"',
            "!",
            "a",
            "!",
            "d",
            "!",
            "video/x-raw,width=(int)320,height=(int)240,format=(string)I420",
            "!",
            "videoconvert",
            "!",
            "fdsink",
        ]
        mock_autodetect_pipeline.assert_not_called()

    @mock.patch("frigate.gstreamer.autodetect_decoder_pipeline")
    def test_custom_source(self, mock_autodetect_pipeline):
        self.builder = GstreamerBuilder(
            "videotestsrc is-live=true pattern=snow", 320, 240, "cam_name"
        )
        builder = self.builder.with_decoder_pipeline(["a"], caps=None)
        builder = builder.with_source_format_pipeline(["d"])
        assert builder.build(use_detect=True, use_record=False) == [
            "gst-launch-1.0",
            "-q",
            "videotestsrc",
            "is-live=true",
            "pattern=snow",
            "!",
            "a",
            "!",
            "d",
            "!",
            "video/x-raw,width=(int)320,height=(int)240,format=(string)I420",
            "!",
            "videoconvert",
            "!",
            "fdsink",
        ]
        mock_autodetect_pipeline.assert_not_called()


if __name__ == "__main__":
    main(verbosity=2)
