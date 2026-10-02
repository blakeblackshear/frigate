"""Environment variable and secrets handling for the Frigate config."""

import logging
import os
import re
from collections.abc import Mapping
from pathlib import Path
from typing import Annotated, Any

from pydantic import AfterValidator, ValidationInfo
from ruamel.yaml import YAML, YAMLError

from frigate.const import CONFIG_DIR

logger = logging.getLogger(__name__)


class UnknownVariableError(ValueError):
    """Undefined {FRIGATE_*} placeholder. ValueError so pydantic names the field."""


# Substitution sources, lowest precedence first.
_CONFIG_ENV_VARS: dict[str, str] = {}
_SECRETS_FILE: dict[str, str] = {}
# Snapshot: apply_config_env_vars() writes os.environ after import.
_CONTAINER_ENV: dict[str, str] = {
    k: v for k, v in os.environ.items() if k.startswith("FRIGATE_")
}
_CREDENTIALS_DIR: dict[str, str] = {}

_SOURCES: tuple[tuple[str, dict[str, str]], ...] = (
    ("environment_vars config block", _CONFIG_ENV_VARS),
    ("secrets.yaml", _SECRETS_FILE),
    ("container environment", _CONTAINER_ENV),
    ("credentials directory", _CREDENTIALS_DIR),
)

FRIGATE_ENV_VARS: dict[str, str] = {}

_WARNED_COLLISIONS: set[str] = set()


def _rebuild(warn: bool = True) -> None:
    """Merge the sources into FRIGATE_ENV_VARS.

    warn=False is for the import-time call, before logging is configured.
    """
    merged: dict[str, str] = {}
    origin: dict[str, str] = {}
    duplicated: set[str] = set()

    for label, source in _SOURCES:
        for key, value in source.items():
            if key in merged and merged[key] != value:
                duplicated.add(key)

            merged[key] = value
            origin[key] = label

    if warn:
        for key in sorted(duplicated - _WARNED_COLLISIONS):
            _WARNED_COLLISIONS.add(key)
            logger.warning(
                "%s is defined in more than one place, using the value from %s",
                key,
                origin[key],
            )

    # In place: tests hold a reference to this dict.
    FRIGATE_ENV_VARS.clear()
    FRIGATE_ENV_VARS.update(merged)


def _load_credentials_dir() -> dict[str, str]:
    """Read FRIGATE_* files from the Docker or systemd credentials directory."""
    directory = os.environ.get("CREDENTIALS_DIRECTORY", "/run/secrets")
    values: dict[str, str] = {}

    if not (os.path.isdir(directory) and os.access(directory, os.R_OK)):
        return values

    for name in os.listdir(directory):
        if not name.startswith("FRIGATE_"):
            continue

        try:
            values[name] = Path(os.path.join(directory, name)).read_text().strip()
        except (OSError, UnicodeDecodeError):
            logger.warning("Unable to read %s in %s, skipping", name, directory)

    return values


def _secrets_file_path() -> str | None:
    """Locate secrets.yaml next to the config file."""
    config_file = os.environ.get("CONFIG_FILE")
    config_dir = os.path.dirname(config_file) if config_file else CONFIG_DIR

    for name in ("secrets.yaml", "secrets.yml"):
        path = os.path.join(config_dir, name)

        if os.path.isfile(path):
            return path

    return None


def _load_secrets_file() -> dict[str, str]:
    """Read the flat FRIGATE_* map from secrets.yaml, if it exists."""
    path = _secrets_file_path()

    if path is None:
        return {}

    try:
        with open(path) as f:
            raw: Any = YAML(typ="safe").load(f)
    except OSError as err:
        raise ValueError(f"Unable to read {path}: {err.strerror}") from err
    except YAMLError as err:
        # The parser message can quote values, so only name a position.
        mark = getattr(err, "problem_mark", None)
        where = f" near line {mark.line + 1}" if mark is not None else ""
        raise ValueError(f"{path} is not valid YAML{where}") from err

    if raw is None:
        return {}

    if not isinstance(raw, dict):
        raise ValueError(f"{path} must be a flat map of names to values")

    values: dict[str, str] = {}

    for key, value in raw.items():
        name = str(key)

        if isinstance(value, (dict, list)):
            raise ValueError(f"{path} value for {name} must be a single value")

        if not name.startswith("FRIGATE_"):
            logger.warning(
                "Ignoring %s in %s, names must start with FRIGATE_", name, path
            )
            continue

        values[name] = "" if value is None else str(value)

    return values


