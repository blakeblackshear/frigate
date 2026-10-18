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

Transcription is inherited too: :class:`openai.AzureOpenAI` exposes the same
``audio.transcriptions.create``. Two Azure-specific caveats apply when using
the ``transcribe`` role:

- ``model`` must be the Azure *deployment* name, not the underlying model name.
- The ``api-version`` parsed from ``base_url`` must be 2024-06-01 or later;
  earlier versions have no transcriptions route and the 404 surfaces only as a
  generic provider error.
- Because ``model`` is a deployment name, the inherited check that picks
  ``languages`` over ``language`` for gpt-transcribe cannot fire unless the
  deployment happens to be named after the model. Name the deployment
  ``gpt-transcribe`` to get the right field, or leave the language on ``auto``.
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
