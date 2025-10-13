"""Camera apis."""

import json
import logging

import requests
from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse

from frigate.api.auth import require_role
from frigate.api.defs.tags import Tags
from frigate.config.config import FrigateConfig
from frigate.util.builtin import clean_camera_user_pass
from frigate.util.image import run_ffmpeg_snapshot
from frigate.util.services import ffprobe_stream

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.camera])


@router.get("/go2rtc/streams")
def go2rtc_streams():
    r = requests.get("http://127.0.0.1:1984/api/streams")
    if not r.ok:
        logger.error("Failed to fetch streams from go2rtc")
        return JSONResponse(
            content=({"success": False, "message": "Error fetching stream data"}),
            status_code=500,
        )
    stream_data = r.json()
    for data in stream_data.values():
        for producer in data.get("producers") or []:
            producer["url"] = clean_camera_user_pass(producer.get("url", ""))
    return JSONResponse(content=stream_data)


@router.get("/go2rtc/streams/{camera_name}")
def go2rtc_camera_stream(request: Request, camera_name: str):
    r = requests.get(
        f"http://127.0.0.1:1984/api/streams?src={camera_name}&video=all&audio=all&microphone"
    )
    if not r.ok:
        camera_config = request.app.frigate_config.cameras.get(camera_name)

        if camera_config and camera_config.enabled:
            logger.error("Failed to fetch streams from go2rtc")

        return JSONResponse(
            content=({"success": False, "message": "Error fetching stream data"}),
            status_code=500,
        )
    stream_data = r.json()
    for producer in stream_data.get("producers", []):
        producer["url"] = clean_camera_user_pass(producer.get("url", ""))
    return JSONResponse(content=stream_data)


@router.put(
    "/go2rtc/streams/{stream_name}", dependencies=[Depends(require_role(["admin"]))]
)
def go2rtc_add_stream(request: Request, stream_name: str, src: str = ""):
    """Add or update a go2rtc stream configuration."""
    try:
        params = {"name": stream_name}
        if src:
            params["src"] = src

        r = requests.put(
            "http://127.0.0.1:1984/api/streams",
            params=params,
            timeout=10,
        )
        if not r.ok:
            logger.error(f"Failed to add go2rtc stream {stream_name}: {r.text}")
            return JSONResponse(
                content=(
                    {"success": False, "message": f"Failed to add stream: {r.text}"}
                ),
                status_code=r.status_code,
            )
        return JSONResponse(
            content={"success": True, "message": "Stream added successfully"}
        )
    except requests.RequestException as e:
        logger.error(f"Error communicating with go2rtc: {e}")
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": "Error communicating with go2rtc",
                }
            ),
            status_code=500,
        )


@router.delete(
    "/go2rtc/streams/{stream_name}", dependencies=[Depends(require_role(["admin"]))]
)
def go2rtc_delete_stream(stream_name: str):
    """Delete a go2rtc stream."""
    try:
        r = requests.delete(
            "http://127.0.0.1:1984/api/streams",
            params={"src": stream_name},
            timeout=10,
        )
        if not r.ok:
            logger.error(f"Failed to delete go2rtc stream {stream_name}: {r.text}")
            return JSONResponse(
                content=(
                    {"success": False, "message": f"Failed to delete stream: {r.text}"}
                ),
                status_code=r.status_code,
            )
        return JSONResponse(
            content={"success": True, "message": "Stream deleted successfully"}
        )
    except requests.RequestException as e:
        logger.error(f"Error communicating with go2rtc: {e}")
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": "Error communicating with go2rtc",
                }
            ),
            status_code=500,
        )


@router.get("/ffprobe")
def ffprobe(request: Request, paths: str = "", detailed: bool = False):
    path_param = paths

    if not path_param:
        return JSONResponse(
            content=({"success": False, "message": "Path needs to be provided."}),
            status_code=404,
        )

    if path_param.startswith("camera"):
        camera = path_param[7:]

        if camera not in request.app.frigate_config.cameras.keys():
            return JSONResponse(
                content=(
                    {"success": False, "message": f"{camera} is not a valid camera."}
                ),
                status_code=404,
            )

        if not request.app.frigate_config.cameras[camera].enabled:
            return JSONResponse(
                content=({"success": False, "message": f"{camera} is not enabled."}),
                status_code=404,
            )

        paths = map(
            lambda input: input.path,
            request.app.frigate_config.cameras[camera].ffmpeg.inputs,
        )
    elif "," in clean_camera_user_pass(path_param):
        paths = path_param.split(",")
    else:
        paths = [path_param]

    # user has multiple streams
    output = []

    for path in paths:
        ffprobe = ffprobe_stream(
            request.app.frigate_config.ffmpeg, path.strip(), detailed=detailed
        )

        result = {
            "return_code": ffprobe.returncode,
            "stderr": (
                ffprobe.stderr.decode("unicode_escape").strip()
                if ffprobe.returncode != 0
                else ""
            ),
            "stdout": (
                json.loads(ffprobe.stdout.decode("unicode_escape").strip())
                if ffprobe.returncode == 0
                else ""
            ),
        }

        # Add detailed metadata if requested and probe was successful
        if detailed and ffprobe.returncode == 0 and result["stdout"]:
            try:
                probe_data = result["stdout"]
                metadata = {}

                # Extract video stream information
                video_stream = None
                audio_stream = None

                for stream in probe_data.get("streams", []):
                    if stream.get("codec_type") == "video":
                        video_stream = stream
                    elif stream.get("codec_type") == "audio":
                        audio_stream = stream

                # Video metadata
                if video_stream:
                    metadata["video"] = {
                        "codec": video_stream.get("codec_name"),
                        "width": video_stream.get("width"),
                        "height": video_stream.get("height"),
                        "fps": _extract_fps(video_stream.get("r_frame_rate")),
                        "pixel_format": video_stream.get("pix_fmt"),
                        "profile": video_stream.get("profile"),
                        "level": video_stream.get("level"),
                    }

                    # Calculate resolution string
                    if video_stream.get("width") and video_stream.get("height"):
                        metadata["video"]["resolution"] = (
                            f"{video_stream['width']}x{video_stream['height']}"
                        )

                # Audio metadata
                if audio_stream:
                    metadata["audio"] = {
                        "codec": audio_stream.get("codec_name"),
                        "channels": audio_stream.get("channels"),
                        "sample_rate": audio_stream.get("sample_rate"),
                        "channel_layout": audio_stream.get("channel_layout"),
                    }

                # Container/format metadata
                if probe_data.get("format"):
                    format_info = probe_data["format"]
                    metadata["container"] = {
                        "format": format_info.get("format_name"),
                        "duration": format_info.get("duration"),
                        "size": format_info.get("size"),
                    }

                result["metadata"] = metadata

            except Exception as e:
                logger.warning(f"Failed to extract detailed metadata: {e}")
                # Continue without metadata if parsing fails

        output.append(result)

    return JSONResponse(content=output)


