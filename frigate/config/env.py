import os
from pathlib import Path
from typing import Annotated

from pydantic import AfterValidator, ValidationInfo

FRIGATE_ENV_VARS = {k: v for k, v in os.environ.items() if k.startswith("FRIGATE_")}
# read docker secret files as env vars too
if os.path.isdir("/run/secrets") and os.access("/run/secrets", os.R_OK):
    for secret_file in os.listdir("/run/secrets"):
        if secret_file.startswith("FRIGATE_"):
            FRIGATE_ENV_VARS[secret_file] = (
                Path(os.path.join("/run/secrets", secret_file)).read_text().strip()
            )


def validate_env_string(v: str) -> str:
    return v.format(**FRIGATE_ENV_VARS)


EnvString = Annotated[str, AfterValidator(validate_env_string)]


def validate_env_vars(v: dict[str, str], info: ValidationInfo) -> dict[str, str]:
    if isinstance(info.context, dict) and info.context.get("install", False):
        for k, v in v:
            os.environ[k] = v

    return v


EnvVars = Annotated[dict[str, str], AfterValidator(validate_env_vars)]
