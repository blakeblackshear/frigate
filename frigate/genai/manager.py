"""GenAI client manager for Frigate.

Manages GenAI provider clients and supports multiple providers. Configuration
is driven by FrigateConfig; _update_config is called on init and can be
called again when config is reloaded.
"""

import logging

from frigate.config import FrigateConfig

logger = logging.getLogger(__name__)


class GenAIClientManager:
    """Manages GenAI provider clients from Frigate config."""

    def __init__(self, config: FrigateConfig) -> None:
        self._config = config
        self._update_config()

    def _update_config(self) -> None:
        """Update internal state from the current Frigate config.

        Called from __init__ and can be called again when config is reloaded
        to support multiple providers or config changes.
        """
        # Placeholder for multi-provider setup; will be extended in later refactor steps.
        pass
