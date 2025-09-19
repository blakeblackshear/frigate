import os
from pathlib import Path
from typing import Annotated

from pydantic import AfterValidator, ValidationInfo

FRIGATE_ENV_VARS = {k: v for k, v in os.environ.items() if k.startswith("FRIGATE_")}
secrets_dir = os.environ.get("CREDENTIALS_DIRECTORY", "/run/secrets")
# read secret files as env vars too
if os.path.isdir(secrets_dir) and os.access(secrets_dir, os.R_OK):
    for secret_file in os.listdir(secrets_dir):
        if secret_file.startswith("FRIGATE_"):
            FRIGATE_ENV_VARS[secret_file] = (
                Path(os.path.join(secrets_dir, secret_file)).read_text().strip()
            )


def validate_env_string(v: str) -> str:
    return v.format(**FRIGATE_ENV_VARS)


EnvString = Annotated[str, AfterValidator(validate_env_string)]


def validate_env_vars(v: dict[str, str], info: ValidationInfo) -> dict[str, str]:
    if isinstance(info.context, dict) and info.context.get("install", False):
        for k, v in v.items():
            os.environ[k] = v

    return v


EnvVars = Annotated[dict[str, str], AfterValidator(validate_env_vars)]
