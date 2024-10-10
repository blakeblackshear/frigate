"""Utilities for services."""

import asyncio
import json
import logging
import os
import re
import signal
import subprocess as sp
import traceback
from typing import Optional

import cv2
import psutil
import py3nvml.py3nvml as nvml
import requests

from frigate.const import (
    DRIVER_AMD,
    DRIVER_ENV_VAR,
    FFMPEG_HWACCEL_NVIDIA,
    FFMPEG_HWACCEL_VAAPI,
)
from frigate.util.builtin import clean_camera_user_pass, escape_special_characters

logger = logging.getLogger(__name__)


def restart_frigate():
    proc = psutil.Process(1)
    # if this is running via s6, sigterm pid 1
    if proc.name() == "s6-svscan":
        proc.terminate()
    # otherwise, just try and exit frigate
    else:
        os.kill(os.getpid(), signal.SIGINT)


def print_stack(sig, frame):
    traceback.print_stack(frame)


def listen():
    signal.signal(signal.SIGUSR1, print_stack)


def get_cgroups_version() -> str:
    """Determine what version of cgroups is enabled."""

    cgroup_path = "/sys/fs/cgroup"

    if not os.path.ismount(cgroup_path):
        logger.debug(f"{cgroup_path} is not a mount point.")
        return "unknown"

    try:
        with open("/proc/mounts", "r") as f:
            mounts = f.readlines()

        for mount in mounts:
            mount_info = mount.split()
            if mount_info[1] == cgroup_path:
                fs_type = mount_info[2]
                if fs_type == "cgroup2fs" or fs_type == "cgroup2":
                    return "cgroup2"
                elif fs_type == "tmpfs":
                    return "cgroup"
                else:
                    logger.debug(
                        f"Could not determine cgroups version: unhandled filesystem {fs_type}"
                    )
                break
    except Exception as e:
        logger.debug(f"Could not determine cgroups version: {e}")

    return "unknown"


def get_docker_memlimit_bytes() -> int:
    """Get mem limit in bytes set in docker if present. Returns -1 if no limit detected."""

    # check running a supported cgroups version
    if get_cgroups_version() == "cgroup2":
        memlimit_path = "/sys/fs/cgroup/memory.max"

        try:
            with open(memlimit_path, "r") as f:
                value = f.read().strip()

            if value.isnumeric():
                return int(value)
            elif value.lower() == "max":
                return -1
        except Exception as e:
            logger.debug(f"Unable to get docker memlimit: {e}")

    return -1


def get_cpu_stats() -> dict[str, dict]:
    """Get cpu usages for each process id"""
    usages = {}
    docker_memlimit = get_docker_memlimit_bytes() / 1024
    total_mem = os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 1024

    system_cpu = psutil.cpu_percent(
        interval=None
    )  # no interval as we don't want to be blocking
    system_mem = psutil.virtual_memory()
    usages["frigate.full_system"] = {
        "cpu": str(system_cpu),
        "mem": str(system_mem.percent),
    }

    for process in psutil.process_iter(["pid", "name", "cpu_percent", "cmdline"]):
        pid = str(process.info["pid"])
        try:
            cpu_percent = process.info["cpu_percent"]
            cmdline = process.info["cmdline"]

            with open(f"/proc/{pid}/stat", "r") as f:
                stats = f.readline().split()
            utime = int(stats[13])
            stime = int(stats[14])
            start_time = int(stats[21])

            with open("/proc/uptime") as f:
                system_uptime_sec = int(float(f.read().split()[0]))

            clk_tck = os.sysconf(os.sysconf_names["SC_CLK_TCK"])

            process_utime_sec = utime // clk_tck
            process_stime_sec = stime // clk_tck
            process_start_time_sec = start_time // clk_tck

            process_elapsed_sec = system_uptime_sec - process_start_time_sec
            process_usage_sec = process_utime_sec + process_stime_sec
            cpu_average_usage = process_usage_sec * 100 // process_elapsed_sec

            with open(f"/proc/{pid}/statm", "r") as f:
                mem_stats = f.readline().split()
            mem_res = int(mem_stats[1]) * os.sysconf("SC_PAGE_SIZE") / 1024

            if docker_memlimit > 0:
                mem_pct = round((mem_res / docker_memlimit) * 100, 1)
            else:
                mem_pct = round((mem_res / total_mem) * 100, 1)

            usages[pid] = {
                "cpu": str(cpu_percent),
                "cpu_average": str(round(cpu_average_usage, 2)),
                "mem": f"{mem_pct}",
                "cmdline": clean_camera_user_pass(" ".join(cmdline)),
            }
        except Exception:
            continue

    return usages


