import re
from functools import lru_cache
import os
import logging
import traceback
import subprocess as sp
from typing import Dict, List, Optional

from frigate.const import (
    CACHE_DIR,
    GSTREAMER_RECORD_SUFFIX,
    RECORD_SEGMENT_TIME_SECONDS,
)

VIDEO_CODEC_CAP_NAME = "video codec"

logger = logging.getLogger(__name__)


@lru_cache
def gst_discover(
    source: str, cam_name: str, keys: List[str]
) -> Optional[Dict[str, str]]:
    """
    run gst-discoverer-1.0 to discover source stream
    and extract keys, specified in the source arrat
    """
    try:
        data = sp.check_output(
            [
                "gst-discoverer-1.0",
                "-v",
                source,
            ],
            universal_newlines=True,
            start_new_session=True,
            stderr=None,
            timeout=15,
        )
        stripped = list(map(lambda s: s.strip().partition(":"), data.split("\n")))
        result = {}
        for key, _, value in stripped:
            for param in keys:
                if param == key.lower():
                    terms = value.strip().split(" ")
                    result[param] = terms[0].split(",")[0]
        return result
    except sp.TimeoutExpired:
        logger.error(
            (
                "gst-discoverer-1.0 timed out auto discovering camera %s. "
                "Try setting up `decoder_pipeline` according to your camera video codec."
            ),
            cam_name,
        )
        return {}
    except:
        logger.error(
            "gst-discoverer-1.0 failed with the message: %s", traceback.format_exc()
        )
        return {}


@lru_cache
def gst_inspect_find_codec(codec: Optional[str]) -> List[str]:
    """
    run gst-inspect-1.0 and find the codec.
    gst-inspect-1.0 return data in the following format:
    omx:  omxh265dec: OpenMAX H.265 Video Decoder
    rtp:  rtph265pay: RTP H265 payloader
    """
    try:
        data = sp.check_output(
            ["gst-inspect-1.0"],
            universal_newlines=True,
            start_new_session=True,
            stderr=None,
        )
        data = [
            line.split(":")
            for line in data.split("\n")
            if codec is None or codec in line
        ]
        return [item[1].strip() for item in data if len(item) > 1]
    except:
        logger.error(
            "gst-inspect-1.0 failed with the message: %s", traceback.format_exc()
        )
        return None


RTP_STREAM_NAME_KEY = "name="
RTP_STREAM_NAME = "rtp_stream"
DEPAYED_STREAM_NAME = "depayed_stream"


AUDIO_PIPELINES = {
    "audio/mpeg": ["rtpmp4gdepay", "aacparse"],
    "audio/x-alaw": ["rtppcmadepay", "alawdec", "audioconvert", "queue", "voaacenc"],
}


