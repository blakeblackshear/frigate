import threading
import unittest
from unittest.mock import MagicMock, patch, ANY
import numpy as np
from frigate.config import FrigateConfig
from frigate.embeddings.maintainer import EmbeddingMaintainer

class TestEmbeddingMaintainer(unittest.TestCase):
    def setUp(self):
        self.config_data = {
            "mqtt": {"host": "mqtt"},
            "database": {"path": ":memory:"},
            "semantic_search": {
                "enabled": True,
                "model": "jinav1",
                "reindex": False,
            },
            "cameras": {
                "test_cam": {
                    "ffmpeg": {
                        "inputs": [{"path": "rtsp://127.0.0.1:554/video", "roles": ["detect"]}]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                    "semantic_search": {
                        "triggers": {
                            "test_trigger": {
                                "type": "description",
                                "data": "a person walking",
                                "threshold": 0.8
                            }
                        }
                    }
                }
            }
        }
        self.config = FrigateConfig(**self.config_data)
        self.metrics = MagicMock()
        self.stop_event = threading.Event()
        
    def tearDown(self):
        pass

    @patch("frigate.embeddings.maintainer.InterProcessRequestor")
    @patch("frigate.embeddings.embeddings.InterProcessRequestor")
    @patch("frigate.embeddings.embeddings.JinaV1TextEmbedding")
    @patch("frigate.embeddings.embeddings.JinaV1ImageEmbedding")
    @patch("frigate.embeddings.maintainer.EmbeddingsResponder")
    @patch("frigate.embeddings.maintainer.SqliteVecQueueDatabase") # Mock DB in maintainer
    @patch("frigate.embeddings.embeddings.Trigger") # Patch Trigger where it is used in embeddings.py
    @patch("frigate.embeddings.embeddings.Embeddings.embed_description") # Patch class method to spy on all instances
    def test_init_deadlock_prevention(self, mock_embed_desc, mock_trigger_cls, mock_sqlite_vec_db_cls, mock_responder, mock_jina_img, mock_jina_text, mock_embeddings_requestor_cls, mock_maintainer_requestor_cls):
        # Setup mocks
        mock_embeddings_requestor = mock_embeddings_requestor_cls.return_value
        
        # Configure mock_embed_desc to return a fake embedding
        # It needs to return a numpy array so .astype().tobytes() works
        mock_embed_desc.return_value = np.random.rand(768).astype(np.float32)

        # Configure mock_trigger_cls to return a mock instance representing an existing trigger
        # This allows sync_triggers to find an "existing" trigger and try to update it
        mock_existing_trigger_instance = MagicMock()
        mock_existing_trigger_instance.name = "test_trigger"
        mock_existing_trigger_instance.type = "description"
        mock_existing_trigger_instance.data = "a person walking"
        mock_existing_trigger_instance.threshold = 0.1 # Force update (config is 0.8)
        mock_existing_trigger_instance.model = "jinav1"
        mock_existing_trigger_instance.embedding = b""
        mock_existing_trigger_instance.save.return_value = None # Mock the save method
        
        # Mock the Peewee query chain for Trigger.select()
        # Trigger.select().where(...) returns a list of triggers
        mock_trigger_cls.select.return_value.where.return_value = [mock_existing_trigger_instance]

        # Initialize EmbeddingMaintainer
        # This automatically calls sync_triggers -> _calculate_trigger_embedding -> embed_description
        maintainer = EmbeddingMaintainer(self.config, self.metrics, self.stop_event)
        
        # Verify init sends UPDATE_MODEL_STATE (so we know requestor is used for other things)
        self.assertTrue(mock_embeddings_requestor.send_data.called)
        
        # Verify embed_description was called directly during initialization
        mock_embed_desc.assert_called()
        
        # Verify save was called on the mocked existing_trigger (proving update logic ran)
        mock_existing_trigger_instance.save.assert_called_once()

        # Verify send_data was NOT called for embedding (which would cause deadlock)
        calls = mock_embeddings_requestor.send_data.call_args_list
        for call in calls:
            topic = call[0][0]
            self.assertNotEqual(topic, "embed_description", "Deadlock risk: embed_description called via IPC")
            self.assertNotEqual(topic, "embed_thumbnail", "Deadlock risk: embed_thumbnail called via IPC")

if __name__ == "__main__":
    unittest.main()