def get_physical_interfaces(interfaces) -> list:
    if not interfaces:
        return []

    with open("/proc/net/dev", "r") as file:
        lines = file.readlines()

    physical_interfaces = []
    for line in lines:
        if ":" in line:
            interface = line.split(":")[0].strip()
            for int in interfaces:
                if interface.startswith(int):
                    physical_interfaces.append(interface)

    return physical_interfaces


def get_bandwidth_stats(config) -> dict[str, dict]:
    """Get bandwidth usages for each ffmpeg process id"""
    usages = {}
    top_command = ["nethogs", "-t", "-v0", "-c5", "-d1"] + get_physical_interfaces(
        config.telemetry.network_interfaces
    )

    p = sp.run(
        top_command,
        encoding="ascii",
        capture_output=True,
    )

    if p.returncode != 0:
        logger.error(f"Error getting network stats :: {p.stderr}")
        return usages
    else:
        lines = p.stdout.split("\n")
        for line in lines:
            stats = list(filter(lambda a: a != "", line.strip().split("\t")))
            try:
                if re.search(
                    r"(^ffmpeg|\/go2rtc|frigate\.detector\.[a-z]+)/([0-9]+)/", stats[0]
                ):
                    process = stats[0].split("/")
                    usages[process[len(process) - 2]] = {
                        "bandwidth": round(float(stats[1]) + float(stats[2]), 1),
                    }
            except (IndexError, ValueError):
                continue

    return usages


def is_vaapi_amd_driver() -> bool:
    # Use the explicitly configured driver, if available
    driver = os.environ.get(DRIVER_ENV_VAR)
    if driver:
        return driver == DRIVER_AMD

    # Otherwise, ask vainfo what is has autodetected
    p = vainfo_hwaccel()

    if p.returncode != 0:
        logger.error(f"Unable to poll vainfo: {p.stderr}")
        return False
    else:
        output = p.stdout.decode("unicode_escape").split("\n")

        # VA Info will print out the friendly name of the driver
        return any("AMD Radeon Graphics" in line for line in output)


def get_amd_gpu_stats() -> dict[str, str]:
    """Get stats using radeontop."""
    radeontop_command = ["radeontop", "-d", "-", "-l", "1"]

    p = sp.run(
        radeontop_command,
        encoding="ascii",
        capture_output=True,
    )

    if p.returncode != 0:
        logger.error(f"Unable to poll radeon GPU stats: {p.stderr}")
        return None
    else:
        usages = p.stdout.split(",")
        results: dict[str, str] = {}

        for hw in usages:
            if "gpu" in hw:
                results["gpu"] = f"{hw.strip().split(' ')[1].replace('%', '')}%"
            elif "vram" in hw:
                results["mem"] = f"{hw.strip().split(' ')[1].replace('%', '')}%"

        return results


