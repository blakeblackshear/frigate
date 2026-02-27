"""Utilities for services."""

import asyncio
import json
import logging
import os
import re
import resource
import shutil
import signal
import subprocess as sp
import time
import traceback
from datetime import datetime
from typing import Any, List, Optional, Tuple

import cv2
import psutil
import py3nvml.py3nvml as nvml
import requests

from frigate.const import (
    DRIVER_AMD,
    DRIVER_ENV_VAR,
    FFMPEG_HWACCEL_NVIDIA,
    FFMPEG_HWACCEL_VAAPI,
    SHM_FRAMES_VAR,
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


def get_amd_gpu_stats() -> Optional[dict[str, str]]:
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


def get_intel_gpu_stats(intel_gpu_device: Optional[str]) -> Optional[dict[str, str]]:
    """Get stats using intel_gpu_top."""

    def get_stats_manually(output: str) -> dict[str, str]:
        """Find global stats via regex when json fails to parse."""
        reading = "".join(output)
        results: dict[str, str] = {}

        # render is used for qsv
        render = []
        for result in re.findall(r'"Render/3D/0":{[a-z":\d.,%]+}', reading):
            packet = json.loads(result[14:])
            single = packet.get("busy", 0.0)
            render.append(float(single))

        if render:
            render_avg = sum(render) / len(render)
        else:
            render_avg = 1

        # video is used for vaapi
        video = []
        for result in re.findall(r'"Video/\d":{[a-z":\d.,%]+}', reading):
            packet = json.loads(result[10:])
            single = packet.get("busy", 0.0)
            video.append(float(single))

        if video:
            video_avg = sum(video) / len(video)
        else:
            video_avg = 1

        results["gpu"] = f"{round((video_avg + render_avg) / 2, 2)}%"
        results["mem"] = "-%"
        return results

    intel_gpu_top_command = [
        "timeout",
        "0.5s",
        "intel_gpu_top",
        "-J",
        "-o",
        "-",
        "-s",
        "1000",  # Intel changed this from seconds to milliseconds in 2024+ versions
    ]

    if intel_gpu_device:
        intel_gpu_top_command += ["-d", intel_gpu_device]

    try:
        p = sp.run(
            intel_gpu_top_command,
            encoding="ascii",
            capture_output=True,
        )
    except UnicodeDecodeError:
        return None

    # timeout has a non-zero returncode when timeout is reached
    if p.returncode != 124:
        logger.error(f"Unable to poll intel GPU stats: {p.stderr}")
        return None
    else:
        output = "".join(p.stdout.split())

        try:
            data = json.loads(f"[{output}]")
        except json.JSONDecodeError:
            return get_stats_manually(output)

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

        if render["global"] and video["global"]:
            results["gpu"] = (
                f"{round(((sum(render['global']) / len(render['global'])) + (sum(video['global']) / len(video['global']))) / 2, 2)}%"
            )
            results["mem"] = "-%"

        if len(render.keys()) > 1:
            results["clients"] = {}

            for key in render.keys():
                if key == "global" or not render[key] or not video[key]:
                    continue

                results["clients"][key] = (
                    f"{round(((sum(render[key]) / len(render[key])) + (sum(video[key]) / len(video[key]))) / 2, 2)}%"
                )

        return results


def get_openvino_npu_stats() -> Optional[dict[str, str]]:
    """Get NPU stats using openvino."""
    NPU_RUNTIME_PATH = "/sys/devices/pci0000:00/0000:00:0b.0/power/runtime_active_time"

    try:
        with open(NPU_RUNTIME_PATH, "r") as f:
            initial_runtime = float(f.read().strip())

        initial_time = time.time()

        # Sleep for 1 second to get an accurate reading
        time.sleep(1.0)

        # Read runtime value again
        with open(NPU_RUNTIME_PATH, "r") as f:
            current_runtime = float(f.read().strip())

        current_time = time.time()

        # Calculate usage percentage
        runtime_diff = current_runtime - initial_runtime
        time_diff = (current_time - initial_time) * 1000.0  # Convert to milliseconds

        if time_diff > 0:
            usage = min(100.0, max(0.0, (runtime_diff / time_diff * 100.0)))
        else:
            usage = 0.0

        return {"npu": f"{round(usage, 2)}", "mem": "-"}
    except (FileNotFoundError, PermissionError, ValueError):
        return None


def get_rockchip_gpu_stats() -> Optional[dict[str, str]]:
    """Get GPU stats using rk."""
    try:
        with open("/sys/kernel/debug/rkrga/load", "r") as f:
            content = f.read()
    except FileNotFoundError:
        return None

    load_values = []
    for line in content.splitlines():
        match = re.search(r"load = (\d+)%", line)
        if match:
            load_values.append(int(match.group(1)))

    if not load_values:
        return None

    average_load = f"{round(sum(load_values) / len(load_values), 2)}%"
    return {"gpu": average_load, "mem": "-"}


def get_rockchip_npu_stats() -> Optional[dict[str, float | str]]:
    """Get NPU stats using rk."""
    try:
        with open("/sys/kernel/debug/rknpu/load", "r") as f:
            npu_output = f.read()

            if "Core0:" in npu_output:
                # multi core NPU
                core_loads = re.findall(r"Core\d+:\s*(\d+)%", npu_output)
            else:
                # single core NPU
                core_loads = re.findall(r"NPU load:\s+(\d+)%", npu_output)
    except FileNotFoundError:
        core_loads = None

    if not core_loads:
        return None

    percentages = [int(load) for load in core_loads]
    mean = round(sum(percentages) / len(percentages), 2)
    return {"npu": mean, "mem": "-"}


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
    names: dict[str, int] = {}
    results = {}
    try:
        nvml.nvmlInit()
        deviceCount = nvml.nvmlDeviceGetCount()
        for i in range(deviceCount):
            handle = nvml.nvmlDeviceGetHandleByIndex(i)
            gpu_name = nvml.nvmlDeviceGetName(handle)

            # handle case where user has multiple of same GPU
            if gpu_name in names:
                names[gpu_name] += 1
                gpu_name += f" ({names.get(gpu_name)})"
            else:
                names[gpu_name] = 1

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
                "name": gpu_name,
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


def get_jetson_stats() -> Optional[dict[int, dict]]:
    results = {}

    try:
        results["mem"] = "-"  # no discrete gpu memory

        if os.path.exists("/sys/devices/gpu.0/load"):
            with open("/sys/devices/gpu.0/load", "r") as f:
                gpuload = float(f.readline()) / 10
                results["gpu"] = f"{gpuload}%"
        elif os.path.exists("/sys/devices/platform/gpu.0/load"):
            with open("/sys/devices/platform/gpu.0/load", "r") as f:
                gpuload = float(f.readline()) / 10
                results["gpu"] = f"{gpuload}%"
        else:
            results["gpu"] = "-"
    except Exception:
        return None

    return results


def ffprobe_stream(ffmpeg, path: str, detailed: bool = False) -> sp.CompletedProcess:
    """Run ffprobe on stream."""
    clean_path = escape_special_characters(path)

    # Base entries that are always included
    stream_entries = "codec_long_name,width,height,bit_rate,duration,display_aspect_ratio,avg_frame_rate"

    # Additional detailed entries
    if detailed:
        stream_entries += ",codec_name,profile,level,pix_fmt,channels,sample_rate,channel_layout,r_frame_rate"
        format_entries = "format_name,size,bit_rate,duration"
    else:
        format_entries = None

    ffprobe_cmd = [
        ffmpeg.ffprobe_path,
        "-timeout",
        "1000000",
        "-print_format",
        "json",
        "-show_entries",
        f"stream={stream_entries}",
    ]

    # Add format entries for detailed mode
    if detailed and format_entries:
        ffprobe_cmd.extend(["-show_entries", f"format={format_entries}"])

    ffprobe_cmd.extend(["-loglevel", "error", clean_path])

    return sp.run(ffprobe_cmd, capture_output=True)


def vainfo_hwaccel(device_name: Optional[str] = None) -> sp.CompletedProcess:
    """Run vainfo."""
    ffprobe_cmd = (
        ["vainfo"]
        if not device_name
        else ["vainfo", "--display", "drm", "--device", f"/dev/dri/{device_name}"]
    )
    return sp.run(ffprobe_cmd, capture_output=True)


def get_nvidia_driver_info() -> dict[str, Any]:
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
) -> dict[str, Any]:
    async def probe_with_ffprobe(
        url: str,
    ) -> tuple[bool, int, int, Optional[str], float]:
        """Fallback using ffprobe: returns (valid, width, height, codec, duration)."""
        cmd = [
            ffmpeg.ffprobe_path,
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            url,
        ]
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await proc.communicate()
            if proc.returncode != 0:
                return False, 0, 0, None, -1

            data = json.loads(stdout.decode())
            video_streams = [
                s for s in data.get("streams", []) if s.get("codec_type") == "video"
            ]
            if not video_streams:
                return False, 0, 0, None, -1

            v = video_streams[0]
            width = int(v.get("width", 0))
            height = int(v.get("height", 0))
            codec = v.get("codec_name")

            duration_str = data.get("format", {}).get("duration")
            duration = float(duration_str) if duration_str else -1.0

            return True, width, height, codec, duration
        except (json.JSONDecodeError, ValueError, KeyError, asyncio.SubprocessError):
            return False, 0, 0, None, -1

    def probe_with_cv2(url: str) -> tuple[bool, int, int, Optional[str], float]:
        """Primary attempt using cv2: returns (valid, width, height, fourcc, duration)."""
        cap = cv2.VideoCapture(url)
        if not cap.isOpened():
            cap.release()
            return False, 0, 0, None, -1

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        valid = width > 0 and height > 0
        fourcc = None
        duration = -1.0

        if valid:
            fourcc_int = int(cap.get(cv2.CAP_PROP_FOURCC))
            fourcc = fourcc_int.to_bytes(4, "little").decode("latin-1").strip()

            if get_duration:
                fps = cap.get(cv2.CAP_PROP_FPS)
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                if fps > 0 and total_frames > 0:
                    duration = total_frames / fps

        cap.release()
        return valid, width, height, fourcc, duration

    # try cv2 first
    has_video, width, height, fourcc, duration = probe_with_cv2(url)

    # fallback to ffprobe if needed
    if not has_video or (get_duration and duration < 0):
        has_video, width, height, fourcc, duration = await probe_with_ffprobe(url)

    result: dict[str, Any] = {"has_valid_video": has_video}
    if has_video:
        result.update({"width": width, "height": height})
        if fourcc:
            result["fourcc"] = fourcc
    if get_duration:
        result["duration"] = duration

    return result


