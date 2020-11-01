import json
from unittest import TestCase, main
import voluptuous as vol
from frigate.config import FRIGATE_CONFIG_SCHEMA

class TestConfig(TestCase):
    def test_empty(self):
        FRIGATE_CONFIG_SCHEMA({})

    def test_minimal(self):
        minimal = {
            'mqtt': {
                'host': 'mqtt'
            },
            'cameras': {
                'back': {
                    'ffmpeg': {
                        'input': 'rtsp://10.0.0.1:554/video'
                    }
                }
            }
        }
        FRIGATE_CONFIG_SCHEMA(minimal)

if __name__ == '__main__':
    main(verbosity=2)
