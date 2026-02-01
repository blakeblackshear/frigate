"""Camera apis."""

import json
import logging
import re
from importlib.util import find_spec
from pathlib import Path
from urllib.parse import quote_plus

import httpx
import requests
from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import JSONResponse
from onvif import ONVIFCamera, ONVIFError
from zeep.exceptions import Fault, TransportError
from zeep.transports import AsyncTransport

from frigate.api.auth import (
    allow_any_authenticated,
    require_camera_access,
    require_role,
)
from frigate.api.defs.tags import Tags
from frigate.config.config import FrigateConfig
from frigate.util.builtin import clean_camera_user_pass
from frigate.util.image import run_ffmpeg_snapshot
from frigate.util.services import ffprobe_stream

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.camera])


def _is_valid_host(host: str) -> bool:
    """
    Validate that the host is in a valid format.
    Allows private IPs since cameras are typically on local networks.
    Only blocks obviously malicious input to prevent injection attacks.
    """
    try:
        # Remove port if present
        host_without_port = host.split(":")[0] if ":" in host else host

        # Block whitespace, newlines, and control characters
        if not host_without_port or re.search(r"[\s\x00-\x1f]", host_without_port):
            return False

        # Allow standard hostname/IP characters: alphanumeric, dots, hyphens
        if not re.match(r"^[a-zA-Z0-9.-]+$", host_without_port):
            return False

        return True
    except Exception:
        return False


@router.get("/go2rtc/streams", dependencies=[Depends(allow_any_authenticated())])
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


@router.get(
    "/go2rtc/streams/{camera_name}", dependencies=[Depends(require_camera_access)]
)
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


