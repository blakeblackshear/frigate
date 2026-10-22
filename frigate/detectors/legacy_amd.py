import logging
import os
import subprocess

logger = logging.getLogger(__name__)


def detect_amd_gfx_id():
    return subprocess.getoutput(
        "unset HSA_OVERRIDE_GFX_VERSION && /opt/rocm/bin/rocminfo 2>/dev/null | grep gfx | head -1 | awk '{print $2}'"
    )


def apply_amd_compatibility_env_vars():
    gfx_id = detect_amd_gfx_id()
    if not gfx_id:
        return

    logger.info(f"Setting AMD environment variables for {gfx_id} compatibility...")

    configs = {
        ("gfx902", "gfx909", "gfx90c"): {
            "HSA_ENABLE_SDMA": "0",  # Disable System Direct Memory Access for APU compatibility
            "HSA_OVERRIDE_GFX_VERSION": "9.0.0",  # Force compatible GFX version
            "MIGRAPHX_DISABLE_MIOPEN_FUSION": "1",  # Disable unsupported fusion optimization
        }
    }
    for gfx_ids, vars in configs.items():
        if gfx_id in gfx_ids:
            for var, value in vars.items():
                if (
                    var == "HSA_OVERRIDE_GFX_VERSION"
                    and gfx_id == "gfx90c"
                    and os.environ.get("FRIGATE_ROCM_NATIVE_GFX90C") == "1"
                ):
                    continue
                if var not in os.environ:
                    os.environ[var] = value
                    logger.info(f'  - "{var}={value}"')