class GstreamerBaseBuilder:
    def __init__(self, width, height, name, format="I420") -> None:
        self.width = width
        self.height = height
        self.name = name
        self.format = format
        self.input_pipeline = None
        self.video_format = None
        self.record_pipeline = None
        self.audio_pipeline = None
        self.raw_pipeline = None

    def with_raw_pipeline(self, raw_pipeline: List[str]):
        """
        Set the raw pipeline
        """
        self.raw_pipeline = raw_pipeline
        return self

    def with_source(self, uri: str, options: List[str]):
        """
        Set RTMP or RTSP data source with the list of options
        """
        is_rtsp = re.match(r"rtsps?:\/\/", uri)
        is_rtmp = re.match(r"rtm(p|pt|ps|pe|fp|pte|pts)?:\/\/", uri)
        if is_rtsp:
            self.input_pipeline = f'rtspsrc location="{uri}"'
        elif is_rtmp:
            self.input_pipeline = f'rtmpsrc location="{uri}"'
        else:
            logger.warning(
                "An input url does not start with rtsp:// or rtmp:// for camera %s. Assuming a full input pipeline supplied.",
                self.name,
            )
            self.input_pipeline = self._to_array(uri)
            return self

        has_options = options is not None and len(options) > 0
        extra_options = None

        if has_options:
            extra_options = " ".join(options)
            if RTP_STREAM_NAME_KEY not in extra_options:
                extra_options = (
                    f"{RTP_STREAM_NAME_KEY}{RTP_STREAM_NAME} {extra_options}"
                )
        else:
            extra_options = f"{RTP_STREAM_NAME_KEY}{RTP_STREAM_NAME}"
            if is_rtsp:
                extra_options = extra_options + " latency=0 do-timestamp=true"

        self.input_pipeline = self._to_array(f"{self.input_pipeline} {extra_options}")
        return self

    def with_video_format(self, format: str):
        """
        set encoding format. Encoding format should be one of:
        h265, h264, h236, h261 or be like `video/x-h265`
        """
        if not format:
            return self
        format = format.lower().replace("video/x-", "")
        self.video_format = format
        return self

    def with_audio_format(self, format):
        """
        set the audio format and make the audio_pipeline
        """
        if not format:
            return self

        if format in AUDIO_PIPELINES:
            self.audio_pipeline = AUDIO_PIPELINES.get(format)
        else:
            logger.warning("No pipeline set for the '%s' audio format.", format)
        return self

    def with_record_pipeline(self, pipeline):
        """
        set record pipeline. by default record_pipeline is empty. The splitmuxsink will get the
        depayed camera stream and mux it using mp4mux into the file. That way no re-encoding will be performed.
        If your camera has a different endcoding format which is not supported by the browser player,
        add the record_pipeline to decode and endode the video stream
        """
        if pipeline:
            self.record_pipeline = pipeline
        return self

    def with_audio_pipeline(self, pipeline):
        """
        set set the optional audio pipeline to mux audio into the recording.
        """
        self.audio_pipeline = pipeline
        return self

    @staticmethod
    def accept(plugins: List[str]) -> bool:
        """
        Accept method receives a list of plugins and return true if the builder can hande the current list
        Builder should check all necessary pluguns before returning True
        """
        return True

    def _to_array(self, input):
        return list(map((lambda el: el.strip()), input.split("!")))

    def _build_gst_pipeline(
        self, pipeline: List[str], use_detect=True, use_record=False
    ):
        fd_sink = (
            [f"fdsink {DEPAYED_STREAM_NAME}."]
            if use_record and use_detect
            else (["fdsink"] if use_detect else [])
        )

        record_pipeline = (
            [f"{self.video_format}parse"]
            if self.record_pipeline is None
            else self.record_pipeline
        )

        use_audio_pipeline = use_record and (
            self.audio_pipeline is not None and len(self.audio_pipeline) > 0
        )

        split_mux = f"splitmuxsink async-finalize=true send-keyframe-requests=true max-size-bytes=0 "

        if use_audio_pipeline:
            split_mux = split_mux + "name=mux muxer=mp4mux "
        split_mux = split_mux + (
            f"location={os.path.join(CACHE_DIR, self.name)}{GSTREAMER_RECORD_SUFFIX}-%05d.mp4 "
            f"max-size-time={RECORD_SEGMENT_TIME_SECONDS*1000000000}"
        )

        audio_pipeline = []
        if use_audio_pipeline:
            # add the RTP stream after the splitmuxsink
            split_mux = f"{split_mux} {RTP_STREAM_NAME}."
            # add a queue after the rtp_stream. and mux.audio_0 as a receiver
            audio_pipeline = ["queue", *self.audio_pipeline, "mux.audio_0"]

        record_mux = (
            [
                "queue",
                *record_pipeline,
                split_mux,
                *audio_pipeline,
            ]
            if use_record
            else []
        )

        full_pipeline = [*pipeline, *fd_sink, *record_mux]
        return full_pipeline

    def _get_default_pipeline(self):
        """
        Get a pipeline to render a video test stream
        """
        pipeline = [
            "videotestsrc pattern=19",
            f"video/x-raw,width=(int){self.width},height=(int){self.height},format=(string){self.format},framerate=20/1",
            "videorate drop-only=true",
            "video/x-raw,framerate=1/10",
        ]
        return pipeline

    def get_detect_decoder_pipeline(self) -> List[str]:
        return []

    def _build(self, use_detect: bool, use_record: bool) -> List[str]:
        """
        Build a pipeline based on the provided parameters
        """
        if self.video_format is None or len(self.video_format) == 0:
            return self._build_gst_pipeline(
                self._get_default_pipeline(), use_detect=True, use_record=False
            )
        depay_element = f"rtp{self.video_format}depay"

        # add rtpjitterbuffer into the input pipeline for reord role if no rtpjitterbuffer has been added already
        if use_record:
            has_rtpjitterbuffer = "rtpjitterbuffer" in " ".join(self.input_pipeline)
            if not has_rtpjitterbuffer:
                self.input_pipeline.append(
                    "rtpjitterbuffer do-lost=true drop-on-latency=true"
                )

        pipeline = [*self.input_pipeline, depay_element]
        # if both detect and record used, split the stream after the depay element
        # to avoid encoding for recording
        if use_detect and use_record:
            pipeline = [*pipeline, f"tee name={DEPAYED_STREAM_NAME}", "queue"]

        if use_detect:
            # decendants should override get_detect_decoder_pipeline to provide correct decoder element
            detect_decoder_pipeline = self.get_detect_decoder_pipeline()
            if detect_decoder_pipeline is None or len(detect_decoder_pipeline) == 0:
                return self._build_gst_pipeline(
                    self._get_default_pipeline(), use_detect=True, use_record=False
                )
            pipeline.extend(detect_decoder_pipeline)

        return self._build_gst_pipeline(
            pipeline, use_detect=use_detect, use_record=use_record
        )

    def build(self, use_detect: bool, use_record: bool) -> List[str]:
        if self.raw_pipeline is None or len(self.raw_pipeline) == 0:
            full_pipeline = self._build(use_detect, use_record)
        else:
            full_pipeline = self.raw_pipeline

        pipeline_args = [
            f"{item} !".split(" ") for item in full_pipeline if len(item) > 0
        ]
        pipeline_args = [item for sublist in pipeline_args for item in sublist]
        return ["gst-launch-1.0", "-q", *pipeline_args][:-1]


class GstreamerNvidia(GstreamerBaseBuilder):
    def __init__(self, width, height, name, format="I420") -> None:
        super().__init__(width, height, name, format)

    @staticmethod
    def accept(plugins: List[str]) -> bool:
        """
        Accept method receives a list of plugins and return true if the builder can hande the current list
        Builder should check all necessary pluguns before returning True
        """
        required_plugins = ["nvv4l2decoder", "nvvidconv"]
        for plugin in required_plugins:
            if plugin not in plugins:
                return False
        return True

    def get_detect_decoder_pipeline(self) -> List[str]:
        return [
            "nvv4l2decoder enable-max-performance=true",
            "video/x-raw(memory:NVMM),format=NV12",
            "nvvidconv",
            f"video/x-raw,width=(int){self.width},height=(int){self.height},format=(string){self.format}",
        ]


# A list of available builders. Please put on top more specific builders and keep the GstreamerBaseBuilder as a last builder
GSTREAMER_BUILDERS = [GstreamerNvidia, GstreamerBaseBuilder]


def get_gstreamer_builder(width, height, name, format="I420") -> GstreamerBaseBuilder:
    available_plugins = gst_inspect_find_codec(codec=None)
    for builder in GSTREAMER_BUILDERS:
        if builder.accept(available_plugins):
            return builder(width, height, name, format)
    return
