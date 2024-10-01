"""ChromaDB embeddings database."""

import json

from frigate.const import CONFIG_DIR

from .embeddings import Embeddings
from .util import ZScoreNormalization


class EmbeddingsContext:
    def __init__(self):
        self.embeddings = Embeddings()
        self.thumb_stats = ZScoreNormalization()
        self.desc_stats = ZScoreNormalization()

        # load stats from disk
        try:
            with open(f"{CONFIG_DIR}/.search_stats.json", "r") as f:
                data = json.loads(f.read())
                self.thumb_stats.from_dict(data["thumb_stats"])
                self.desc_stats.from_dict(data["desc_stats"])
        except FileNotFoundError:
            pass

    def save_stats(self):
        """Write the stats to disk as JSON on exit."""
        contents = {
            "thumb_stats": self.thumb_stats.to_dict(),
            "desc_stats": self.desc_stats.to_dict(),
        }
        with open(f"{CONFIG_DIR}/.search_stats.json", "w") as f:
            f.write(json.dumps(contents))
