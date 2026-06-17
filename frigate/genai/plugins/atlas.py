"""Atlas Cloud Provider for Frigate AI.

Atlas Cloud (https://www.atlascloud.ai) is an OpenAI-compatible inference
platform that serves a range of vision-capable models. Because its chat
completions API follows the OpenAI standard, this provider inherits all
transport, vision, streaming, reasoning, and tool-calling logic from
:class:`OpenAIClient` and only overrides what is Atlas-specific:

- Client construction: defaults ``base_url`` to the Atlas Cloud endpoint
  when the user has not set one explicitly, so a minimal config (provider +
  api_key + model) works out of the box. A user-supplied ``base_url`` still
  takes precedence.
- Context size: the Atlas ``/models`` endpoint does not reliably surface a
  per-model context window, so we fall back to a conservative default rather
  than the model-name heuristic used by OpenAI. It can be overridden via
  ``provider_options.context_size``.
"""

import logging
from typing import Optional

from openai import OpenAI

from frigate.config import GenAIProviderEnum
from frigate.genai import register_genai_provider
from frigate.genai.plugins.openai import OpenAIClient

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://api.atlascloud.ai/v1"

# Atlas serves large-context models, but its model listing does not expose a
# per-model context window; default conservatively and let users override via
# provider_options.context_size when they know their model's window.
DEFAULT_CONTEXT_SIZE = 32000


@register_genai_provider(GenAIProviderEnum.atlas)
class AtlasClient(OpenAIClient):
    """Generative AI client for Frigate using Atlas Cloud."""

    def _init_provider(self) -> OpenAI:
        """Initialize the OpenAI client pointed at Atlas Cloud.

        Defaults ``base_url`` to the Atlas endpoint when the user has not set
        one, then defers to the OpenAI implementation for everything else.
        """
        if not self.genai_config.base_url:
            self.genai_config.base_url = DEFAULT_BASE_URL

        return super()._init_provider()

    def get_context_size(self) -> int:
        """Return the context window for Atlas models.

        A manually specified ``context_size`` in ``provider_options`` always
        wins; otherwise fall back to a conservative default since Atlas does
        not reliably surface per-model context windows.
        """
        if self.context_size is not None:
            return self.context_size

        provider_context_size: Optional[int] = self.genai_config.provider_options.get(
            "context_size"
        )
        if provider_context_size is not None:
            self.context_size = provider_context_size
            return self.context_size

        self.context_size = DEFAULT_CONTEXT_SIZE
        return self.context_size
