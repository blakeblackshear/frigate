"""Tests for ModelConfig.compute_model_hash."""

import os
import tempfile
import unittest

from frigate.detectors.detector_config import ModelConfig


class TestComputeModelHash(unittest.TestCase):
    def _model(self, path: str) -> ModelConfig:
        # model_construct skips labelmap loading: the hash only needs path
        return ModelConfig.model_construct(path=path)

    def test_directory_hash_is_deterministic_and_content_sensitive(self):
        tmp = tempfile.TemporaryDirectory()
        try:
            model_dir = os.path.join(tmp.name, "compiled")
            os.makedirs(os.path.join(model_dir, "1"))
            with open(os.path.join(model_dir, "1", "model.json"), "w") as f:
                f.write("{}")
            with open(
                os.path.join(model_dir, "1", "postprocess_graph.onnx"), "wb"
            ) as f:
                f.write(b"weights-v1")

            model = self._model(model_dir)
            model.compute_model_hash()
            first = model.model_hash
            model.compute_model_hash()
            self.assertEqual(model.model_hash, first)

            with open(
                os.path.join(model_dir, "1", "postprocess_graph.onnx"), "wb"
            ) as f:
                f.write(b"weights-v2")
            model.compute_model_hash()
            self.assertNotEqual(model.model_hash, first)
        finally:
            tmp.cleanup()

    def test_file_hash_and_missing_path_unchanged(self):
        tmp = tempfile.TemporaryDirectory()
        try:
            path = os.path.join(tmp.name, "model.bin")
            with open(path, "wb") as f:
                f.write(b"weights")
            file_model = self._model(path)
            file_model.compute_model_hash()
            self.assertEqual(len(file_model.model_hash), 32)

            missing = self._model(os.path.join(tmp.name, "nope.bin"))
            missing.compute_model_hash()
            unknown = self._model("")
            unknown.compute_model_hash()
            self.assertEqual(missing.model_hash, unknown.model_hash)
        finally:
            tmp.cleanup()


if __name__ == "__main__":
    unittest.main()
