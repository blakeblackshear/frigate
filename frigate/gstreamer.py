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


def gst_discover(source: str, keys: List[str]) -> Optional[Dict[str, str]]:
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
        )
        stripped = list(map(lambda s: s.strip().partition(":"), data.split("\n")))
        result = {}
        for key, _, value in stripped:
            for param in keys:
                if param in key.lower():
                    terms = value.strip().split(" ")
                    result[param] = terms[0]
        return result
    except:
        logger.error(
            "gst-discoverer-1.0 failed with the message: %s", traceback.format_exc()
        )
        return None


def gst_inspect_find_codec(codec: str) -> List[str]:
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
        return [
            line.split(":")[1].strip() for line in data.split("\n") if codec in line
        ]
    except:
        logger.error(
            "gst-inspect-1.0 failed with the message: %s", traceback.format_exc()
        )
        return None


def autodetect_decoder_pipeline(
    codec: Optional[str],
) -> List[str]:
    """
    This method attempt to autodetect gstreamer decoder pipeline based
    on the codec name.
    """

    if codec is None or not codec:
        logger.warn(
            "gsreamer was not able to detect video coded. Please supply `decoder_pipeline` parameter."
        )
        return None
    # convert H.265 to h265
    codec = codec.lower().replace(".", "")
    logger.debug("detecting gstreamer decoder pipeline for the %s format", codec)
    # run gst_inspect and get available codecs
    codecs = gst_inspect_find_codec(codec)
    logger.debug("available codecs are: %s", codecs)

    if codecs is None or len(codecs) == 0:
        logger.warn(
            "gsreamer was not able to find the codec for the %s format",
            codec,
        )
        return None

    gstreamer_plugins = CODECS.get(codec, [f"omx{codec}dec", f"avdec_{codec}"])
    decode_element = None
    for plugin in gstreamer_plugins:
        if plugin in codecs:
            decode_element = plugin
            break

    if decode_element is None:
        logger.warn(
            "gsreamer was not able to find decoder for the %s format",
            codec,
        )
        return None

    return [
        f"rtp{codec}depay",
        f"{codec}parse",
        decode_element,
    ]


# An associative array of gstreamer codecs autodetect should try
CODECS = {
    "h264": ["omxh264dec", "avdec_h264"],
    "h265": ["omxh265dec", "avdec_h265"],
}


class GstreamerBuilder:
    def __init__(self, uri, width, height, name, format="I420"):
        self.width = width
        self.height = height
        self.name = name
        self.video_format = f"video/x-raw,width=(int){width},height=(int){height},format=(string){format}"

        is_rtsp = "rtsp://" in uri
        is_rtmp = "rtmp://" in uri
        if is_rtsp:
            self.input_pipeline = [f'rtspsrc location="{uri}" latency=0 do-timestamp=true']
        elif is_rtmp:
            self.input_pipeline = [f'rtmpsrc location="{uri}"']
        else:
            logger.warn(
                "An input url does not start with rtsp:// or rtmp:// for camera %s. Assuming full input pipeline supplied.",
                name,
            )
            self.input_pipeline = [uri]

        self.destination_format_pipeline = [self.video_format, "videoconvert"]
        self.decoder_pipeline = None

    def build_with_test_source(self):
        pipeline = [
            "videotestsrc pattern=0",
            self.video_format,
        ]
        return self._build_launch_command(pipeline)

    def with_decoder_pipeline(self, decoder_pipeline, caps):
        if decoder_pipeline is not None and len(decoder_pipeline) > 0:
            self.decoder_pipeline = decoder_pipeline
            return self

        if caps is None or len(caps) == 0 or VIDEO_CODEC_CAP_NAME not in caps:
            logger.warn("gsreamer was not able to detect the input stream format")
            self.decoder_pipeline = None
            return self
        codec = caps.get(VIDEO_CODEC_CAP_NAME)
        self.decoder_pipeline = autodetect_decoder_pipeline(codec)
        return self

    def with_source_format_pipeline(self, source_format_pipeline):
        source_format_pipeline = (
            source_format_pipeline
            if source_format_pipeline
            else ["video/x-raw,format=(string)NV12", "videoconvert", "videoscale"]
        )
        self.source_format_pipeline = source_format_pipeline
        return self

    def build(self, use_detect, use_record) -> List[str]:
        if self.decoder_pipeline is None:
            logger.warn("gsreamer was not able to auto detect the decoder pipeline.")
            return self.build_with_test_source()

        # remove unnecessary video conversion for the record-only input
        src_dst_format_pipeline = (
            ["videoconvert", "videoscale"]
            if use_record and not use_detect
            else [*self.source_format_pipeline, *self.destination_format_pipeline]
        )
        pipeline = [
            *self.input_pipeline,
            *self.decoder_pipeline,
            *src_dst_format_pipeline,
        ]
        return self._build_launch_command(pipeline, use_detect, use_record)

    def _build_launch_command(self, pipeline, use_detect=True, use_record=False):
        fd_sink = (
            ["tee name=t", "fdsink t."]
            if use_record and use_detect
            else (["fdsink"] if use_detect else [])
        )

        record_mux = (
            [
                "queue",
                "omxh264enc",
                "h264parse",
                f"splitmuxsink async-handling=true location={os.path.join(CACHE_DIR, self.name)}{GSTREAMER_RECORD_SUFFIX}-%05d.mp4 max-size-time={RECORD_SEGMENT_TIME_SECONDS*1000000000}",
            ]
            if use_record
            else []
        )

        full_pipeline = [*pipeline, *fd_sink, *record_mux]
        pipeline_args = [
            f"{item} !".split(" ") for item in full_pipeline if len(item) > 0
        ]
        pipeline_args = [item for sublist in pipeline_args for item in sublist]
        return ["gst-launch-1.0", "-q", *pipeline_args][:-1]
