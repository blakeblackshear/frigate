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
        # the orphaned comments must be gone from the file, not just parseable
        with open(self.config_path) as f:
            content = f.read()
        assert "cars parked across the street" not in content
        assert "second comment line" not in content

    def test_delete_key_preserves_siblings(self):
        """Deleting one key among several keeps the sibling entries and any
        comments on keys preceding the deleted one."""
        self._write(
            "cameras:\n"
            "  cam1:\n"
            "    objects:\n"
            "      filters:\n"
            "        car:\n"
            "          # mask drawn around the parked suv\n"
            "          mask: 0,0.45,0.245,0.45\n"
            "          threshold: 0.8\n"
        )
        update_yaml_file_bulk(
            self.config_path, {"cameras.cam1.objects.filters.car.threshold": ""}
        )
        data = self._load()
        car = data["cameras"]["cam1"]["objects"]["filters"]["car"]
        assert "threshold" not in car
        assert car["mask"] == "0,0.45,0.245,0.45"
        with open(self.config_path) as f:
            content = f.read()
        assert "# mask drawn around the parked suv" in content

    def test_delete_first_commented_key_keeps_map_valid(self):
        """Deleting a commented key from a map that still has other keys
        leaves the remaining entries intact and the file parseable."""
        self._write(
            "cameras:\n"
            "  cam1:\n"
            "    objects:\n"
            "      filters:\n"
            "        car:\n"
            "          # comment on the deleted key\n"
            "          mask: 0,0.45,0.245,0.45\n"
            "          threshold: 0.8\n"
        )
        update_yaml_file_bulk(
            self.config_path, {"cameras.cam1.objects.filters.car.mask": ""}
        )
        data = self._load()
        car = data["cameras"]["cam1"]["objects"]["filters"]["car"]
        assert "mask" not in car
        assert car["threshold"] == 0.8

    def test_update_value_preserves_comments(self):
        """Updating a value keeps surrounding comments intact."""
        self._write(
            "cameras:\n  cam1:\n    detect:\n      # tuned for the pi\n      fps: 4\n"
        )
        update_yaml_file_bulk(self.config_path, {"cameras.cam1.detect.fps": 5})
        data = self._load()
        assert data["cameras"]["cam1"]["detect"]["fps"] == 5
        with open(self.config_path) as f:
            assert "# tuned for the pi" in f.read()


if __name__ == "__main__":
    unittest.main(verbosity=2)