def reload_sources(warn: bool = True) -> None:
    """Re-read the file backed sources and rebuild the namespace."""
    _CREDENTIALS_DIR.clear()
    _CREDENTIALS_DIR.update(_load_credentials_dir())

    try:
        secrets = _load_secrets_file()
    except ValueError as err:
        # Keep the last good values; this runs at import and on every parse.
        logger.error("Ignoring secrets file, %s", err)
    else:
        _SECRETS_FILE.clear()
        _SECRETS_FILE.update(secrets)

    _rebuild(warn)


def apply_config_env_vars(values: Mapping[str, object]) -> None:
    """Install the environment_vars block as the lowest priority source.

    Unprefixed keys only set os.environ.
    """
    for key, value in values.items():
        resolved = str(value)

        if key.startswith("FRIGATE_"):
            _CONFIG_ENV_VARS[key] = resolved
        else:
            os.environ[key] = resolved

    _rebuild()

    # Export the winning value; auth reads FRIGATE_JWT_SECRET from os.environ.
    for key in values:
        if key.startswith("FRIGATE_"):
            os.environ[key] = FRIGATE_ENV_VARS[key]


reload_sources(warn=False)


# Matches a FRIGATE_* identifier following an opening brace.
_FRIGATE_IDENT_RE = re.compile(r"FRIGATE_[A-Za-z0-9_]+")


def substitute_frigate_vars(value: str) -> str:
    """Substitute `{FRIGATE_*}` placeholders in *value*.

    Reproduces the subset of `str.format()` brace semantics that Frigate's
    config has historically supported, while leaving unrelated brace content
    (e.g. ffmpeg `%{localtime\\:...}` expressions) untouched:

    * `{{` and `}}` collapse to literal `{` / `}` (the documented escape).
    * `{FRIGATE_NAME}` is replaced from `FRIGATE_ENV_VARS`; an unknown name
      raises `UnknownVariableError` to preserve the existing "Invalid
      substitution" error path.
    * A `{` that begins `{FRIGATE_` but is not a well-formed
      `{FRIGATE_NAME}` placeholder raises `ValueError` (malformed
      placeholder). Callers that catch `UnknownVariableError` to allow
      unknown-var passthrough will still surface malformed syntax as an
      error.
    * Any other `{` or `}` is treated as a literal and passed through.
    """
    out: list[str] = []
    i = 0
    n = len(value)
    while i < n:
        ch = value[i]
        if ch == "{":
            # Escaped literal `{{`.
            if i + 1 < n and value[i + 1] == "{":
                out.append("{")
                i += 2
                continue
            # Possible `{FRIGATE_*}` placeholder.
            if value.startswith("{FRIGATE_", i):
                ident_match = _FRIGATE_IDENT_RE.match(value, i + 1)
                if (
                    ident_match is not None
                    and ident_match.end() < n
                    and value[ident_match.end()] == "}"
                ):
                    key = ident_match.group(0)
                    if key not in FRIGATE_ENV_VARS:
                        raise UnknownVariableError(
                            f"{key} is not defined in the environment, "
                            "secrets.yaml, or the environment_vars config"
                        )
                    out.append(FRIGATE_ENV_VARS[key])
                    i = ident_match.end() + 1
                    continue
                # Looks like a FRIGATE placeholder but is malformed
                # (no closing brace, illegal char, format spec, etc.).
                raise ValueError(
                    f"Malformed FRIGATE_ placeholder near {value[i : i + 32]!r}"
                )
            # Plain `{` — pass through (e.g. `%{localtime\:...}`).
            out.append("{")
            i += 1
            continue
        if ch == "}":
            # Escaped literal `}}`.
            if i + 1 < n and value[i + 1] == "}":
                out.append("}")
                i += 2
                continue
            out.append("}")
            i += 1
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def validate_env_string(v: str) -> str:
    return substitute_frigate_vars(v)


EnvString = Annotated[str, AfterValidator(validate_env_string)]


def validate_env_vars(v: dict[str, str], info: ValidationInfo) -> dict[str, str]:
    if isinstance(info.context, dict) and info.context.get("install", False):
        apply_config_env_vars(v)

    return v


EnvVars = Annotated[dict[str, str], AfterValidator(validate_env_vars)]
