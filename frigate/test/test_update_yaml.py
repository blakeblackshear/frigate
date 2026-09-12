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

    def _read(self) -> str:
        with open(self.config_path) as f:
            return f.read()

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
        content = self._read()
        assert "cars parked across the street" not in content
        assert "second comment line" not in content

    def test_delete_last_named_mask_emptying_map(self):
        """The path the current UI actually sends: a named object mask deleted
        down to an empty `mask` map, with a comment inside that map."""
        self._write(
            "cameras:\n"
            "  cam1:\n"
            "    objects:\n"
            "      filters:\n"
            "        car:\n"
            "          mask:\n"
            "            # ignore the neighbor's driveway\n"
            "            driveway:\n"
            "              coordinates: 0,0.1,0.2,0.3\n"
        )
        update_yaml_file_bulk(
            self.config_path,
            {"cameras.cam1.objects.filters.car.mask.driveway": ""},
        )
        data = self._load()
        assert data["cameras"]["cam1"]["objects"]["filters"]["car"]["mask"] == {}
        assert "ignore the neighbor's driveway" not in self._read()

    def test_delete_last_commented_list_item(self):
        """Deleting the last element of a commented sequence must not emit
        an orphaned comment above a flow-style [] at column 0."""
        self._write(
            "cameras:\n"
            "  cam1:\n"
            "    motion:\n"
            "      mask:\n"
            "        # driveway motion mask\n"
            "        - 0,0.4,0.6,0.4\n"
        )
        update_yaml_file_bulk(self.config_path, {"cameras.cam1.motion.mask.0": ""})
        data = self._load()
        assert data["cameras"]["cam1"]["motion"]["mask"] == []
        assert "driveway motion mask" not in self._read()

    def test_delete_list_item_preserves_remaining(self):
        """Deleting one element of a sequence keeps the others and stays valid."""
        self._write(
            "cameras:\n"
            "  cam1:\n"
            "    motion:\n"
            "      mask:\n"
            "        - 0,0.4,0.6,0.4\n"
            "        - 0,0.1,0.2,0.3\n"
        )
        update_yaml_file_bulk(self.config_path, {"cameras.cam1.motion.mask.0": ""})
        data = self._load()
        assert data["cameras"]["cam1"]["motion"]["mask"] == ["0,0.1,0.2,0.3"]

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
        assert "# mask drawn around the parked suv" in self._read()

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
        assert "# tuned for the pi" in self._read()


if __name__ == "__main__":
    unittest.main(verbosity=2)
