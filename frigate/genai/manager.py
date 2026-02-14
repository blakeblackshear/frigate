"""GenAI client manager for Frigate.

Manages GenAI provider clients from Frigate config. Configuration is read only
in _update_config(); no other code should read config.genai. Exposes clients
by role: tool_client, vision_client, embeddings_client.
"""

import logging
from typing import TYPE_CHECKING, Optional

from frigate.config import FrigateConfig
from frigate.config.camera.genai import GenAIRoleEnum

if TYPE_CHECKING:
    from frigate.genai import GenAIClient

logger = logging.getLogger(__name__)


class GenAIClientManager:
    """Manages GenAI provider clients from Frigate config."""

    def __init__(self, config: FrigateConfig) -> None:
        self._config = config
        self._tool_client: Optional[GenAIClient] = None
        self._vision_client: Optional[GenAIClient] = None
        self._embeddings_client: Optional[GenAIClient] = None
        self._update_config()

    def _update_config(self) -> None:
        """Build role clients from current Frigate config.genai.

        Called from __init__ and can be called again when config is reloaded.
        Each role (tools, vision, embeddings) gets the client for the provider
        that has that role in its roles list.
        """
        from frigate.genai import PROVIDERS, load_providers

        self._tool_client = None
        self._vision_client = None
        self._embeddings_client = None

        if not self._config.genai:
            return

        load_providers()

        for _name, genai_cfg in self._config.genai.items():
            if not genai_cfg.provider:
                continue
            provider_cls = PROVIDERS.get(genai_cfg.provider)
            if not provider_cls:
                logger.warning(
                    "Unknown GenAI provider %s in config, skipping.",
                    genai_cfg.provider,
                )
                continue
            try:
                client = provider_cls(genai_cfg)
            except Exception as e:
                logger.exception(
                    "Failed to create GenAI client for provider %s: %s",
                    genai_cfg.provider,
                    e,
                )
                continue

            for role in genai_cfg.roles:
                if role == GenAIRoleEnum.tools:
                    self._tool_client = client
                elif role == GenAIRoleEnum.vision:
                    self._vision_client = client
                elif role == GenAIRoleEnum.embeddings:
                    self._embeddings_client = client

    @property
    def tool_client(self) -> "Optional[GenAIClient]":
        """Client configured for the tools role (e.g. chat with function calling)."""
        return self._tool_client

    @property
    def vision_client(self) -> "Optional[GenAIClient]":
        """Client configured for the vision role (e.g. review descriptions, object descriptions)."""
        return self._vision_client

    @property
    def embeddings_client(self) -> "Optional[GenAIClient]":
        """Client configured for the embeddings role."""
        return self._embeddings_client
