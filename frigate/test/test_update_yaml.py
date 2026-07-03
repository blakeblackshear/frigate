"""Test in-place yaml config updates."""

import os
import tempfile
import unittest

from ruamel.yaml import YAML

from frigate.util.builtin import update_yaml_file_bulk


class TestUpdateYaml(unittest.TestCase):
    def setUp(self) -> None:
        self.yaml = YAML()
        fd, self.config_path = tempfile.mkstemp(suffix=".yml")
        os.close(fd)

    def tearDown(self) -> None:
        os.unlink(self.config_path)

    def _write(self, text: str) -> None:
        with open(self.config_path, "w") as f:
            f.write(text)

    def _load(self):
        with open(self.config_path) as f:
            return self.yaml.load(f)

    def test_delete_key(self):
        """Deleting a key removes it and leaves valid yaml."""
        self._write(
            "cameras:\n"
            "  cam1:\n"
            "    objects:\n"
            "      filters:\n"
            "        car:\n"
            "          mask: 0,0.45,0.245,0.45\n"
        )
        update_yaml_file_bulk(
            self.config_path, {"cameras.cam1.objects.filters.car.mask": ""}
        )
        data = self._load()
        assert "mask" not in data["cameras"]["cam1"]["objects"]["filters"]["car"]

    def test_delete_commented_key_emptying_map(self):
        """Deleting the only key of a map whose key carries comments must not
        emit unparseable yaml (orphaned comment tokens above a flow-style {})."""
        self._write(
            "cameras:\n"
            "  cam1:\n"
            "    objects:\n"
            "      filters:\n"
            "        car:\n"
            "          # cars parked across the street\n"
            "          # second comment line\n"
            "          mask: 0,0.45,0.245,0.45\n"
            "    motion:\n"
            "      mask: 0,0.449,0.686,0.395\n"
        )
        update_yaml_file_bulk(
            self.config_path, {"cameras.cam1.objects.filters.car.mask": ""}
        )
        # must re-parse cleanly
        data = self._load()
        assert "mask" not in data["cameras"]["cam1"]["objects"]["filters"]["car"]
        assert data["cameras"]["cam1"]["motion"]["mask"] == "0,0.449,0.686,0.395"

    def test_update_value_preserves_comments(self):
        """Updating a value keeps surrounding comments intact."""
        self._write(
            "cameras:\n"
            "  cam1:\n"
            "    detect:\n"
            "      # tuned for the pi\n"
            "      fps: 4\n"
        )
        update_yaml_file_bulk(self.config_path, {"cameras.cam1.detect.fps": 5})
        data = self._load()
        assert data["cameras"]["cam1"]["detect"]["fps"] == 5
        with open(self.config_path) as f:
            assert "# tuned for the pi" in f.read()


if __name__ == "__main__":
    unittest.main(verbosity=2)
