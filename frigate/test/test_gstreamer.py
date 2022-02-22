from unittest import TestCase, main, mock
from typing import List
from frigate.gstreamer import (
    gst_discover,
    gst_inspect_find_codec,
    GstreamerBaseBuilder,
    get_gstreamer_builder,
)


class TestGstTools(TestCase):
    def test_gst_discover(self):
        response = r"""
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
                audio: audio/x-alaw, channels=(int)1, rate=(int)8000
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
            result = gst_discover(
                "path to stream",
                "cam1",
                tuple(["width", "height", "video", "audio", "notinthelist"]),
            )
            assert result == {
                "height": "480",
                "video": "video/x-h265",
                "width": "960",
                "audio": "audio/x-alaw",
            }
            mock_checkout.assert_called_once_with(
                ["gst-discoverer-1.0", "-v", "path to stream"],
                universal_newlines=True,
                start_new_session=True,
                stderr=None,
                timeout=15,
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


class TestGstreamerBaseBuilder(TestCase):
    def setUp(self):
        self.builder = GstreamerBaseBuilder(320, 240, "cam_name")

    def test_accept(self):
        assert (
            GstreamerBaseBuilder.accept([]) == True
        ), "GstreamerBaseBuilder should accept any plugin list"

    def test_build(self):
        assert self.builder.build(use_detect=True, use_record=False) == [
            "gst-launch-1.0",
            "-q",
            "videotestsrc",
            "pattern=19",
            "!",
            "video/x-raw,width=(int)320,height=(int)240,format=(string)I420,framerate=20/1",
            "!",
            "videorate",
            "drop-only=true",
            "!",
            "video/x-raw,framerate=1/10",
            "!",
            "fdsink",
        ]

    def test_with_source(self):
        test_data = [
            (
                "rtsp://some/path1",
                None,
                [
                    'rtspsrc location="rtsp://some/path1" name=rtp_stream latency=0 do-timestamp=true'
                ],
            ),
            (
                "rtsps://some/path1",
                None,
                [
                    'rtspsrc location="rtsps://some/path1" name=rtp_stream latency=0 do-timestamp=true'
                ],
            ),
            (
                "rtsp://some/path2",
                [],
                [
                    'rtspsrc location="rtsp://some/path2" name=rtp_stream latency=0 do-timestamp=true'
                ],
            ),
            (
                "rtsp://some/path3",
                ["do-timestamp=true"],
                [
                    'rtspsrc location="rtsp://some/path3" name=rtp_stream do-timestamp=true'
                ],
            ),
            (
                "rtsp://some/path4",
                ["do-timestamp=true", "! rtpjitterbuffer do-lost=true"],
                [
                    'rtspsrc location="rtsp://some/path4" name=rtp_stream do-timestamp=true',
                    "rtpjitterbuffer do-lost=true",
                ],
            ),
            (
                "rtsp://some/path4",
                ["do-timestamp=true", "!", "rtpjitterbuffer", "do-lost=true"],
                [
                    'rtspsrc location="rtsp://some/path4" name=rtp_stream do-timestamp=true',
                    "rtpjitterbuffer do-lost=true",
                ],
            ),
            (
                "rtmp://some/path",
                None,
                ['rtmpsrc location="rtmp://some/path" name=rtp_stream'],
            ),
            (
                "rtmpt://some/path",
                None,
                ['rtmpsrc location="rtmpt://some/path" name=rtp_stream'],
            ),
            (
                "rtmps://some/path",
                None,
                ['rtmpsrc location="rtmps://some/path" name=rtp_stream'],
            ),
            (
                "rtmpe://some/path",
                None,
                ['rtmpsrc location="rtmpe://some/path" name=rtp_stream'],
            ),
            (
                "rtmfp://some/path",
                None,
                ['rtmpsrc location="rtmfp://some/path" name=rtp_stream'],
            ),
            (
                "myawesomesource key1=value1 ! myawesomeplugin key2=value2 option",
                None,
                ["myawesomesource key1=value1", "myawesomeplugin key2=value2 option"],
            ),
        ]
        for url, options, expected in test_data:
            with self.subTest(url=url, options=options):
                assert self.builder.with_source(url, options).input_pipeline == expected


class TestGstreamerBuilderFactory(TestCase):
    def build_detect_pipeline(self, builder: GstreamerBaseBuilder) -> List[str]:
        return builder.with_source(
            "rtsp://some/url", ["protocols=tcp", "latency=0", "do-timestamp=true"]
        ).build(use_detect=True, use_record=False)

    @mock.patch("frigate.gstreamer.gst_inspect_find_codec", return_value=[])
    def test_find_codec_nothing(self, mock_find_codec):
        """
        Since gst_inspect_find_codec return no plugins available, gstreamer_builder_factory should return
        base GstreamerBaseBuilder, which creates a `videotestsrc` pipeline
        """
        builder = get_gstreamer_builder(320, 240, "cam_name")
        mock_find_codec.assert_called_with(codec=None)
        assert self.build_detect_pipeline(builder) == [
            "gst-launch-1.0",
            "-q",
            "videotestsrc",
            "pattern=19",
            "!",
            "video/x-raw,width=(int)320,height=(int)240,format=(string)I420,framerate=20/1",
            "!",
            "videorate",
            "drop-only=true",
            "!",
            "video/x-raw,framerate=1/10",
            "!",
            "fdsink",
        ]


class TestGstreamerNvidia(TestCase):
    def build_detect_pipeline(self, builder: GstreamerBaseBuilder) -> List[str]:
        return builder.with_source(
            "rtsp://some/url", ["protocols=tcp", "latency=0", "do-timestamp=true"]
        ).with_video_format("h264")

    @mock.patch(
        "frigate.gstreamer.gst_inspect_find_codec",
        return_value=["nvv4l2decoder", "nvvidconv"],
    )
    def test_detect(self, mock_find_codec):
        builder = get_gstreamer_builder(320, 240, "cam_name")
        mock_find_codec.assert_called_with(codec=None)
        assert self.build_detect_pipeline(builder).build(
            use_detect=True, use_record=False
        ) == [
            "gst-launch-1.0",
            "-q",
            "rtspsrc",
            'location="rtsp://some/url"',
            "name=rtp_stream",
            "protocols=tcp",
            "latency=0",
            "do-timestamp=true",
            "!",
            "rtph264depay",
            "!",
            "nvv4l2decoder",
            "enable-max-performance=true",
            "!",
            "video/x-raw(memory:NVMM),format=NV12",
            "!",
            "nvvidconv",
            "!",
            "video/x-raw,width=(int)320,height=(int)240,format=(string)I420",
            "!",
            "fdsink",
        ]

    @mock.patch(
        "frigate.gstreamer.gst_inspect_find_codec",
        return_value=["nvv4l2decoder", "nvvidconv"],
    )
    def test_detect_record(self, mock_find_codec):
        builder = get_gstreamer_builder(320, 240, "cam_name")
        mock_find_codec.assert_called_with(codec=None)
        assert self.build_detect_pipeline(builder).build(
            use_detect=True, use_record=True
        ) == [
            "gst-launch-1.0",
            "-q",
            "rtspsrc",
            'location="rtsp://some/url"',
            "name=rtp_stream",
            "protocols=tcp",
            "latency=0",
            "do-timestamp=true",
            "!",
            "rtpjitterbuffer",
            "do-lost=true",
            "drop-on-latency=true",            
            "!",
            "rtph264depay",
            "!",
            "tee",
            "name=depayed_stream",
            "!",
            "queue",
            "!",
            "nvv4l2decoder",
            "enable-max-performance=true",
            "!",
            "video/x-raw(memory:NVMM),format=NV12",
            "!",
            "nvvidconv",
            "!",
            "video/x-raw,width=(int)320,height=(int)240,format=(string)I420",
            "!",
            "fdsink",
            "depayed_stream.",
            "!",
            "queue",
            "!",
            "h264parse",
            "!",
            "splitmuxsink",
            "async-finalize=true",
            "send-keyframe-requests=true",
            "max-size-bytes=0",
            "location=/tmp/cache/cam_name-gstsplitmuxchunk-%05d.mp4",
            "max-size-time=10000000000",
        ]

    @mock.patch(
        "frigate.gstreamer.gst_inspect_find_codec",
        return_value=["nvv4l2decoder", "nvvidconv"],
    )
    def test_record_only(self, mock_find_codec):
        builder = get_gstreamer_builder(320, 240, "cam_name")
        mock_find_codec.assert_called_with(codec=None)
        assert self.build_detect_pipeline(builder).build(
            use_detect=False, use_record=True
        ) == [
            "gst-launch-1.0",
            "-q",
            "rtspsrc",
            'location="rtsp://some/url"',
            "name=rtp_stream",
            "protocols=tcp",
            "latency=0",
            "do-timestamp=true",
            "!",
            "rtpjitterbuffer",
            "do-lost=true",
            "drop-on-latency=true",
            "!",
            "rtph264depay",
            "!",
            "queue",
            "!",
            "h264parse",
            "!",
            "splitmuxsink",
            "async-finalize=true",
            "send-keyframe-requests=true",
            "max-size-bytes=0",
            "location=/tmp/cache/cam_name-gstsplitmuxchunk-%05d.mp4",
            "max-size-time=10000000000",
        ]

    @mock.patch(
        "frigate.gstreamer.gst_inspect_find_codec",
        return_value=["nvv4l2decoder", "nvvidconv"],
    )
    def test_detect_record_audio(self, mock_find_codec):
        builder = get_gstreamer_builder(320, 240, "cam_name")
        mock_find_codec.assert_called_with(codec=None)
        assert self.build_detect_pipeline(builder).with_video_format(
            "video/x-h265"
        ).with_audio_pipeline(
            ["rtppcmadepay", "alawdec", "audioconvert", "queue", "avenc_aac"]
        ).build(
            use_detect=True, use_record=True
        ) == [
            "gst-launch-1.0",
            "-q",
            "rtspsrc",
            'location="rtsp://some/url"',
            "name=rtp_stream",
            "protocols=tcp",
            "latency=0",
            "do-timestamp=true",
            "!",
            "rtpjitterbuffer",
            "do-lost=true",
            "drop-on-latency=true",            
            "!",
            "rtph265depay",
            "!",
            "tee",
            "name=depayed_stream",
            "!",
            "queue",
            "!",
            "nvv4l2decoder",
            "enable-max-performance=true",
            "!",
            "video/x-raw(memory:NVMM),format=NV12",
            "!",
            "nvvidconv",
            "!",
            "video/x-raw,width=(int)320,height=(int)240,format=(string)I420",
            "!",
            "fdsink",
            "depayed_stream.",
            "!",
            "queue",
            "!",
            "h265parse",
            "!",
            "splitmuxsink",
            "async-finalize=true",
            "send-keyframe-requests=true",
            "max-size-bytes=0",
            "name=mux",
            "muxer=mp4mux",
            "location=/tmp/cache/cam_name-gstsplitmuxchunk-%05d.mp4",
            "max-size-time=10000000000",
            "rtp_stream.",
            "!",
            "queue",
            "!",
            "rtppcmadepay",
            "!",
            "alawdec",
            "!",
            "audioconvert",
            "!",
            "queue",
            "!",
            "avenc_aac",
            "!",
            "mux.audio_0",
        ]

    @mock.patch(
        "frigate.gstreamer.gst_inspect_find_codec",
        return_value=["nvv4l2decoder", "nvvidconv"],
    )
    def test_detect_record_audio_by_format(self, mock_find_codec):
        builder = get_gstreamer_builder(320, 240, "cam_name")
        mock_find_codec.assert_called_with(codec=None)
        assert self.build_detect_pipeline(builder).with_audio_format(
            "audio/mpeg"
        ).build(use_detect=False, use_record=True) == [
            "gst-launch-1.0",
            "-q",
            "rtspsrc",
            'location="rtsp://some/url"',
            "name=rtp_stream",
            "protocols=tcp",
            "latency=0",
            "do-timestamp=true",
            "!",
            "rtpjitterbuffer",
            "do-lost=true",
            "drop-on-latency=true",            
            "!",
            "rtph264depay",
            "!",
            "queue",
            "!",
            "h264parse",
            "!",
            "splitmuxsink",
            "async-finalize=true",
            "send-keyframe-requests=true",
            "max-size-bytes=0",
            "name=mux",
            "muxer=mp4mux",
            "location=/tmp/cache/cam_name-gstsplitmuxchunk-%05d.mp4",
            "max-size-time=10000000000",
            "rtp_stream.",
            "!",
            "queue",
            "!",
            "rtpmp4gdepay",
            "!",
            "aacparse",
            "!",
            "mux.audio_0",
        ]

    @mock.patch(
        "frigate.gstreamer.gst_inspect_find_codec",
        return_value=[],
    )
    def test_raw_pipeline(self, mock_find_codec):
        builder = get_gstreamer_builder(320, 240, "cam_name")
        mock_find_codec.assert_called_with(codec=None)
        assert builder.with_raw_pipeline(["videotestsrc", "autovideosink"]).build(
            use_detect=True, use_record=True
        ) == ["gst-launch-1.0", "-q", "videotestsrc", "!", "autovideosink"]


if __name__ == "__main__":
    main(verbosity=2)