def get_intel_gpu_stats() -> dict[str, str]:
    """Get stats using intel_gpu_top."""
    intel_gpu_top_command = [
        "timeout",
        "0.5s",
        "intel_gpu_top",
        "-J",
        "-o",
        "-",
        "-s",
        "1",
    ]

    p = sp.run(
        intel_gpu_top_command,
        encoding="ascii",
        capture_output=True,
    )

    # timeout has a non-zero returncode when timeout is reached
    if p.returncode != 124:
        logger.error(f"Unable to poll intel GPU stats: {p.stderr}")
        return None
    else:
        data = json.loads(f'[{"".join(p.stdout.split())}]')
        results: dict[str, str] = {}
        render = {"global": []}
        video = {"global": []}

        for block in data:
            global_engine = block.get("engines")

            if global_engine:
                render_frame = global_engine.get("Render/3D/0", {}).get("busy")
                video_frame = global_engine.get("Video/0", {}).get("busy")

                if render_frame is not None:
                    render["global"].append(float(render_frame))

                if video_frame is not None:
                    video["global"].append(float(video_frame))

            clients = block.get("clients", {})

            if clients and len(clients):
                for client_block in clients.values():
                    key = client_block["pid"]

                    if render.get(key) is None:
                        render[key] = []
                        video[key] = []

                    client_engine = client_block.get("engine-classes", {})

                    render_frame = client_engine.get("Render/3D", {}).get("busy")
                    video_frame = client_engine.get("Video", {}).get("busy")

                    if render_frame is not None:
                        render[key].append(float(render_frame))

                    if video_frame is not None:
                        video[key].append(float(video_frame))

        if render["global"]:
            results["gpu"] = (
                f"{round(((sum(render['global']) / len(render['global'])) + (sum(video['global']) / len(video['global']))) / 2, 2)}%"
            )
            results["mem"] = "-%"

        if len(render.keys()) > 1:
            results["clients"] = {}

            for key in render.keys():
                if key == "global":
                    continue

                results["clients"][key] = (
                    f"{round(((sum(render[key]) / len(render[key])) + (sum(video[key]) / len(video[key]))) / 2, 2)}%"
                )

        return results


def try_get_info(f, h, default="N/A"):
    try:
        if h:
            v = f(h)
        else:
            v = f()
    except nvml.NVMLError_NotSupported:
        v = default
    return v


def get_nvidia_gpu_stats() -> dict[int, dict]:
    results = {}
    try:
        nvml.nvmlInit()
        deviceCount = nvml.nvmlDeviceGetCount()
        for i in range(deviceCount):
            handle = nvml.nvmlDeviceGetHandleByIndex(i)
            meminfo = try_get_info(nvml.nvmlDeviceGetMemoryInfo, handle)
            util = try_get_info(nvml.nvmlDeviceGetUtilizationRates, handle)
            enc = try_get_info(nvml.nvmlDeviceGetEncoderUtilization, handle)
            dec = try_get_info(nvml.nvmlDeviceGetDecoderUtilization, handle)
            pstate = try_get_info(nvml.nvmlDeviceGetPowerState, handle, default=None)

            if util != "N/A":
                gpu_util = util.gpu
            else:
                gpu_util = 0

            if meminfo != "N/A":
                gpu_mem_util = meminfo.used / meminfo.total * 100
            else:
                gpu_mem_util = -1

            if enc != "N/A":
                enc_util = enc[0]
            else:
                enc_util = -1

            if dec != "N/A":
                dec_util = dec[0]
            else:
                dec_util = -1

            results[i] = {
                "name": nvml.nvmlDeviceGetName(handle),
                "gpu": gpu_util,
                "mem": gpu_mem_util,
                "enc": enc_util,
                "dec": dec_util,
                "pstate": pstate or "unknown",
            }
    except Exception:
        pass
    finally:
        return results


def get_jetson_stats() -> dict[int, dict]:
    results = {}

    try:
        results["mem"] = "-"  # no discrete gpu memory

        with open("/sys/devices/gpu.0/load", "r") as f:
            gpuload = float(f.readline()) / 10
            results["gpu"] = f"{gpuload}%"
    except Exception:
        return None

    return results


def ffprobe_stream(ffmpeg, path: str) -> sp.CompletedProcess:
    """Run ffprobe on stream."""
    clean_path = escape_special_characters(path)
    ffprobe_cmd = [
        ffmpeg.ffprobe_path,
        "-timeout",
        "1000000",
        "-print_format",
        "json",
        "-show_entries",
        "stream=codec_long_name,width,height,bit_rate,duration,display_aspect_ratio,avg_frame_rate",
        "-loglevel",
        "quiet",
        clean_path,
    ]
    return sp.run(ffprobe_cmd, capture_output=True)


