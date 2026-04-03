"""GenAI client manager for Frigate.

Manages GenAI provider clients from Frigate config. Configuration is read only
in _update_config(); no other code should read config.genai. Exposes clients
by role: chat_client, description_client, embeddings_client.
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
        self._chat_client: Optional[GenAIClient] = None
        self._description_client: Optional[GenAIClient] = None
        self._embeddings_client: Optional[GenAIClient] = None
        self._clients: dict[str, "GenAIClient"] = {}
        self.update_config(config)

    def update_config(self, config: FrigateConfig) -> None:
        """Build role clients from current Frigate config.genai.

        Called from __init__ and can be called again when config is reloaded.
        Each role (chat, descriptions, embeddings) gets the client for the
        provider that has that role in its roles list.
        """
        from frigate.genai import PROVIDERS, load_providers

        self._chat_client = None
        self._description_client = None
        self._embeddings_client = None
        self._clients = {}

        if not config.genai:
            return

        load_providers()

        for _name, genai_cfg in config.genai.items():
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

            self._clients[_name] = client

            for role in genai_cfg.roles:
                if role == GenAIRoleEnum.chat:
                    self._chat_client = client
                elif role == GenAIRoleEnum.descriptions:
                    self._description_client = client
                elif role == GenAIRoleEnum.embeddings:
                    self._embeddings_client = client

    @property
    def chat_client(self) -> "Optional[GenAIClient]":
        """Client configured for the chat role (e.g. chat with function calling)."""
        return self._chat_client

    @property
    def description_client(self) -> "Optional[GenAIClient]":
        """Client configured for the descriptions role (e.g. review descriptions, object descriptions)."""
        return self._description_client

    @property
    def embeddings_client(self) -> "Optional[GenAIClient]":
        """Client configured for the embeddings role."""
        return self._embeddings_client

    def list_models(self) -> dict[str, list[str]]:
        """Return available models keyed by config entry name."""
        return {name: client.list_models() for name, client in self._clients.items()}
