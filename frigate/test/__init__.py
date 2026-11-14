from frigate.config.config import stream_info_retriever


def _unreachable_stream_info(ffmpeg, path: str) -> dict:
    return {"width": 0, "height": 0, "fourcc": None}


# Validating a camera without detect dimensions probes its stream. Test streams
# are unreachable, so return the failed probe result instead of waiting ~12s per
# stream for ffprobe to time out
stream_info_retriever.get_stream_info = _unreachable_stream_info