def vainfo_hwaccel(device_name: Optional[str] = None) -> sp.CompletedProcess:
    """Run vainfo."""
    ffprobe_cmd = (
        ["vainfo"]
        if not device_name
        else ["vainfo", "--display", "drm", "--device", f"/dev/dri/{device_name}"]
    )
    return sp.run(ffprobe_cmd, capture_output=True)


def get_nvidia_driver_info() -> dict[str, any]:
    """Get general hardware info for nvidia GPU."""
    results = {}
    try:
        nvml.nvmlInit()
        deviceCount = nvml.nvmlDeviceGetCount()
        for i in range(deviceCount):
            handle = nvml.nvmlDeviceGetHandleByIndex(i)
            driver = try_get_info(nvml.nvmlSystemGetDriverVersion, None, default=None)
            cuda_compute = try_get_info(
                nvml.nvmlDeviceGetCudaComputeCapability, handle, default=None
            )
            vbios = try_get_info(nvml.nvmlDeviceGetVbiosVersion, handle, default=None)
            results[i] = {
                "name": nvml.nvmlDeviceGetName(handle),
                "driver": driver or "unknown",
                "cuda_compute": cuda_compute or "unknown",
                "vbios": vbios or "unknown",
            }
    except Exception:
        pass
    finally:
        return results


def auto_detect_hwaccel() -> str:
    """Detect hwaccel args by default."""
    try:
        cuda = False
        vaapi = False
        resp = requests.get("http://127.0.0.1:1984/api/ffmpeg/hardware", timeout=3)

        if resp.status_code == 200:
            data: dict[str, list[dict[str, str]]] = resp.json()
            for source in data.get("sources", []):
                if "cuda" in source.get("url", "") and source.get("name") == "OK":
                    cuda = True

                if "vaapi" in source.get("url", "") and source.get("name") == "OK":
                    vaapi = True
    except requests.RequestException:
        pass

    if cuda:
        logger.info("Automatically detected nvidia hwaccel for video decoding")
        return FFMPEG_HWACCEL_NVIDIA

    if vaapi:
        logger.info("Automatically detected vaapi hwaccel for video decoding")
        return FFMPEG_HWACCEL_VAAPI

    logger.warning(
        "Did not detect hwaccel, using a GPU for accelerated video decoding is highly recommended"
    )
    return ""


async def get_video_properties(
    ffmpeg, url: str, get_duration: bool = False
) -> dict[str, any]:
    async def calculate_duration(video: Optional[any]) -> float:
        duration = None

        if video is not None:
            # Get the frames per second (fps) of the video stream
            fps = video.get(cv2.CAP_PROP_FPS)
            total_frames = int(video.get(cv2.CAP_PROP_FRAME_COUNT))

            if fps and total_frames:
                duration = total_frames / fps

        # if cv2 failed need to use ffprobe
        if duration is None:
            p = await asyncio.create_subprocess_exec(
                ffmpeg.ffprobe_path,
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                f"{url}",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await p.wait()

            if p.returncode == 0:
                result = (await p.stdout.read()).decode()
            else:
                result = None

            if result:
                try:
                    duration = float(result.strip())
                except ValueError:
                    duration = -1
            else:
                duration = -1

        return duration

    width = height = 0

    try:
        # Open the video stream
        video = cv2.VideoCapture(url)

        # Check if the video stream was opened successfully
        if not video.isOpened():
            video = None
    except Exception:
        video = None

    result = {}

    if get_duration:
        result["duration"] = await calculate_duration(video)

    if video is not None:
        # Get the width of frames in the video stream
        width = video.get(cv2.CAP_PROP_FRAME_WIDTH)

        # Get the height of frames in the video stream
        height = video.get(cv2.CAP_PROP_FRAME_HEIGHT)

        # Get the stream encoding
        fourcc_int = int(video.get(cv2.CAP_PROP_FOURCC))
        fourcc = (
            chr((fourcc_int >> 0) & 255)
            + chr((fourcc_int >> 8) & 255)
            + chr((fourcc_int >> 16) & 255)
            + chr((fourcc_int >> 24) & 255)
        )

        # Release the video stream
        video.release()

        result["width"] = round(width)
        result["height"] = round(height)
        result["fourcc"] = fourcc

    return result
