"""Tests for the features collector."""

import logging
import os
import unittest

from peewee_migrate import Router
from playhouse.sqlite_ext import SqliteExtDatabase
from playhouse.sqliteq import SqliteQueueDatabase

from frigate.analytics.collectors import features
from frigate.analytics.schema import EnrichmentDevice, SemanticSearchModel
from frigate.models import User
from frigate.test.analytics_helpers import FRONT_CAMERA, make_config, make_context
from frigate.test.const import TEST_DB, TEST_DB_CLEANUPS

CONFIG = {
    "mqtt": {"host": "mqtt", "enabled": True},
    "genai": {
        "local": {
            "provider": "ollama",
            "model": "llava",
            "base_url": "http://ollama:11434",
            "roles": ["descriptions", "embeddings"],
        }
    },
    "semantic_search": {"enabled": True, "model": "local"},
    "face_recognition": {"enabled": True, "model_size": "large"},
    "birdseye": {"enabled": True, "modes": ["motion", "alerts"], "restream": True},
    "proxy": {"header_map": {"user": "x-forwarded-user"}},
    "camera_groups": {"outside": {"cameras": ["front"], "icon": "LuCar", "order": 0}},
    "cameras": {
        "front": {
            **FRONT_CAMERA,
            "semantic_search": {
                "triggers": {
                    "cat": {
                        "type": "description",
                        "data": "a cat",
                        "threshold": 0.8,
                        "actions": ["notification"],
                    }
                }
            },
        }
    },
}


class TestFeaturesCollector(unittest.TestCase):
    def setUp(self):
        migrate_db = SqliteExtDatabase(TEST_DB)
        del logging.getLogger("peewee_migrate").handlers[:]
        Router(migrate_db).run()
        migrate_db.close()
        self.db = SqliteQueueDatabase(TEST_DB)
        self.db.bind([User])

    def tearDown(self):
        # close() leaves the queue's writer thread running against the deleted file
        self.db.stop()

        if not self.db.is_closed():
            self.db.close()

        for file in TEST_DB_CLEANUPS:
            try:
                os.remove(file)
            except OSError:
                pass

    def test_collects_enrichments_genai_integrations_and_users(self):
        for username, role in (("a", "admin"), ("v", "viewer"), ("o", "operator")):
            User.create(
                username=username, role=role, password_hash="x", notification_tokens=[]
            )

        stats = {
            "embeddings": {
                "devices": {
                    "face_recognition": "OpenVINO GPU.0",
                    "semantic_search": "CUDA",
                }
            }
        }

        section = features.collect(make_context(make_config(CONFIG), stats))

        self.assertEqual(section.face_recognition.device, EnrichmentDevice.openvino_gpu)
        self.assertEqual(section.face_recognition.model_size, "large")
        self.assertIsNone(section.lpr.device)
        self.assertEqual(section.semantic_search.model, SemanticSearchModel.genai)
        self.assertEqual(section.semantic_search.device, EnrichmentDevice.cuda)
        self.assertEqual(section.semantic_search.triggers, 1)
        self.assertEqual(section.genai.providers, {"ollama": 1})
        self.assertEqual(section.genai.roles, {"descriptions": 1, "embeddings": 1})
        self.assertEqual(section.birdseye.modes, ["motion", "alerts"])
        self.assertTrue(section.mqtt)
        self.assertTrue(section.proxy_auth)
        self.assertEqual(section.users, {"admin": 1, "viewer": 1, "custom": 1})
        self.assertEqual((section.camera_groups, section.profiles), (1, 0))
        self.assertFalse(section.plus_api_key)


class TestFeatureMappings(unittest.TestCase):
    def test_enrichment_device_labels(self):
        cases = {
            "CPU": EnrichmentDevice.cpu,
            "MIGraphX": EnrichmentDevice.migraphx,
            "OpenVINO NPU": EnrichmentDevice.openvino_npu,
            "OpenVINO GPU.0,CPU": EnrichmentDevice.openvino_gpu,
            "OpenVINO": EnrichmentDevice.other,
            "CoreML": EnrichmentDevice.other,
        }

        for label, device in cases.items():
            with self.subTest(label=label):
                self.assertEqual(features.enrichment_device(label), device)

        self.assertIsNone(features.enrichment_device(None))

    def test_models_named_after_a_provider_are_genai(self):
        self.assertEqual(features.semantic_model("jinav2"), SemanticSearchModel.jinav2)
        self.assertEqual(
            features.semantic_model("my-ollama"), SemanticSearchModel.genai
        )
        self.assertIsNone(features.semantic_model(None))
        self.assertEqual(features.transcription_model("openai"), "genai")