def process_logs(
    contents: str,
    service: Optional[str] = None,
    start: Optional[int] = None,
    end: Optional[int] = None,
) -> Tuple[int, List[str]]:
    log_lines = []
    last_message = None
    last_timestamp = None
    repeat_count = 0

    for raw_line in contents.splitlines():
        clean_line = raw_line.strip()

        if len(clean_line) < 10:
            continue

        # Handle cases where S6 does not include date in log line
        if "  " not in clean_line:
            clean_line = f"{datetime.now()}  {clean_line}"

        try:
            # Find the position of the first double space to extract timestamp and message
            date_end = clean_line.index("  ")
            timestamp = clean_line[:date_end]
            full_message = clean_line[date_end:].strip()

            # For frigate, remove the date part from message comparison
            if service == "frigate":
                # Skip the date at the start of the message if it exists
                date_parts = full_message.split("]", 1)
                if len(date_parts) > 1:
                    message_part = date_parts[1].strip()
                else:
                    message_part = full_message
            else:
                message_part = full_message

            if message_part == last_message:
                repeat_count += 1
                continue
            else:
                if repeat_count > 0:
                    # Insert a deduplication message formatted the same way as logs
                    dedup_message = f"{last_timestamp}  [LOGGING] Last message repeated {repeat_count} times"
                    log_lines.append(dedup_message)
                    repeat_count = 0

                log_lines.append(clean_line)
                last_timestamp = timestamp

                last_message = message_part

        except ValueError:
            # If we can't parse the line properly, just add it as is
            log_lines.append(clean_line)
            continue

    # If there were repeated messages at the end, log the count
    if repeat_count > 0:
        dedup_message = (
            f"{last_timestamp}  [LOGGING] Last message repeated {repeat_count} times"
        )
        log_lines.append(dedup_message)

    return len(log_lines), log_lines[start:end]