@router.get("/ffprobe", dependencies=[Depends(require_role(["admin"]))])
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

        if ffprobe.returncode != 0:
            try:
                stderr_decoded = ffprobe.stderr.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    stderr_decoded = ffprobe.stderr.decode("unicode_escape")
                except Exception:
                    stderr_decoded = str(ffprobe.stderr)

            stderr_lines = [
                line.strip() for line in stderr_decoded.split("\n") if line.strip()
            ]

            result = {
                "return_code": ffprobe.returncode,
                "stderr": stderr_lines,
                "stdout": "",
            }
        else:
            result = {
                "return_code": ffprobe.returncode,
                "stderr": [],
                "stdout": json.loads(ffprobe.stdout.decode("unicode_escape").strip()),
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
                        "fps": _extract_fps(video_stream.get("avg_frame_rate")),
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

    # Validate host format to prevent injection attacks
    if not _is_valid_host(host):
        return JSONResponse(
            content={"success": False, "message": "Invalid host format"},
            status_code=400,
        )

    try:
        # URL-encode credentials to prevent injection
        encoded_user = quote_plus(username)
        encoded_password = quote_plus(password)
        api_url = f"http://{host}/api.cgi?cmd=GetEnc&user={encoded_user}&password={encoded_password}"

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
    except requests.exceptions.RequestException:
        return JSONResponse(
            content={
                "success": False,
                "protocol": None,
                "message": "Failed to connect to camera",
            }
        )
    except Exception:
        logger.exception(f"Error detecting Reolink camera at {host}")
        return JSONResponse(
            content={
                "success": False,
                "protocol": None,
                "message": "Unable to detect camera capabilities",
            }
        )


def _extract_fps(r_frame_rate: str) -> float | None:
    """Extract FPS from ffprobe avg_frame_rate / r_frame_rate string (e.g., '30/1' -> 30.0)"""
    if not r_frame_rate:
        return None
    try:
        num, den = r_frame_rate.split("/")
        return round(float(num) / float(den), 2)
    except (ValueError, ZeroDivisionError):
        return None


@router.get(
    "/onvif/probe",
    dependencies=[Depends(require_role(["admin"]))],
    summary="Probe ONVIF device",
    description=(
        "Probe an ONVIF device to determine capabilities and optionally test available stream URIs. "
        "Query params: host (required), port (default 80), username, password, test (boolean), "
        "auth_type (basic or digest, default basic)."
    ),
)
async def onvif_probe(
    request: Request,
    host: str = Query(None),
    port: int = Query(80),
    username: str = Query(""),
    password: str = Query(""),
    test: bool = Query(False),
    auth_type: str = Query("basic"),  # Add auth_type parameter
):
    """
    Probe a single ONVIF device to determine capabilities.

    Connects to an ONVIF device and queries for:
    - Device information (manufacturer, model)
    - Media profiles count
    - PTZ support
    - Available presets
    - Autotracking support

    Query Parameters:
        host: Device host/IP address (required)
        port: Device port (default 80)
        username: ONVIF username (optional)
        password: ONVIF password (optional)
        test: run ffprobe on the stream (optional)
        auth_type: Authentication type - "basic" or "digest" (default "basic")

    Returns:
        JSON with device capabilities information
    """
    if not host:
        return JSONResponse(
            content={"success": False, "message": "host parameter is required"},
            status_code=400,
        )

    # Validate host format
    if not _is_valid_host(host):
        return JSONResponse(
            content={"success": False, "message": "Invalid host format"},
            status_code=400,
        )

    # Validate auth_type
    if auth_type not in ["basic", "digest"]:
        return JSONResponse(
            content={
                "success": False,
                "message": "auth_type must be 'basic' or 'digest'",
            },
            status_code=400,
        )

    onvif_camera = None

    try:
        logger.debug(f"Probing ONVIF device at {host}:{port} with {auth_type} auth")

        try:
            wsdl_base = None
            spec = find_spec("onvif")
            if spec and getattr(spec, "origin", None):
                wsdl_base = str(Path(spec.origin).parent / "wsdl")
        except Exception:
            wsdl_base = None

        onvif_camera = ONVIFCamera(
            host, port, username or "", password or "", wsdl_dir=wsdl_base
        )

        # Configure digest authentication if requested
        if auth_type == "digest" and username and password:
            # Create httpx client with digest auth
            auth = httpx.DigestAuth(username, password)
            client = httpx.AsyncClient(auth=auth, timeout=10.0)

            # Replace the transport in the zeep client
            transport = AsyncTransport(client=client)

            # Update the xaddr before setting transport
            await onvif_camera.update_xaddrs()

            # Replace transport in all services
            if hasattr(onvif_camera, "devicemgmt"):
                onvif_camera.devicemgmt.zeep_client.transport = transport
            if hasattr(onvif_camera, "media"):
                onvif_camera.media.zeep_client.transport = transport
            if hasattr(onvif_camera, "ptz"):
                onvif_camera.ptz.zeep_client.transport = transport

            logger.debug("Configured digest authentication")
        else:
            await onvif_camera.update_xaddrs()

        # Get device information
        device_info = {
            "manufacturer": "Unknown",
            "model": "Unknown",
            "firmware_version": "Unknown",
        }
        try:
            device_service = await onvif_camera.create_devicemgmt_service()

            # Update transport for device service if digest auth
            if auth_type == "digest" and username and password:
                auth = httpx.DigestAuth(username, password)
                client = httpx.AsyncClient(auth=auth, timeout=10.0)
                transport = AsyncTransport(client=client)
                device_service.zeep_client.transport = transport

            device_info_resp = await device_service.GetDeviceInformation()
            manufacturer = getattr(device_info_resp, "Manufacturer", None) or (
                device_info_resp.get("Manufacturer")
                if isinstance(device_info_resp, dict)
                else None
            )
            model = getattr(device_info_resp, "Model", None) or (
                device_info_resp.get("Model")
                if isinstance(device_info_resp, dict)
                else None
            )
            firmware = getattr(device_info_resp, "FirmwareVersion", None) or (
                device_info_resp.get("FirmwareVersion")
                if isinstance(device_info_resp, dict)
                else None
            )
            device_info.update(
                {
                    "manufacturer": manufacturer or "Unknown",
                    "model": model or "Unknown",
                    "firmware_version": firmware or "Unknown",
                }
            )
        except Exception as e:
            logger.debug(f"Failed to get device info: {e}")

        # Get media profiles
        profiles = []
        profiles_count = 0
        first_profile_token = None
        ptz_config_token = None
        try:
            media_service = await onvif_camera.create_media_service()

            # Update transport for media service if digest auth
            if auth_type == "digest" and username and password:
                auth = httpx.DigestAuth(username, password)
                client = httpx.AsyncClient(auth=auth, timeout=10.0)
                transport = AsyncTransport(client=client)
                media_service.zeep_client.transport = transport

            profiles = await media_service.GetProfiles()
            profiles_count = len(profiles) if profiles else 0
            if profiles and len(profiles) > 0:
                p = profiles[0]
                first_profile_token = getattr(p, "token", None) or (
                    p.get("token") if isinstance(p, dict) else None
                )
                # Get PTZ configuration token from the profile
                ptz_configuration = getattr(p, "PTZConfiguration", None) or (
                    p.get("PTZConfiguration") if isinstance(p, dict) else None
                )
                if ptz_configuration:
                    ptz_config_token = getattr(ptz_configuration, "token", None) or (
                        ptz_configuration.get("token")
                        if isinstance(ptz_configuration, dict)
                        else None
                    )
        except Exception as e:
            logger.debug(f"Failed to get media profiles: {e}")

        # Check PTZ support and capabilities
        ptz_supported = False
        presets_count = 0
        autotrack_supported = False

        try:
            ptz_service = await onvif_camera.create_ptz_service()

            # Update transport for PTZ service if digest auth
            if auth_type == "digest" and username and password:
                auth = httpx.DigestAuth(username, password)
                client = httpx.AsyncClient(auth=auth, timeout=10.0)
                transport = AsyncTransport(client=client)
                ptz_service.zeep_client.transport = transport

            # Check if PTZ service is available
            try:
                await ptz_service.GetServiceCapabilities()
                ptz_supported = True
                logger.debug("PTZ service is available")
            except Exception as e:
                logger.debug(f"PTZ service not available: {e}")
                ptz_supported = False

            # Try to get presets if PTZ is supported and we have a profile
            if ptz_supported and first_profile_token:
                try:
                    presets_resp = await ptz_service.GetPresets(
                        {"ProfileToken": first_profile_token}
                    )
                    presets_count = len(presets_resp) if presets_resp else 0
                    logger.debug(f"Found {presets_count} presets")
                except Exception as e:
                    logger.debug(f"Failed to get presets: {e}")
                    presets_count = 0

            # Check for autotracking support - requires both FOV relative movement and MoveStatus
            if ptz_supported and first_profile_token and ptz_config_token:
                # First check for FOV relative movement support
                pt_r_fov_supported = False
                try:
                    config_request = ptz_service.create_type("GetConfigurationOptions")
                    config_request.ConfigurationToken = ptz_config_token
                    ptz_config = await ptz_service.GetConfigurationOptions(
                        config_request
                    )

                    if ptz_config:
                        # Check for pt-r-fov support
                        spaces = getattr(ptz_config, "Spaces", None) or (
                            ptz_config.get("Spaces")
                            if isinstance(ptz_config, dict)
                            else None
                        )

                        if spaces:
                            rel_pan_tilt_space = getattr(
                                spaces, "RelativePanTiltTranslationSpace", None
                            ) or (
                                spaces.get("RelativePanTiltTranslationSpace")
                                if isinstance(spaces, dict)
                                else None
                            )

                            if rel_pan_tilt_space:
                                # Look for FOV space
                                for i, space in enumerate(rel_pan_tilt_space):
                                    uri = None
                                    if isinstance(space, dict):
                                        uri = space.get("URI")
                                    else:
                                        uri = getattr(space, "URI", None)

                                    if uri and "TranslationSpaceFov" in uri:
                                        pt_r_fov_supported = True
                                        logger.debug(
                                            "FOV relative movement (pt-r-fov) supported"
                                        )
                                        break

                        logger.debug(f"PTZ config spaces: {ptz_config}")
                except Exception as e:
                    logger.debug(f"Failed to check FOV relative movement: {e}")
                    pt_r_fov_supported = False

                # Now check for MoveStatus support via GetServiceCapabilities
                if pt_r_fov_supported:
                    try:
                        service_capabilities_request = ptz_service.create_type(
                            "GetServiceCapabilities"
                        )
                        service_capabilities = await ptz_service.GetServiceCapabilities(
                            service_capabilities_request
                        )

                        # Look for MoveStatus in the capabilities
                        move_status_capable = False
                        if service_capabilities:
                            # Try to find MoveStatus key recursively
                            def find_move_status(obj, key="MoveStatus"):
                                if isinstance(obj, dict):
                                    if key in obj:
                                        return obj[key]
                                    for v in obj.values():
                                        result = find_move_status(v, key)
                                        if result is not None:
                                            return result
                                elif hasattr(obj, key):
                                    return getattr(obj, key)
                                elif hasattr(obj, "__dict__"):
                                    for v in vars(obj).values():
                                        result = find_move_status(v, key)
                                        if result is not None:
                                            return result
                                return None

                            move_status_value = find_move_status(service_capabilities)

                            # MoveStatus should return "true" if supported
                            if isinstance(move_status_value, bool):
                                move_status_capable = move_status_value
                            elif isinstance(move_status_value, str):
                                move_status_capable = (
                                    move_status_value.lower() == "true"
                                )

                            logger.debug(f"MoveStatus capability: {move_status_value}")

                        # Autotracking is supported if both conditions are met
                        autotrack_supported = pt_r_fov_supported and move_status_capable

                        if autotrack_supported:
                            logger.debug(
                                "Autotracking fully supported (pt-r-fov + MoveStatus)"
                            )
                        else:
                            logger.debug(
                                f"Autotracking not fully supported - pt-r-fov: {pt_r_fov_supported}, MoveStatus: {move_status_capable}"
                            )
                    except Exception as e:
                        logger.debug(f"Failed to check MoveStatus support: {e}")
                        autotrack_supported = False

        except Exception as e:
            logger.debug(f"Failed to probe PTZ service: {e}")

        result = {
            "success": True,
            "host": host,
            "port": port,
            "manufacturer": device_info["manufacturer"],
            "model": device_info["model"],
            "firmware_version": device_info["firmware_version"],
            "profiles_count": profiles_count,
            "ptz_supported": ptz_supported,
            "presets_count": presets_count,
            "autotrack_supported": autotrack_supported,
        }

        # Gather RTSP candidates
        rtsp_candidates: list[dict] = []
        try:
            media_service = await onvif_camera.create_media_service()

            # Update transport for media service if digest auth
            if auth_type == "digest" and username and password:
                auth = httpx.DigestAuth(username, password)
                client = httpx.AsyncClient(auth=auth, timeout=10.0)
                transport = AsyncTransport(client=client)
                media_service.zeep_client.transport = transport

            if profiles_count and media_service:
                for p in profiles or []:
                    token = getattr(p, "token", None) or (
                        p.get("token") if isinstance(p, dict) else None
                    )
                    if not token:
                        continue
                    try:
                        stream_setup = {
                            "Stream": "RTP-Unicast",
                            "Transport": {"Protocol": "RTSP"},
                        }
                        stream_req = {
                            "ProfileToken": token,
                            "StreamSetup": stream_setup,
                        }
                        stream_uri_resp = await media_service.GetStreamUri(stream_req)
                        uri = (
                            stream_uri_resp.get("Uri")
                            if isinstance(stream_uri_resp, dict)
                            else getattr(stream_uri_resp, "Uri", None)
                        )
                        if uri:
                            logger.debug(
                                f"GetStreamUri returned for token {token}: {uri}"
                            )
                            # If credentials were provided, do NOT add the unauthenticated URI.
                            try:
                                if isinstance(uri, str) and uri.startswith("rtsp://"):
                                    if username and password and "@" not in uri:
                                        # Inject raw credentials and add only the
                                        # authenticated version. The credentials will be encoded
                                        # later by ffprobe_stream or the config system.
                                        cred = f"{username}:{password}@"
                                        injected = uri.replace(
                                            "rtsp://", f"rtsp://{cred}", 1
                                        )
                                        rtsp_candidates.append(
                                            {
                                                "source": "GetStreamUri",
                                                "profile_token": token,
                                                "uri": injected,
                                            }
                                        )
                                    else:
                                        # No credentials provided or URI already contains
                                        # credentials — add the URI as returned.
                                        rtsp_candidates.append(
                                            {
                                                "source": "GetStreamUri",
                                                "profile_token": token,
                                                "uri": uri,
                                            }
                                        )
                                else:
                                    # Non-RTSP URIs (e.g., http-flv) — add as returned.
                                    rtsp_candidates.append(
                                        {
                                            "source": "GetStreamUri",
                                            "profile_token": token,
                                            "uri": uri,
                                        }
                                    )
                            except Exception as e:
                                logger.debug(
                                    f"Skipping stream URI for token {token} due to processing error: {e}"
                                )
                                continue
                    except Exception:
                        logger.debug(
                            f"GetStreamUri failed for token {token}", exc_info=True
                        )
                        continue

            # Add common RTSP patterns as fallback
            if not rtsp_candidates:
                common_paths = [
                    "/h264",
                    "/live.sdp",
                    "/media.amp",
                    "/Streaming/Channels/101",
                    "/Streaming/Channels/1",
                    "/stream1",
                    "/cam/realmonitor?channel=1&subtype=0",
                    "/11",
                ]
                # Use raw credentials for pattern fallback URIs when provided
                auth_str = f"{username}:{password}@" if username and password else ""
                rtsp_port = 554
                for path in common_paths:
                    uri = f"rtsp://{auth_str}{host}:{rtsp_port}{path}"
                    rtsp_candidates.append({"source": "pattern", "uri": uri})
        except Exception:
            logger.debug("Failed to collect RTSP candidates")

        # Optionally test RTSP candidates using ffprobe_stream
        tested_candidates = []
        if test and rtsp_candidates:
            for c in rtsp_candidates:
                uri = c["uri"]
                to_test = [uri]
                try:
                    if (
                        username
                        and password
                        and isinstance(uri, str)
                        and uri.startswith("rtsp://")
                        and "@" not in uri
                    ):
                        cred = f"{username}:{password}@"
                        cred_uri = uri.replace("rtsp://", f"rtsp://{cred}", 1)
                        if cred_uri not in to_test:
                            to_test.append(cred_uri)
                except Exception:
                    pass

                for test_uri in to_test:
                    try:
                        probe = ffprobe_stream(
                            request.app.frigate_config.ffmpeg, test_uri, detailed=False
                        )
                        print(probe)
                        ok = probe is not None and getattr(probe, "returncode", 1) == 0
                        tested_candidates.append(
                            {
                                "uri": test_uri,
                                "source": c.get("source"),
                                "ok": ok,
                                "profile_token": c.get("profile_token"),
                            }
                        )
                    except Exception as e:
                        logger.debug(f"Unable to probe stream: {e}")
                        tested_candidates.append(
                            {
                                "uri": test_uri,
                                "source": c.get("source"),
                                "ok": False,
                                "profile_token": c.get("profile_token"),
                            }
                        )

        result["rtsp_candidates"] = rtsp_candidates
        if test:
            result["rtsp_tested"] = tested_candidates

        logger.debug(f"ONVIF probe successful: {result}")
        return JSONResponse(content=result)

    except ONVIFError as e:
        logger.warning(f"ONVIF error probing {host}:{port}: {e}")
        return JSONResponse(
            content={"success": False, "message": "ONVIF error"},
            status_code=400,
        )
    except (Fault, TransportError) as e:
        logger.warning(f"Connection error probing {host}:{port}: {e}")
        return JSONResponse(
            content={"success": False, "message": "Connection error"},
            status_code=503,
        )
    except Exception as e:
        logger.warning(f"Error probing ONVIF device at {host}:{port}, {e}")
        return JSONResponse(
            content={"success": False, "message": "Probe failed"},
            status_code=500,
        )

    finally:
        # Best-effort cleanup of ONVIF camera client session
        if onvif_camera is not None:
            try:
                # Check if the camera has a close method and call it
                if hasattr(onvif_camera, "close"):
                    await onvif_camera.close()
            except Exception as e:
                logger.debug(f"Error closing ONVIF camera session: {e}")
