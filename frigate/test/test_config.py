import unittest
import numpy as np
from pydantic import ValidationError

from frigate.config import (
    BirdseyeModeEnum,
    FrigateConfig,
)
from frigate.detectors import DetectorTypeEnum
from frigate.util import deep_merge, load_config_with_no_duplicates


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
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

    def test_config_class(self):
        frigate_config = FrigateConfig(**self.minimal)
        assert self.minimal == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert "cpu" in runtime_config.detectors.keys()
        assert runtime_config.detectors["cpu"].type == DetectorTypeEnum.cpu
        assert runtime_config.detectors["cpu"].model.width == 320

    def test_detector_custom_model_path(self):
        config = {
            "detectors": {
                "cpu": {
                    "type": "cpu",
                    "model": {"path": "/cpu_model.tflite"},
                },
                "edgetpu": {
                    "type": "edgetpu",
                    "model": {"path": "/edgetpu_model.tflite", "width": 160},
                },
                "openvino": {
                    "type": "openvino",
                },
            },
            "model": {"path": "/default.tflite", "width": 512},
        }

        frigate_config = FrigateConfig(**(deep_merge(config, self.minimal)))
        runtime_config = frigate_config.runtime_config

        assert "cpu" in runtime_config.detectors.keys()
        assert "edgetpu" in runtime_config.detectors.keys()
        assert "openvino" in runtime_config.detectors.keys()

        assert runtime_config.detectors["cpu"].type == DetectorTypeEnum.cpu
        assert runtime_config.detectors["edgetpu"].type == DetectorTypeEnum.edgetpu
        assert runtime_config.detectors["openvino"].type == DetectorTypeEnum.openvino

        assert runtime_config.detectors["cpu"].num_threads == 3
        assert runtime_config.detectors["edgetpu"].device is None
        assert runtime_config.detectors["openvino"].device is None

        assert runtime_config.model.path == "/default.tflite"
        assert runtime_config.detectors["cpu"].model.path == "/cpu_model.tflite"
        assert runtime_config.detectors["edgetpu"].model.path == "/edgetpu_model.tflite"
        assert runtime_config.detectors["openvino"].model.path == "/default.tflite"

        assert runtime_config.model.width == 512
        assert runtime_config.detectors["cpu"].model.width == 512
        assert runtime_config.detectors["edgetpu"].model.width == 160
        assert runtime_config.detectors["openvino"].model.width == 512

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
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
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
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert "dog" in runtime_config.cameras["back"].objects.track

    def test_override_birdseye(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "birdseye": {"enabled": True, "mode": "continuous"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "birdseye": {"enabled": False, "mode": "motion"},
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert not runtime_config.cameras["back"].birdseye.enabled
        assert runtime_config.cameras["back"].birdseye.mode is BirdseyeModeEnum.motion

    def test_override_birdseye_non_inheritable(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "birdseye": {"enabled": True, "mode": "continuous", "height": 1920},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].birdseye.enabled

    def test_inherit_birdseye(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "birdseye": {"enabled": True, "mode": "continuous"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].birdseye.enabled
        assert (
            runtime_config.cameras["back"].birdseye.mode is BirdseyeModeEnum.continuous
        )

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
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
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
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
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
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
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
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
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
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
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

    def test_default_input_args(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert "-rtsp_transport" in runtime_config.cameras["back"].ffmpeg_cmds[0]["cmd"]

    def test_ffmpeg_params_global(self):
        config = {
            "ffmpeg": {"input_args": "-re"},
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
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
            "ffmpeg": {"input_args": ["test"]},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ],
                        "input_args": ["-re"],
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
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
        assert "test" not in runtime_config.cameras["back"].ffmpeg_cmds[0]["cmd"]

    def test_ffmpeg_params_input(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "ffmpeg": {"input_args": ["test2"]},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                                "input_args": "-re test",
                            }
                        ],
                        "input_args": "test3",
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
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
        assert "test" in runtime_config.cameras["back"].ffmpeg_cmds[0]["cmd"]
        assert "test2" not in runtime_config.cameras["back"].ffmpeg_cmds[0]["cmd"]
        assert "test3" not in runtime_config.cameras["back"].ffmpeg_cmds[0]["cmd"]

    def test_inherit_clips_retention(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "record": {
                "events": {"retain": {"default": 20, "objects": {"person": 30}}}
            },
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert (
            runtime_config.cameras["back"].record.events.retain.objects["person"] == 30
        )

    def test_roles_listed_twice_throws_error(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "record": {
                "events": {"retain": {"default": 20, "objects": {"person": 30}}}
            },
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]},
                            {"path": "rtsp://10.0.0.1:554/video2", "roles": ["detect"]},
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }
        self.assertRaises(ValidationError, lambda: FrigateConfig(**config))

    def test_zone_matching_camera_name_throws_error(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "record": {
                "events": {"retain": {"default": 20, "objects": {"person": 30}}}
            },
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "zones": {"back": {"coordinates": "1,1,1,1,1,1"}},
                }
            },
        }
        self.assertRaises(ValidationError, lambda: FrigateConfig(**config))

    def test_zone_assigns_color_and_contour(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "record": {
                "events": {"retain": {"default": 20, "objects": {"person": 30}}}
            },
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
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
            "record": {
                "events": {"retain": {"default": 20, "objects": {"person": 30}}}
            },
            "objects": {"track": ["person", "dog"]},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "record": {"events": {}},
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        back_camera = runtime_config.cameras["back"]
        assert back_camera.record.events.objects is None
        assert back_camera.record.events.retain.objects["person"] == 30

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
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        ffmpeg_cmds = runtime_config.cameras["back"].ffmpeg_cmds
        assert len(ffmpeg_cmds) == 1
        assert not "clips" in ffmpeg_cmds[0]["roles"]

    def test_max_disappeared_default(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "enabled": True,
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].detect.max_disappeared == 5 * 5

    def test_motion_frame_height_wont_go_below_120(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].motion.frame_height == 50

    def test_motion_contour_area_dynamic(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert round(runtime_config.cameras["back"].motion.contour_area) == 30

    def test_merge_labelmap(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "model": {"labelmap": {7: "truck"}},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.model.merged_labelmap[7] == "truck"

    def test_default_labelmap_empty(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.model.merged_labelmap[0] == "person"

    def test_default_labelmap(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "model": {"width": 320, "height": 320},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.model.merged_labelmap[0] == "person"

    def test_fails_on_invalid_role(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                            {
                                "path": "rtsp://10.0.0.1:554/video2",
                                "roles": ["clips"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

        self.assertRaises(ValidationError, lambda: FrigateConfig(**config))

    def test_fails_on_missing_role(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                            {
                                "path": "rtsp://10.0.0.1:554/video2",
                                "roles": ["record"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                    "rtmp": {"enabled": True},
                }
            },
        }

        frigate_config = FrigateConfig(**config)
        self.assertRaises(ValueError, lambda: frigate_config.runtime_config)

    def test_works_on_missing_role_multiple_cams(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                            {
                                "path": "rtsp://10.0.0.1:554/video2",
                                "roles": ["record"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                },
                "cam2": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                            {
                                "path": "rtsp://10.0.0.1:554/video2",
                                "roles": ["record"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                },
            },
        }

        frigate_config = FrigateConfig(**config)
        runtime_config = frigate_config.runtime_config

    def test_global_detect(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "detect": {"max_disappeared": 1},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].detect.max_disappeared == 1
        assert runtime_config.cameras["back"].detect.height == 1080

    def test_default_detect(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    }
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].detect.max_disappeared == 25
        assert runtime_config.cameras["back"].detect.height == 720

    def test_global_detect_merge(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "detect": {"max_disappeared": 1, "height": 720},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].detect.max_disappeared == 1
        assert runtime_config.cameras["back"].detect.height == 1080
        assert runtime_config.cameras["back"].detect.width == 1920

    def test_global_snapshots(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "snapshots": {"enabled": True},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "snapshots": {
                        "height": 100,
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].snapshots.enabled
        assert runtime_config.cameras["back"].snapshots.height == 100

    def test_default_snapshots(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    }
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].snapshots.bounding_box
        assert runtime_config.cameras["back"].snapshots.quality == 70

    def test_global_snapshots_merge(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "snapshots": {"bounding_box": False, "height": 300},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "snapshots": {
                        "height": 150,
                        "enabled": True,
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].snapshots.bounding_box == False
        assert runtime_config.cameras["back"].snapshots.height == 150
        assert runtime_config.cameras["back"].snapshots.enabled

    def test_global_rtmp_disabled(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert not runtime_config.cameras["back"].rtmp.enabled

    def test_default_not_rtmp(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    }
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert not runtime_config.cameras["back"].rtmp.enabled

    def test_global_rtmp_merge(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "rtmp": {"enabled": False},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect", "rtmp"],
                            },
                        ]
                    },
                    "rtmp": {
                        "enabled": True,
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].rtmp.enabled

    def test_global_rtmp_default(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                            {
                                "path": "rtsp://10.0.0.1:554/video2",
                                "roles": ["record"],
                            },
                        ]
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert not runtime_config.cameras["back"].rtmp.enabled

    def test_global_jsmpeg(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "live": {"quality": 4},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].live.quality == 4

    def test_default_live(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    }
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].live.quality == 8

    def test_global_live_merge(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "live": {"quality": 4, "height": 480},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "live": {
                        "quality": 7,
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].live.quality == 7
        assert runtime_config.cameras["back"].live.height == 480

    def test_global_timestamp_style(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "timestamp_style": {"position": "bl"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].timestamp_style.position == "bl"

    def test_default_timestamp_style(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    }
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].timestamp_style.position == "tl"

    def test_global_timestamp_style_merge(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "rtmp": {"enabled": False},
            "timestamp_style": {"position": "br", "thickness": 2},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "timestamp_style": {"position": "bl", "thickness": 4},
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].timestamp_style.position == "bl"
        assert runtime_config.cameras["back"].timestamp_style.thickness == 4

    def test_allow_retain_to_be_a_decimal(self):

        config = {
            "mqtt": {"host": "mqtt"},
            "snapshots": {"retain": {"default": 1.5}},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert runtime_config.cameras["back"].snapshots.retain.default == 1.5

    def test_fails_on_bad_camera_name(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "snapshots": {"retain": {"default": 1.5}},
            "cameras": {
                "back camer#": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                }
            },
        }

        frigate_config = FrigateConfig(**config)

        self.assertRaises(
            ValidationError, lambda: frigate_config.runtime_config.cameras
        )

    def test_fails_on_bad_segment_time(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "record": {"enabled": True},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "output_args": {
                            "record": "-f segment -segment_time 70 -segment_format mp4 -reset_timestamps 1 -strftime 1 -c copy -an"
                        },
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ],
                    },
                }
            },
        }

        frigate_config = FrigateConfig(**config)

        self.assertRaises(
            ValueError, lambda: frigate_config.runtime_config.ffmpeg.output_args.record
        )

    def test_fails_zone_defines_untracked_object(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "objects": {"track": ["person"]},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            },
                        ]
                    },
                    "zones": {
                        "steps": {
                            "coordinates": "0,0,0,0",
                            "objects": ["car", "person"],
                        },
                    },
                }
            },
        }

        frigate_config = FrigateConfig(**config)

        self.assertRaises(ValueError, lambda: frigate_config.runtime_config.cameras)

    def test_fails_duplicate_keys(self):
        raw_config = """
        cameras:
          test:
            ffmpeg:
              inputs:
                - one
                - two
              inputs:
                - three
                - four
        """

        self.assertRaises(
            ValueError, lambda: load_config_with_no_duplicates(raw_config)
        )

    def test_object_filter_ratios_work(self):
        config = {
            "mqtt": {"host": "mqtt"},
            "objects": {
                "track": ["person", "dog"],
                "filters": {"dog": {"min_ratio": 0.2, "max_ratio": 10.1}},
            },
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }
        frigate_config = FrigateConfig(**config)
        assert config == frigate_config.dict(exclude_unset=True)

        runtime_config = frigate_config.runtime_config
        assert "dog" in runtime_config.cameras["back"].objects.filters
        assert runtime_config.cameras["back"].objects.filters["dog"].min_ratio == 0.2
        assert runtime_config.cameras["back"].objects.filters["dog"].max_ratio == 10.1


if __name__ == "__main__":
    unittest.main(verbosity=2)