def set_file_limit() -> None:
    # Newer versions of containerd 2.X+ impose a very low soft file limit of 1024
    # This applies to OSs like HA OS (see https://github.com/home-assistant/operating-system/issues/4110)
    # Attempt to increase this limit
    soft_limit = int(os.getenv("SOFT_FILE_LIMIT", "65536") or "65536")

    current_soft, current_hard = resource.getrlimit(resource.RLIMIT_NOFILE)
    logger.debug(f"Current file limits - Soft: {current_soft}, Hard: {current_hard}")

    new_soft = min(soft_limit, current_hard)
    resource.setrlimit(resource.RLIMIT_NOFILE, (new_soft, current_hard))
    logger.debug(
        f"File limit set. New soft limit: {new_soft}, Hard limit remains: {current_hard}"
    )


def get_fs_type(path: str) -> str:
    bestMatch = ""
    fsType = ""
    for part in psutil.disk_partitions(all=True):
        if path.startswith(part.mountpoint) and len(bestMatch) < len(part.mountpoint):
            fsType = part.fstype
            bestMatch = part.mountpoint
    return fsType


def calculate_shm_requirements(config) -> dict:
    try:
        storage_stats = shutil.disk_usage("/dev/shm")
    except (FileNotFoundError, OSError):
        return {}

    total_mb = round(storage_stats.total / pow(2, 20), 1)
    used_mb = round(storage_stats.used / pow(2, 20), 1)
    free_mb = round(storage_stats.free / pow(2, 20), 1)

    # required for log files + nginx cache
    min_req_shm = 40 + 10

    if config.birdseye.restream:
        min_req_shm += 8

    available_shm = total_mb - min_req_shm
    cam_total_frame_size = 0.0

    for camera in config.cameras.values():
        if camera.enabled_in_config and camera.detect.width and camera.detect.height:
            cam_total_frame_size += round(
                (camera.detect.width * camera.detect.height * 1.5 + 270480) / 1048576,
                1,
            )

    # leave room for 2 cameras that are added dynamically, if a user wants to add more cameras they may need to increase the SHM size and restart after adding them.
    cam_total_frame_size += 2 * round(
        (1280 * 720 * 1.5 + 270480) / 1048576,
        1,
    )

    shm_frame_count = min(
        int(os.environ.get(SHM_FRAMES_VAR, "50")),
        int(available_shm / cam_total_frame_size),
    )

    # minimum required shm recommendation
    min_shm = round(min_req_shm + cam_total_frame_size * 20)

    return {
        "total": total_mb,
        "used": used_mb,
        "free": free_mb,
        "mount_type": get_fs_type("/dev/shm"),
        "available": round(available_shm, 1),
        "camera_frame_size": cam_total_frame_size,
        "shm_frame_count": shm_frame_count,
        "min_shm": min_shm,
    }
