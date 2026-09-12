"""Helpers for building filesystem paths out of user supplied values."""

import os

from pathvalidate import ValidationError, sanitize_filename, sanitize_filepath

from frigate.const import TRIGGER_DIR

# Components that name a directory relative to its parent instead of a child.
# pathvalidate strips separators and reserved characters but leaves these
# intact, and it collapses values like "..:" down to "..", so they have to be
# rejected after sanitizing rather than before.
RELATIVE_COMPONENTS = {"", ".", ".."}


def sanitize_path_component(value: str | None) -> str | None:
    """Reduce a user supplied value to a single path component.

    Args:
        value: The untrusted value, such as a path parameter or body field

    Returns:
        A component that is safe to join onto a base directory, or None when
        nothing usable remains so the caller can reject the request.
    """
    if not value:
        return None

    try:
        component = sanitize_filename(value)
    except (ValidationError, ValueError):
        return None

    if component.strip() in RELATIVE_COMPONENTS:
        return None

    if os.sep in component or (os.altsep and os.altsep in component):
        return None

    return component


def is_contained_in(path: str, base: str) -> bool:
    """Check that a path sits inside a base directory.

    Compares whole path components, so a sibling directory that merely shares a
    name prefix with base is not treated as contained.
    """
    resolved = os.path.normpath(path)
    root = os.path.normpath(base)

    try:
        # commonpath compares components, and unlike a prefix test it stays
        # correct for a base that already ends in a separator such as "/".
        return os.path.commonpath([resolved, root]) == root
    except ValueError:
        # Raised when the paths cannot be compared, such as one relative and
        # one absolute, or two different Windows drives.
        return False


def safe_join(base: str, *parts: str | None) -> str | None:
    """Join user supplied parts beneath a trusted base directory.

    Args:
        base: Trusted base directory the result must stay inside of
        parts: Untrusted values, each becoming one path component

    Returns:
        The joined path, or None if any part is unusable or the result would
        land outside base.
    """
    components: list[str] = []

    for part in parts:
        component = sanitize_path_component(part)

        if component is None:
            return None

        components.append(component)

    resolved = os.path.normpath(os.path.join(base, *components))

    # normpath rather than realpath so symlinked media roots keep working; the
    # per component checks above are what actually prevent traversal.
    if not is_contained_in(resolved, base):
        return None

    return resolved


def sanitize_contained_path(path: str | None, base: str) -> str | None:
    """Validate a whole user supplied path that must already sit under base.

    Unlike safe_join this keeps the directory structure the caller sent, so it
    suits values that name an existing file rather than one component.

    Args:
        path: The untrusted path
        base: Directory the path has to stay inside of

    Returns:
        The sanitized path, or None if it is unusable or escapes base.
    """
    if not path:
        return None

    # sanitize_filepath normalizes "\" to "/" but leaves ".." intact, so a path
    # like "clips\..\..\etc/passwd" would pass the containment check yet still
    # escape once resolved. A valid path here never uses "..".
    if ".." in path:
        return None

    sanitized = sanitize_filepath(path)

    if not is_contained_in(sanitized, base):
        return None

    return sanitized


def get_trigger_thumbnail_path(camera_name: str, data: str) -> str | None:
    """Path of the thumbnail stored for a semantic search trigger.

    Args:
        camera_name: Camera the trigger belongs to
        data: The trigger's data value, which is free-form text supplied by the
            client and persisted verbatim

    Returns:
        The thumbnail path, or None if it cannot be built safely.
    """
    return safe_join(TRIGGER_DIR, camera_name, f"{data}.webp")
