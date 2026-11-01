"""Shared handle on the config object that is current for this instance."""

from .config import FrigateConfig

__all__ = ["ConfigHolder"]


class ConfigHolder:
    """Indirection for the most recently parsed config.

    /api/config/set re-parses yaml into a brand new FrigateConfig instead of
    mutating the old one, so any reference captured during startup goes stale
    the first time a user saves. Anything that has to build something after
    startup, most importantly the watchdog factories that rebuild a crashed
    process, must read through a holder rather than close over a config
    object, or the rebuilt process comes back with the config as it was at
    boot and silently discards every change made since.

    There is deliberately no setter on the read side: the swap runs in exactly
    one place (frigate.api.config_util.swap_runtime_config) and everyone else
    only reads.
    """

    def __init__(self, config: FrigateConfig) -> None:
        self._config = config

    @property
    def config(self) -> FrigateConfig:
        """The config as of the most recent successful save."""
        return self._config

    def set(self, config: FrigateConfig) -> None:
        """Install a freshly parsed config as the current one."""
        self._config = config
