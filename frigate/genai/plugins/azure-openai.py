"""Azure OpenAI Provider for Frigate AI.

Azure OpenAI exposes the same chat completions API as OpenAI once the
client is constructed, so this provider inherits all transport, streaming,
reasoning, and tool-calling logic from :class:`OpenAIClient` and only
overrides what is genuinely Azure-specific:

- Client construction: parses ``api-version`` out of the configured
  ``base_url`` query string and instantiates :class:`openai.AzureOpenAI`
  with ``azure_endpoint`` instead of ``base_url``. Raises if the URL is
  malformed; :class:`GenAIClientManager` catches the exception and
  disables the provider.
- Context size: Azure does not expose a per-model ``max_model_len`` field
  reliably, so we keep the historical 128K default rather than the
  model-name heuristic used by OpenAI.
"""

import logging
from urllib.parse import parse_qs, urlparse

from openai import AzureOpenAI

from frigate.config import GenAIProviderEnum
from frigate.genai import register_genai_provider
from frigate.genai.plugins.openai import OpenAIClient

logger = logging.getLogger(__name__)


@register_genai_provider(GenAIProviderEnum.azure_openai)
class AzureOpenAIClient(OpenAIClient):
    """Generative AI client for Frigate using Azure OpenAI."""

    def _init_provider(self) -> AzureOpenAI:
        """Initialize the AzureOpenAI client from the configured base_url."""
        parsed_url = urlparse(self.genai_config.base_url or "")
        query_params = parse_qs(parsed_url.query)
        api_version = query_params.get("api-version", [None])[0]

        if not api_version:
            raise ValueError("Azure OpenAI base_url is missing api-version.")

        azure_endpoint = f"{parsed_url.scheme}://{parsed_url.netloc}/"

        return AzureOpenAI(
            api_key=self.genai_config.api_key,
            api_version=api_version,
            azure_endpoint=azure_endpoint,
        )

    def get_context_size(self) -> int:
        """Azure does not reliably surface per-model context size; use 128K."""
        return 128000