@router.get("/ffprobe/snapshot", dependencies=[Depends(require_role(["admin"]))])
def ffprobe_snapshot(request: Request, url: str = "", timeout: int = 10):
    """Get a snapshot from a stream URL using ffmpeg."""
    if not url:
        return JSONResponse(
            content={"success": False, "message": "URL parameter is required"},
            status_code=400,
        )

    config: FrigateConfig = request.app.frigate_config

    image_data, error = run_ffmpeg_snapshot(
        config.ffmpeg, url, "mjpeg", timeout=timeout
    )

    if image_data:
        return Response(
            image_data,
            media_type="image/jpeg",
            headers={"Cache-Control": "no-store"},
        )
    elif error == "timeout":
        return JSONResponse(
            content={"success": False, "message": "Timeout capturing snapshot"},
            status_code=408,
        )
    else:
        logger.error(f"ffmpeg failed: {error}")
        return JSONResponse(
            content={"success": False, "message": "Failed to capture snapshot"},
            status_code=500,
        )


@router.get("/reolink/detect", dependencies=[Depends(require_role(["admin"]))])
def reolink_detect(host: str = "", username: str = "", password: str = ""):
    """
    Detect Reolink camera capabilities and recommend optimal protocol.

    Queries the Reolink camera API to determine the camera's resolution
    and recommends either http-flv (for 5MP and below) or rtsp (for higher resolutions).
    """
    if not host:
        return JSONResponse(
            content={"success": False, "message": "Host parameter is required"},
            status_code=400,
        )

    if not username:
        return JSONResponse(
            content={"success": False, "message": "Username parameter is required"},
            status_code=400,
        )

    if not password:
        return JSONResponse(
            content={"success": False, "message": "Password parameter is required"},
            status_code=400,
        )

    try:
        api_url = (
            f"http://{host}/api.cgi?cmd=GetEnc&user={username}&password={password}"
        )

        response = requests.get(api_url, timeout=5)

        if not response.ok:
            return JSONResponse(
                content={
                    "success": False,
                    "protocol": None,
                    "message": f"Failed to connect to camera API: HTTP {response.status_code}",
                },
                status_code=200,
            )

        data = response.json()
        enc_data = data[0] if isinstance(data, list) and len(data) > 0 else data

        stream_info = None
        if isinstance(enc_data, dict):
            if enc_data.get("value", {}).get("Enc"):
                stream_info = enc_data["value"]["Enc"]
            elif enc_data.get("Enc"):
                stream_info = enc_data["Enc"]

        if not stream_info or not stream_info.get("mainStream"):
            return JSONResponse(
                content={
                    "success": False,
                    "protocol": None,
                    "message": "Could not find stream information in API response",
                }
            )

        main_stream = stream_info["mainStream"]
        width = main_stream.get("width", 0)
        height = main_stream.get("height", 0)

        if not width or not height:
            return JSONResponse(
                content={
                    "success": False,
                    "protocol": None,
                    "message": "Could not determine camera resolution",
                }
            )

        megapixels = (width * height) / 1_000_000
        protocol = "http-flv" if megapixels <= 5.0 else "rtsp"

        return JSONResponse(
            content={
                "success": True,
                "protocol": protocol,
                "resolution": f"{width}x{height}",
                "megapixels": round(megapixels, 2),
            }
        )

    except requests.exceptions.Timeout:
        return JSONResponse(
            content={
                "success": False,
                "protocol": None,
                "message": "Connection timeout - camera did not respond",
            }
        )
    except requests.exceptions.RequestException as e:
        return JSONResponse(
            content={
                "success": False,
                "protocol": None,
                "message": f"Connection error: {str(e)}",
            }
        )
    except Exception as e:
        logger.exception(f"Error detecting Reolink camera at {host}")
        return JSONResponse(
            content={
                "success": False,
                "protocol": None,
                "message": f"Unexpected error: {str(e)}",
            }
        )


def _extract_fps(r_frame_rate: str) -> float | None:
    """Extract FPS from ffprobe r_frame_rate string (e.g., '30/1' -> 30.0)"""
    if not r_frame_rate:
        return None
    try:
        num, den = r_frame_rate.split("/")
        return round(float(num) / float(den), 2)
    except (ValueError, ZeroDivisionError):
        return None
