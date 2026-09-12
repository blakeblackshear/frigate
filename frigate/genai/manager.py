"""GenAI client manager for Frigate.

Manages GenAI provider clients from Frigate config. Clients are created lazily
on first access so that providers whose roles are never used (e.g. chat when
no chat feature is active) are never initialized.
"""

import logging
from typing import TYPE_CHECKING, Any

from frigate.config import FrigateConfig
from frigate.config.camera.genai import GenAIConfig, GenAIRoleEnum

if TYPE_CHECKING:
    from frigate.genai import GenAIClient

logger = logging.getLogger(__name__)


class GenAIClientManager:
    """Manages GenAI provider clients from Frigate config."""

    def __init__(self, config: FrigateConfig) -> None:
        self._configs: dict[str, GenAIConfig] = {}
        self._role_map: dict[GenAIRoleEnum, str] = {}
        self._clients: dict[str, GenAIClient] = {}
        self.update_config(config)

    def update_config(self, config: FrigateConfig) -> None:
        """Store provider configs and build the role→name mapping.

        Called from __init__ and can be called again when config is reloaded.
        Clients are not created here; they are instantiated lazily on first
        access via a role property or list_models().
        """
        from frigate.genai import PROVIDERS, load_providers

        self._configs = {}
        self._role_map = {}
        self._clients = {}

        if not config.genai:
            return

        load_providers()

        for name, genai_cfg in config.genai.items():
            if not genai_cfg.provider:
                continue
            if genai_cfg.provider not in PROVIDERS:
                logger.warning(
                    "Unknown GenAI provider %s in config, skipping.",
                    genai_cfg.provider,
                )
                continue

            self._configs[name] = genai_cfg

            for role in genai_cfg.roles:
                self._role_map[role] = name

    def _get_client(self, name: str) -> "GenAIClient | None":
        """Return the client for *name*, creating it on first access."""
        if name in self._clients:
            client = self._clients[name]
            client.ensure_provider()
            return client

        from frigate.genai import PROVIDERS

        genai_cfg = self._configs.get(name)
        if not genai_cfg:
            return None

        if not genai_cfg.provider:
            return None

        provider_cls = PROVIDERS.get(genai_cfg.provider)
        if not provider_cls:
            return None

        try:
            client = provider_cls(genai_cfg)
        except Exception as e:
            logger.exception(
                "Failed to create GenAI client for provider %s: %s",
                genai_cfg.provider,
                e,
            )
            return None

        self._clients[name] = client
        return client

    @property
    def chat_client(self) -> "GenAIClient | None":
        """Client configured for the chat role (e.g. chat with function calling)."""
        name = self._role_map.get(GenAIRoleEnum.chat)
        return self._get_client(name) if name else None

    @property
    def description_client(self) -> "GenAIClient | None":
        """Client configured for the descriptions role (e.g. review descriptions, object descriptions)."""
        name = self._role_map.get(GenAIRoleEnum.descriptions)
        return self._get_client(name) if name else None

    @property
    def embeddings_client(self) -> "GenAIClient | None":
        """Client configured for the embeddings role."""
        name = self._role_map.get(GenAIRoleEnum.embeddings)
        return self._get_client(name) if name else None

    def list_models(self) -> dict[str, dict[str, Any]]:
        """Return per-entry model lists and capabilities, keyed by config entry name."""
        result: dict[str, dict[str, Any]] = {}
        for name, genai_cfg in self._configs.items():
            client = self._get_client(name)
            if not client:
                continue
            result[name] = {
                "models": client.list_models(),
                "roles": [r.value for r in genai_cfg.roles],
                "supports_toggleable_thinking": client.supports_toggleable_thinking,
                "supports_embeddings": client.supports_embeddings,
            }
        return result
