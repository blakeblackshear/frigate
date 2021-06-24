import unittest
import numpy as np
from pydantic import ValidationError
from frigate.config import (
    FrigateConfig,
    DetectorTypeEnum,
)


class TestConfig(unittest.TestCase):
    def setUp(self):
        self.minimal = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "height": 1080,
                    "width": 1920,
                }
            },
        }

    def test_config_class(self):
        frigate_config = FrigateConfig(**self.minimal)
        assert self.minimal == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert "coral" in runtime_config.detectors.keys()
        assert runtime_config.detectors["coral"].type == DetectorTypeEnum.edgetpu

    def test_invalid_mqtt_config(self):
        config = {
            "mqtt": {"host": "mqtt", "user": "test"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "height": 1080,
                    "width": 1920,
                }
            },
        }
        self.assertRaises(ValidationError, lambda: FrigateConfig(**config))

    def test_inherit_tracked_objects(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "objects": {"track": ["person", "dog"]},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "height": 1080,
                    "width": 1920,
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert "dog" in runtime_config.cameras["back"].objects.track

    def test_override_tracked_objects(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "objects": {"track": ["person", "dog"]},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "height": 1080,
                    "width": 1920,
                    "objects": {"track": ["cat"]},
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert "cat" in runtime_config.cameras["back"].objects.track

    def test_default_object_filters(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "objects": {"track": ["person", "dog"]},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "height": 1080,
                    "width": 1920,
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert "dog" in runtime_config.cameras["back"].objects.filters

    def test_inherit_object_filters(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "objects": {
                "track": ["person", "dog"],
                "filters": {"dog": {"threshold": 0.7}},
            },
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "height": 1080,
                    "width": 1920,
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert "dog" in runtime_config.cameras["back"].objects.filters
        assert runtime_config.cameras["back"].objects.filters["dog"].threshold == 0.7

    def test_override_object_filters(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "height": 1080,
                    "width": 1920,
                    "objects": {
                        "track": ["person", "dog"],
                        "filters": {"dog": {"threshold": 0.7}},
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert "dog" in runtime_config.cameras["back"].objects.filters
        assert runtime_config.cameras["back"].objects.filters["dog"].threshold == 0.7

    def test_global_object_mask(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "objects": {"track": ["person", "dog"]},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "height": 1080,
                    "width": 1920,
                    "objects": {
                        "mask": "0,0,1,1,0,1",
                        "filters": {"dog": {"mask": "1,1,1,1,1,1"}},
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        back_camera = runtime_config.cameras["back"]
        assert "dog" in back_camera.objects.filters
        assert len(back_camera.objects.filters["dog"].raw_mask) == 2
        assert len(back_camera.objects.filters["person"].raw_mask) == 1

    def test_ffmpeg_params_global(self):
        config = {
            "ffmpeg": {"input_args": ["-re"]},
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "height": 1080,
                    "width": 1920,
                    "objects": {
                        "track": ["person", "dog"],
                        "filters": {"dog": {"threshold": 0.7}},
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert "-re" in runtime_config.cameras["back"].ffmpeg_cmds[0]["cmd"]

    def test_ffmpeg_params_camera(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ],
                        "input_args": ["-re"],
                    },
                    "height": 1080,
                    "width": 1920,
                    "objects": {
                        "track": ["person", "dog"],
                        "filters": {"dog": {"threshold": 0.7}},
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert "-re" in runtime_config.cameras["back"].ffmpeg_cmds[0]["cmd"]

    def test_ffmpeg_params_input(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                                "input_args": ["-re"],
                            }
                        ]
                    },
                    "height": 1080,
                    "width": 1920,
                    "objects": {
                        "track": ["person", "dog"],
                        "filters": {"dog": {"threshold": 0.7}},
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert "-re" in runtime_config.cameras["back"].ffmpeg_cmds[0]["cmd"]

    def test_inherit_clips_retention(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "clips": {"retain": {"default": 20, "objects": {"person": 30}}},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "height": 1080,
                    "width": 1920,
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].clips.retain.objects["person"] == 30

    def test_roles_listed_twice_throws_error(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "clips": {"retain": {"default": 20, "objects": {"person": 30}}},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]},
                            {"path": "rtsp://10.0.0.1:554/video2", "roles": ["detect"]},
                        ]
                    },
                    "height": 1080,
                    "width": 1920,
                }
            },
        }
        self.assertRaises(ValidationError, lambda: FrigateConfig(**config))

    def test_zone_matching_camera_name_throws_error(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "clips": {"retain": {"default": 20, "objects": {"person": 30}}},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "height": 1080,
                    "width": 1920,
                    "zones": {"back": {"coordinates": "1,1,1,1,1,1"}},
                }
            },
        }
        self.assertRaises(ValidationError, lambda: FrigateConfig(**config))

    def test_zone_assigns_color_and_contour(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "clips": {"retain": {"default": 20, "objects": {"person": 30}}},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "height": 1080,
                    "width": 1920,
                    "zones": {"test": {"coordinates": "1,1,1,1,1,1"}},
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert isinstance(
            runtime_config.cameras["back"].zones["test"].contour, np.ndarray
        )
        assert runtime_config.cameras["back"].zones["test"].color != (0, 0, 0)

    def test_clips_should_default_to_global_objects(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "clips": {"retain": {"default": 20, "objects": {"person": 30}}},
            "objects": {"track": ["person", "dog"]},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "height": 1080,
                    "width": 1920,
                    "clips": {"enabled": True},
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        back_camera = runtime_config.cameras["back"]
        assert back_camera.clips.objects is None
        assert back_camera.clips.retain.objects["person"] == 30

    def test_role_assigned_but_not_enabled(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect", "rtmp"],
                            },
                            {"path": "rtsp://10.0.0.1:554/record", "roles": ["record"]},
                        ]
                    },
                    "height": 1080,
                    "width": 1920,
                }
            },
        }

        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        ffmpeg_cmds = runtime_config.cameras["back"].ffmpeg_cmds
        assert len(ffmpeg_cmds) == 1
        assert not "clips" in ffmpeg_cmds[0]["roles"]


if __name__ == "__main__":
    unittest.main(verbosity=2)
