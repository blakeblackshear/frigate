import json
from unittest import TestCase, main
import voluptuous as vol
from frigate.config import FRIGATE_CONFIG_SCHEMA, FrigateConfig

class TestConfig(TestCase):
    def setUp(self):
        self.minimal = {
            'mqtt': {
                'host': 'mqtt'
            },
            'cameras': {
                'back': {
                    'ffmpeg': {
                        'inputs': [
                            { 'path': 'rtsp://10.0.0.1:554/video', 'roles': ['detect'] }
                        ]
                    },
                    'height': 1080,
                    'width': 1920
                }
            }
        }
    def test_empty(self):
        FRIGATE_CONFIG_SCHEMA({})

    def test_minimal(self):
        FRIGATE_CONFIG_SCHEMA(self.minimal)
    
    def test_config_class(self):
        FrigateConfig(config=self.minimal)
    
    def test_inherit_tracked_objects(self):
        config = {
            'mqtt': {
                'host': 'mqtt'
            },
            'objects': {
                'track': ['person', 'dog']
            },
            'cameras': {
                'back': {
                    'ffmpeg': {
                        'inputs': [
                            { 'path': 'rtsp://10.0.0.1:554/video', 'roles': ['detect'] }
                        ]
                    },
                    'height': 1080,
                    'width': 1920
                }
            }
        }
        frigate_config = FrigateConfig(config=config)
        assert('dog' in frigate_config.cameras['back'].objects.track)
    
    def test_override_tracked_objects(self):
        config = {
            'mqtt': {
                'host': 'mqtt'
            },
            'objects': {
                'track': ['person', 'dog']
            },
            'cameras': {
                'back': {
                    'ffmpeg': {
                        'inputs': [
                            { 'path': 'rtsp://10.0.0.1:554/video', 'roles': ['detect'] }
                        ]
                    },
                    'height': 1080,
                    'width': 1920,
                    'objects': {
                        'track': ['cat']
                    }
                }
            }
        }
        frigate_config = FrigateConfig(config=config)
        assert('cat' in frigate_config.cameras['back'].objects.track)
    
    def test_default_object_filters(self):
        config = {
            'mqtt': {
                'host': 'mqtt'
            },
            'objects': {
                'track': ['person', 'dog']
            },
            'cameras': {
                'back': {
                    'ffmpeg': {
                        'inputs': [
                            { 'path': 'rtsp://10.0.0.1:554/video', 'roles': ['detect'] }
                        ]
                    },
                    'height': 1080,
                    'width': 1920
                }
            }
        }
        frigate_config = FrigateConfig(config=config)
        assert('dog' in frigate_config.cameras['back'].objects.filters)
    
    def test_inherit_object_filters(self):
        config = {
            'mqtt': {
                'host': 'mqtt'
            },
            'objects': {
                'track': ['person', 'dog'],
                'filters': {
                    'dog': {
                        'threshold': 0.7
                    }
                }
            },
            'cameras': {
                'back': {
                    'ffmpeg': {
                        'inputs': [
                            { 'path': 'rtsp://10.0.0.1:554/video', 'roles': ['detect'] }
                        ]
                    },
                    'height': 1080,
                    'width': 1920
                }
            }
        }
        frigate_config = FrigateConfig(config=config)
        assert('dog' in frigate_config.cameras['back'].objects.filters)
        assert(frigate_config.cameras['back'].objects.filters['dog'].threshold == 0.7)
    
    def test_override_object_filters(self):
        config = {
            'mqtt': {
                'host': 'mqtt'
            },
            'cameras': {
                'back': {
                    'ffmpeg': {
                        'inputs': [
                            { 'path': 'rtsp://10.0.0.1:554/video', 'roles': ['detect'] }
                        ]
                    },
                    'height': 1080,
                    'width': 1920,
                    'objects': {
                        'track': ['person', 'dog'],
                        'filters': {
                            'dog': {
                                'threshold': 0.7
                            }
                        }
                    }
                }
            }
        }
        frigate_config = FrigateConfig(config=config)
        assert('dog' in frigate_config.cameras['back'].objects.filters)
        assert(frigate_config.cameras['back'].objects.filters['dog'].threshold == 0.7)
    
    def test_ffmpeg_params_global(self):
        config = {
            'ffmpeg': {
                'input_args': ['-re']
            },
            'mqtt': {
                'host': 'mqtt'
            },
            'cameras': {
                'back': {
                    'ffmpeg': {
                        'inputs': [
                            { 'path': 'rtsp://10.0.0.1:554/video', 'roles': ['detect'] }
                        ]
                    },
                    'height': 1080,
                    'width': 1920,
                    'objects': {
                        'track': ['person', 'dog'],
                        'filters': {
                            'dog': {
                                'threshold': 0.7
                            }
                        }
                    }
                }
            }
        }
        frigate_config = FrigateConfig(config=config)
        assert('-re' in frigate_config.cameras['back'].ffmpeg_cmds[0]['cmd'])

    def test_ffmpeg_params_camera(self):
        config = {
            'mqtt': {
                'host': 'mqtt'
            },
            'cameras': {
                'back': {
                    'ffmpeg': {
                        'inputs': [
                            { 'path': 'rtsp://10.0.0.1:554/video', 'roles': ['detect'] }
                        ],
                        'input_args': ['-re']
                    },
                    'height': 1080,
                    'width': 1920,
                    'objects': {
                        'track': ['person', 'dog'],
                        'filters': {
                            'dog': {
                                'threshold': 0.7
                            }
                        }
                    }
                }
            }
        }
        frigate_config = FrigateConfig(config=config)
        assert('-re' in frigate_config.cameras['back'].ffmpeg_cmds[0]['cmd'])

    def test_ffmpeg_params_input(self):
        config = {
            'mqtt': {
                'host': 'mqtt'
            },
            'cameras': {
                'back': {
                    'ffmpeg': {
                        'inputs': [
                            { 'path': 'rtsp://10.0.0.1:554/video', 'roles': ['detect'], 'input_args': ['-re'] }
                        ]
                    },
                    'height': 1080,
                    'width': 1920,
                    'objects': {
                        'track': ['person', 'dog'],
                        'filters': {
                            'dog': {
                                'threshold': 0.7
                            }
                        }
                    }
                }
            }
        }
        frigate_config = FrigateConfig(config=config)
        assert('-re' in frigate_config.cameras['back'].ffmpeg_cmds[0]['cmd'])
    
    
    def test_inherit_clips_retention(self):
        config = {
            'mqtt': {
                'host': 'mqtt'
            },
            'clips': {
                'retain': {
                    'default': 20,
                    'objects': {
                        'person': 30
                    }
                }
            },
            'cameras': {
                'back': {
                    'ffmpeg': {
                        'inputs': [
                            { 'path': 'rtsp://10.0.0.1:554/video', 'roles': ['detect'] }
                        ]
                    },
                    'height': 1080,
                    'width': 1920
                }
            }
        }
        frigate_config = FrigateConfig(config=config)
        assert(frigate_config.cameras['back'].clips.retain.objects['person'] == 30)
    
    def test_roles_listed_twice_throws_error(self):
        config = {
            'mqtt': {
                'host': 'mqtt'
            },
            'clips': {
                'retain': {
                    'default': 20,
                    'objects': {
                        'person': 30
                    }
                }
            },
            'cameras': {
                'back': {
                    'ffmpeg': {
                        'inputs': [
                            { 'path': 'rtsp://10.0.0.1:554/video', 'roles': ['detect'] },
                            { 'path': 'rtsp://10.0.0.1:554/video2', 'roles': ['detect'] }
                        ]
                    },
                    'height': 1080,
                    'width': 1920
                }
            }
        }
        self.assertRaises(vol.MultipleInvalid, lambda: FrigateConfig(config=config))
    
    def test_zone_matching_camera_name_throws_error(self):
        config = {
            'mqtt': {
                'host': 'mqtt'
            },
            'clips': {
                'retain': {
                    'default': 20,
                    'objects': {
                        'person': 30
                    }
                }
            },
            'cameras': {
                'back': {
                    'ffmpeg': {
                        'inputs': [
                            { 'path': 'rtsp://10.0.0.1:554/video', 'roles': ['detect'] }
                        ]
                    },
                    'height': 1080,
                    'width': 1920,
                    'zones': {
                        'back': {
                            'coordinates': '1,1,1,1,1,1'
                        }
                    }
                }
            }
        }
        self.assertRaises(vol.MultipleInvalid, lambda: FrigateConfig(config=config))
    
    def test_clips_should_default_to_global_objects(self):
        config = {
            'mqtt': {
                'host': 'mqtt'
            },
            'clips': {
                'retain': {
                    'default': 20,
                    'objects': {
                        'person': 30
                    }
                }
            },
            'objects': {
                'track': ['person', 'dog']
            },
            'cameras': {
                'back': {
                    'ffmpeg': {
                        'inputs': [
                            { 'path': 'rtsp://10.0.0.1:554/video', 'roles': ['detect'] }
                        ]
                    },
                    'height': 1080,
                    'width': 1920,
                    'clips': {
                        'enabled': True
                    }
                }
            }
        }
        config = FrigateConfig(config=config)
        assert(config.cameras['back'].clips.objects is None)
    
    def test_role_assigned_but_not_enabled(self):
        json_config = {
            'mqtt': {
                'host': 'mqtt'
            },
            'cameras': {
                'back': {
                    'ffmpeg': {
                        'inputs': [
                            { 'path': 'rtsp://10.0.0.1:554/video', 'roles': ['detect', 'rtmp'] },
                            { 'path': 'rtsp://10.0.0.1:554/record', 'roles': ['record'] }
                        ]
                    },
                    'height': 1080,
                    'width': 1920
                }
            }
        }

        config = FrigateConfig(config=json_config)
        ffmpeg_cmds = config.cameras['back'].ffmpeg_cmds
        assert(len(ffmpeg_cmds) == 1)
        assert(not 'clips' in ffmpeg_cmds[0]['roles'])


if __name__ == '__main__':
    main(verbosity=2)
