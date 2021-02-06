import base64
import json
import logging
import os
from typing import Dict

import cv2
import matplotlib.pyplot as plt
import numpy as np
import voluptuous as vol
import yaml

from frigate.const import RECORD_DIR, CLIPS_DIR, CACHE_DIR
from frigate.util import create_mask

logger = logging.getLogger(__name__)

DEFAULT_TRACKED_OBJECTS = ['person']

DETECTORS_SCHEMA = vol.Schema(
    {
        vol.Required(str): {
            vol.Required('type', default='edgetpu'): vol.In(['cpu', 'edgetpu']),
            vol.Optional('device', default='usb'): str,
            vol.Optional('num_threads', default=3): int
        }
    }
)

DEFAULT_DETECTORS = {
    'coral': {
        'type': 'edgetpu',
        'device': 'usb'
    }
}

MQTT_SCHEMA = vol.Schema(
    {
        vol.Required('host'): str,
        vol.Optional('port', default=1883): int,
        vol.Optional('topic_prefix', default='frigate'): str,
        vol.Optional('client_id', default='frigate'): str,
        vol.Optional('stats_interval', default=60): int,
        'user': str,
        'password': str
    }
)

RETAIN_SCHEMA = vol.Schema(
    {
        vol.Required('default',default=10): int,
        'objects': {
            str: int
        }
    }
)

CLIPS_SCHEMA = vol.Schema(
    {
        vol.Optional('max_seconds', default=300): int,
        'tmpfs_cache_size': str,
        vol.Optional('retain', default={}): RETAIN_SCHEMA
    }
)

FFMPEG_GLOBAL_ARGS_DEFAULT = ['-hide_banner','-loglevel','warning']
FFMPEG_INPUT_ARGS_DEFAULT = ['-avoid_negative_ts', 'make_zero',
    '-fflags', '+genpts+discardcorrupt',
    '-rtsp_transport', 'tcp',
    '-stimeout', '5000000',
    '-use_wallclock_as_timestamps', '1']
DETECT_FFMPEG_OUTPUT_ARGS_DEFAULT = ['-f', 'rawvideo',
    '-pix_fmt', 'yuv420p']
RTMP_FFMPEG_OUTPUT_ARGS_DEFAULT = ["-c", "copy", "-f", "flv"]
SAVE_CLIPS_FFMPEG_OUTPUT_ARGS_DEFAULT = ["-f", "segment", "-segment_time",
    "10", "-segment_format", "mp4", "-reset_timestamps", "1", "-strftime",
    "1", "-c", "copy", "-an"]
RECORD_FFMPEG_OUTPUT_ARGS_DEFAULT = ["-f", "segment", "-segment_time",
    "60", "-segment_format", "mp4", "-reset_timestamps", "1", "-strftime",
    "1", "-c", "copy", "-an"]

GLOBAL_FFMPEG_SCHEMA = vol.Schema(
    {
        vol.Optional('global_args', default=FFMPEG_GLOBAL_ARGS_DEFAULT):  vol.Any(str, [str]),
        vol.Optional('hwaccel_args', default=[]): vol.Any(str, [str]),
        vol.Optional('input_args', default=FFMPEG_INPUT_ARGS_DEFAULT): vol.Any(str, [str]),
        vol.Optional('output_args', default={}): {
            vol.Optional('detect', default=DETECT_FFMPEG_OUTPUT_ARGS_DEFAULT): vol.Any(str, [str]),
            vol.Optional('record', default=RECORD_FFMPEG_OUTPUT_ARGS_DEFAULT): vol.Any(str, [str]),
            vol.Optional('clips', default=SAVE_CLIPS_FFMPEG_OUTPUT_ARGS_DEFAULT): vol.Any(str, [str]),
            vol.Optional('rtmp', default=RTMP_FFMPEG_OUTPUT_ARGS_DEFAULT): vol.Any(str, [str]),
        }
    }
)

MOTION_SCHEMA = vol.Schema(
    {
        'mask': vol.Any(str, [str]),
        'threshold': vol.Range(min=1, max=255),
        'contour_area': int,
        'delta_alpha': float,
        'frame_alpha': float,
        'frame_height': int
    }
)

DETECT_SCHEMA = vol.Schema(
    {
        'max_disappeared': int
    }
)

FILTER_SCHEMA = vol.Schema(
    {
        str: {
                'min_area': int,
                'max_area': int,
                'threshold': float,
            }
    }
)

def filters_for_all_tracked_objects(object_config):
    for tracked_object in object_config.get('track', DEFAULT_TRACKED_OBJECTS):
        if not 'filters' in object_config:
            object_config['filters'] = {}
        if not tracked_object in object_config['filters']:
            object_config['filters'][tracked_object] = {}
    return object_config

OBJECTS_SCHEMA = vol.Schema(vol.All(filters_for_all_tracked_objects,
    {
        'track': [str],
        'mask': vol.Any(str, [str]),
        vol.Optional('filters', default = {}): FILTER_SCHEMA.extend(
            { 
                str: {
                        'min_score': float,
                        'mask': vol.Any(str, [str]),
                    }
            })
    }
))

def each_role_used_once(inputs):
    roles = [role for i in inputs for role in i['roles']]
    roles_set = set(roles)
    if len(roles) > len(roles_set):
        raise ValueError
    return inputs

def detect_is_required(inputs):
    roles = [role for i in inputs for role in i['roles']]
    if not 'detect' in roles:
        raise ValueError
    return inputs

CAMERA_FFMPEG_SCHEMA = vol.Schema(
    {
        vol.Required('inputs'): vol.All([{
            vol.Required('path'): str,
            vol.Required('roles'): ['detect', 'clips', 'record', 'rtmp'],
            'global_args':  vol.Any(str, [str]),
            'hwaccel_args': vol.Any(str, [str]),
            'input_args': vol.Any(str, [str]),
        }], vol.Msg(each_role_used_once, msg="Each input role may only be used once"), 
            vol.Msg(detect_is_required, msg="The detect role is required")),
        'global_args':  vol.Any(str, [str]),
        'hwaccel_args': vol.Any(str, [str]),
        'input_args': vol.Any(str, [str]),
        'output_args': {
            vol.Optional('detect', default=DETECT_FFMPEG_OUTPUT_ARGS_DEFAULT): vol.Any(str, [str]),
            vol.Optional('record', default=RECORD_FFMPEG_OUTPUT_ARGS_DEFAULT): vol.Any(str, [str]),
            vol.Optional('clips', default=SAVE_CLIPS_FFMPEG_OUTPUT_ARGS_DEFAULT): vol.Any(str, [str]),
            vol.Optional('rtmp', default=RTMP_FFMPEG_OUTPUT_ARGS_DEFAULT): vol.Any(str, [str]),
        }
    }
)

def ensure_zones_and_cameras_have_different_names(cameras):
    zones = [zone for camera in cameras.values() for zone in camera['zones'].keys()]
    for zone in zones:
        if zone in cameras.keys():
            raise ValueError
    return cameras

CAMERAS_SCHEMA = vol.Schema(vol.All(
    {
        str: {
            vol.Required('ffmpeg'): CAMERA_FFMPEG_SCHEMA,
            vol.Required('height'): int,
            vol.Required('width'): int,
            'fps': int,
            vol.Optional('best_image_timeout', default=60): int,
            vol.Optional('zones', default={}):  {
                str: {
                    vol.Required('coordinates'): vol.Any(str, [str]),
                    vol.Optional('filters', default={}): FILTER_SCHEMA
                }
            },
            vol.Optional('clips', default={}): {
                vol.Optional('enabled', default=False): bool,
                vol.Optional('pre_capture', default=5): int,
                vol.Optional('post_capture', default=5): int,
                vol.Optional('required_zones', default=[]): [str],
                'objects': [str],
                vol.Optional('retain', default={}): RETAIN_SCHEMA,
            },
            vol.Optional('record', default={}): {
                'enabled': bool,
                'retain_days': int,
            },
            vol.Optional('rtmp', default={}): {
                vol.Required('enabled', default=True): bool,
            },
            vol.Optional('snapshots', default={}): {
                vol.Optional('enabled', default=False): bool,
                vol.Optional('timestamp', default=False): bool,
                vol.Optional('bounding_box', default=False): bool,
                vol.Optional('crop', default=False): bool,
                vol.Optional('required_zones', default=[]): [str],
                'height': int,
                vol.Optional('retain', default={}): RETAIN_SCHEMA,
            },
            vol.Optional('mqtt', default={}): {
                vol.Optional('enabled', default=True): bool,
                vol.Optional('timestamp', default=True): bool,
                vol.Optional('bounding_box', default=True): bool,
                vol.Optional('crop', default=True): bool,
                vol.Optional('height', default=270): int,
                vol.Optional('required_zones', default=[]): [str],
            },
            vol.Optional('objects', default={}): OBJECTS_SCHEMA,
            vol.Optional('motion', default={}): MOTION_SCHEMA,
            vol.Optional('detect', default={}): DETECT_SCHEMA.extend({
                vol.Optional('enabled', default=True): bool
            })
        }
    }, vol.Msg(ensure_zones_and_cameras_have_different_names, msg='Zones cannot share names with cameras'))
)

FRIGATE_CONFIG_SCHEMA = vol.Schema(
    {
        vol.Optional('database', default={}): {
            vol.Optional('path', default=os.path.join(CLIPS_DIR, 'frigate.db')): str
        },
        vol.Optional('model', default={'width': 320, 'height': 320}): {
            vol.Required('width'): int,
            vol.Required('height'): int
        },
        vol.Optional('detectors', default=DEFAULT_DETECTORS): DETECTORS_SCHEMA,
        'mqtt': MQTT_SCHEMA,
        vol.Optional('logger', default={'default': 'info', 'logs': {}}): {
            vol.Optional('default', default='info'): vol.In(['info', 'debug', 'warning', 'error', 'critical']),
            vol.Optional('logs', default={}): {str: vol.In(['info', 'debug', 'warning', 'error', 'critical']) }
        },
        vol.Optional('snapshots', default={}): {
            vol.Optional('retain', default={}): RETAIN_SCHEMA
        },
        vol.Optional('clips', default={}): CLIPS_SCHEMA,
        vol.Optional('record', default={}): {
            vol.Optional('enabled', default=False): bool,
            vol.Optional('retain_days', default=30): int,
        },
        vol.Optional('ffmpeg', default={}): GLOBAL_FFMPEG_SCHEMA,
        vol.Optional('objects', default={}): OBJECTS_SCHEMA,
        vol.Optional('motion', default={}): MOTION_SCHEMA,
        vol.Optional('detect', default={}): DETECT_SCHEMA,
        vol.Required('cameras', default={}): CAMERAS_SCHEMA,
        vol.Optional('environment_vars', default={}): { str: str }
    }
)

class DatabaseConfig():
    def __init__(self, config):
        self._path = config['path']

    @property
    def path(self):
        return self._path

    def to_dict(self):
        return {
            'path': self.path
        }

class ModelConfig():
    def __init__(self, config):
        self._width = config['width']
        self._height = config['height']

    @property
    def width(self):
        return self._width

    @property
    def height(self):
        return self._height

    def to_dict(self):
        return {
            'width': self.width,
            'height': self.height
        }

class DetectorConfig():
    def __init__(self, config):
        self._type = config['type']
        self._device = config['device']
        self._num_threads = config['num_threads']

    @property
    def type(self):
        return self._type

    @property
    def device(self):
        return self._device

    @property
    def num_threads(self):
        return self._num_threads

    def to_dict(self):
        return {
            'type': self.type,
            'device': self.device,
            'num_threads': self.num_threads
        }

class LoggerConfig():
    def __init__(self, config):
        self._default = config['default'].upper()
        self._logs = {k: v.upper() for k, v in config['logs'].items()}

    @property
    def default(self):
        return self._default

    @property
    def logs(self):
        return self._logs

    def to_dict(self):
        return {
            'default': self.default,
            'logs': self.logs
        }

class MqttConfig():
    def __init__(self, config):
        self._host = config['host']
        self._port = config['port']
        self._topic_prefix = config['topic_prefix']
        self._client_id = config['client_id']
        self._user = config.get('user')
        self._password = config.get('password')
        self._stats_interval = config.get('stats_interval')
    
    @property
    def host(self):
        return self._host

    @property
    def port(self):
        return self._port

    @property
    def topic_prefix(self):
        return self._topic_prefix

    @property
    def client_id(self):
        return self._client_id

    @property
    def user(self):
        return self._user

    @property
    def password(self):
        return self._password

    @property
    def stats_interval(self):
        return self._stats_interval

    def to_dict(self):
        return {
            'host': self.host,
            'port': self.port,
            'topic_prefix': self.topic_prefix,
            'client_id': self.client_id,
            'user': self.user,
            'stats_interval': self.stats_interval
        }

class CameraInput():
    def __init__(self, camera_config, global_config, ffmpeg_input):
        self._path = ffmpeg_input['path']
        self._roles = ffmpeg_input['roles']
        self._global_args = ffmpeg_input.get('global_args', camera_config.get('global_args', global_config['global_args']))
        self._hwaccel_args = ffmpeg_input.get('hwaccel_args', camera_config.get('hwaccel_args', global_config['hwaccel_args']))
        self._input_args = ffmpeg_input.get('input_args', camera_config.get('input_args', global_config['input_args']))

    @property
    def path(self):
        return self._path

    @property
    def roles(self):
        return self._roles

    @property
    def global_args(self):
        return self._global_args if isinstance(self._global_args, list) else self._global_args.split(' ')

    @property
    def hwaccel_args(self):
        return self._hwaccel_args if isinstance(self._hwaccel_args, list) else self._hwaccel_args.split(' ')

    @property
    def input_args(self):
        return self._input_args if isinstance(self._input_args, list) else self._input_args.split(' ')

class CameraFfmpegConfig():
    def __init__(self, global_config, config):
        self._inputs = [CameraInput(config, global_config, i) for i in config['inputs']]
        self._output_args = config.get('output_args', global_config['output_args'])

    @property
    def inputs(self):
        return self._inputs

    @property
    def output_args(self):
        return {k: v if isinstance(v, list) else v.split(' ') for k, v in self._output_args.items()}

class RetainConfig():
    def __init__(self, global_config, config):
        self._default = config.get('default', global_config.get('default'))
        self._objects = config.get('objects', global_config.get('objects', {}))

    @property
    def default(self):
        return self._default

    @property
    def objects(self):
        return self._objects

    def to_dict(self):
        return {
            'default': self.default,
            'objects': self.objects
        }

class ClipsConfig():
    def __init__(self, config):
        self._max_seconds = config['max_seconds']
        self._tmpfs_cache_size = config.get('tmpfs_cache_size', '').strip()
        self._retain = RetainConfig(config['retain'], config['retain'])
    
    @property
    def max_seconds(self):
        return self._max_seconds

    @property
    def tmpfs_cache_size(self):
        return self._tmpfs_cache_size

    @property
    def retain(self):
        return self._retain

    def to_dict(self):
        return {
            'max_seconds': self.max_seconds,
            'tmpfs_cache_size': self.tmpfs_cache_size,
            'retain': self.retain.to_dict()
        }

class SnapshotsConfig():
    def __init__(self, config):
        self._retain = RetainConfig(config['retain'], config['retain'])

    @property
    def retain(self):
        return self._retain

    def to_dict(self):
        return {
            'retain': self.retain.to_dict()
        }

class RecordConfig():
    def __init__(self, global_config, config):
        self._enabled = config.get('enabled', global_config['enabled'])
        self._retain_days = config.get('retain_days', global_config['retain_days'])

    @property
    def enabled(self):
        return self._enabled

    @property
    def retain_days(self):
        return self._retain_days

    def to_dict(self):
        return {
            'enabled': self.enabled,
            'retain_days': self.retain_days,
        }

class FilterConfig():
    def __init__(self, global_config, config, global_mask=None, frame_shape=None):
        self._min_area = config.get('min_area', global_config.get('min_area', 0))
        self._max_area = config.get('max_area', global_config.get('max_area', 24000000))
        self._threshold = config.get('threshold', global_config.get('threshold', 0.7))
        self._min_score = config.get('min_score', global_config.get('min_score', 0.5))

        self._raw_mask = []
        if global_mask:
            if isinstance(global_mask, list):
                self._raw_mask += global_mask
            elif isinstance(global_mask, str):
                self._raw_mask += [global_mask]

        mask = config.get('mask')
        if mask:
            if isinstance(mask, list):
                self._raw_mask += mask
            elif isinstance(mask, str):
                self._raw_mask += [mask]
        self._mask = create_mask(frame_shape, self._raw_mask) if self._raw_mask else None

    @property
    def min_area(self):
        return self._min_area

    @property
    def max_area(self):
        return self._max_area

    @property
    def threshold(self):
        return self._threshold

    @property
    def min_score(self):
        return self._min_score

    @property
    def mask(self):
        return self._mask

    def to_dict(self):
        return {
            'min_area': self.min_area,
            'max_area': self.max_area,
            'threshold': self.threshold,
            'min_score': self.min_score,
            'mask': self._raw_mask
        }

class ObjectConfig():
    def __init__(self, global_config, config, frame_shape):
        self._track = config.get('track', global_config.get('track', DEFAULT_TRACKED_OBJECTS))
        self._raw_mask = config.get('mask')
        self._filters = { name: FilterConfig(global_config['filters'].get(name, {}), config['filters'].get(name, {}), self._raw_mask, frame_shape) for name in self._track }

    @property
    def track(self):
        return self._track

    @property
    def filters(self) -> Dict[str, FilterConfig]:
        return self._filters

    def to_dict(self):
        return {
            'track': self.track,
            'mask': self._raw_mask,
            'filters': { k: f.to_dict() for k, f in self.filters.items() }
        }

class CameraSnapshotsConfig():
    def __init__(self, global_config, config):
        self._enabled = config['enabled']
        self._timestamp = config['timestamp']
        self._bounding_box = config['bounding_box']
        self._crop = config['crop']
        self._height = config.get('height')
        self._retain = RetainConfig(global_config['snapshots']['retain'], config['retain'])
        self._required_zones = config['required_zones']
    
    @property
    def enabled(self):
        return self._enabled

    @property
    def timestamp(self):
        return self._timestamp

    @property
    def bounding_box(self):
        return self._bounding_box

    @property
    def crop(self):
        return self._crop

    @property
    def height(self):
        return self._height
    
    @property
    def retain(self):
        return self._retain

    @property
    def required_zones(self):
        return self._required_zones
    
    def to_dict(self):
        return {
            'enabled': self.enabled,
            'timestamp': self.timestamp,
            'bounding_box': self.bounding_box,
            'crop': self.crop,
            'height': self.height,
            'retain': self.retain.to_dict(),
            'required_zones': self.required_zones
        }

class CameraMqttConfig():
    def __init__(self, config):
        self._enabled = config['enabled']
        self._timestamp = config['timestamp']
        self._bounding_box = config['bounding_box']
        self._crop = config['crop']
        self._height = config.get('height')
        self._required_zones = config['required_zones']

    @property
    def enabled(self):
        return self._enabled

    @property
    def timestamp(self):
        return self._timestamp

    @property
    def bounding_box(self):
        return self._bounding_box

    @property
    def crop(self):
        return self._crop

    @property
    def height(self):
        return self._height

    @property
    def required_zones(self):
        return self._required_zones

    def to_dict(self):
        return {
            'enabled': self.enabled,
            'timestamp': self.timestamp,
            'bounding_box': self.bounding_box,
            'crop': self.crop,
            'height': self.height,
            'required_zones': self.required_zones
        }

class CameraClipsConfig():
    def __init__(self, global_config, config):
        self._enabled = config['enabled']
        self._pre_capture = config['pre_capture']
        self._post_capture = config['post_capture']
        self._objects = config.get('objects')
        self._retain = RetainConfig(global_config['clips']['retain'], config['retain'])
        self._required_zones = config['required_zones']
    
    @property
    def enabled(self):
        return self._enabled

    @property
    def pre_capture(self):
        return self._pre_capture

    @property
    def post_capture(self):
        return self._post_capture

    @property
    def objects(self):
        return self._objects

    @property
    def retain(self):
        return self._retain

    @property
    def required_zones(self):
        return self._required_zones

    def to_dict(self):
        return {
            'enabled': self.enabled,
            'pre_capture': self.pre_capture,
            'post_capture': self.post_capture,
            'objects': self.objects,
            'retain': self.retain.to_dict(),
            'required_zones': self.required_zones
        }

class CameraRtmpConfig():
    def __init__(self, global_config, config):
        self._enabled = config['enabled']

    @property
    def enabled(self):
        return self._enabled

    def to_dict(self):
        return {
            'enabled': self.enabled,
        }

class MotionConfig():
    def __init__(self, global_config, config, frame_shape):
        self._raw_mask = config.get('mask')
        if self._raw_mask:
            self._mask = create_mask(frame_shape, self._raw_mask)
        else:
            default_mask = np.zeros(frame_shape, np.uint8)
            default_mask[:] = 255
            self._mask = default_mask
        self._threshold = config.get('threshold', global_config.get('threshold', 25))
        self._contour_area = config.get('contour_area', global_config.get('contour_area', 100))
        self._delta_alpha = config.get('delta_alpha', global_config.get('delta_alpha', 0.2))
        self._frame_alpha = config.get('frame_alpha', global_config.get('frame_alpha', 0.2))
        self._frame_height = config.get('frame_height', global_config.get('frame_height', frame_shape[0]//6))

    @property
    def mask(self):
        return self._mask

    @property
    def threshold(self):
        return self._threshold

    @property
    def contour_area(self):
        return self._contour_area

    @property
    def delta_alpha(self):
        return self._delta_alpha

    @property
    def frame_alpha(self):
        return self._frame_alpha

    @property
    def frame_height(self):
        return self._frame_height

    def to_dict(self):
        return {
            'mask': self._raw_mask,
            'threshold': self.threshold,
            'contour_area': self.contour_area,
            'delta_alpha': self.delta_alpha,
            'frame_alpha': self.frame_alpha,
            'frame_height': self.frame_height,
        }



class DetectConfig():
    def __init__(self, global_config, config, camera_fps):
        self._enabled = config['enabled']
        self._max_disappeared = config.get('max_disappeared', global_config.get('max_disappeared', camera_fps*5))

    @property
    def enabled(self):
        return self._enabled

    @property
    def max_disappeared(self):
        return self._max_disappeared

    def to_dict(self):
        return {
            'enabled': self.enabled,
            'max_disappeared': self._max_disappeared,
        }

class ZoneConfig():
    def __init__(self, name, config):
        self._coordinates = config['coordinates']
        self._filters = { name: FilterConfig(c, c) for name, c in config['filters'].items() }

        if isinstance(self._coordinates, list):
            self._contour =  np.array([[int(p.split(',')[0]), int(p.split(',')[1])] for p in self._coordinates])
        elif isinstance(self._coordinates, str):
            points = self._coordinates.split(',')
            self._contour =  np.array([[int(points[i]), int(points[i+1])] for i in range(0, len(points), 2)])
        else:
            print(f"Unable to parse zone coordinates for {name}")
            self._contour = np.array([])

        self._color = (0,0,0)

    @property
    def coordinates(self):
        return self._coordinates

    @property
    def contour(self):
        return self._contour

    @contour.setter
    def contour(self, val):
        self._contour = val

    @property
    def color(self):
        return self._color

    @color.setter
    def color(self, val):
        self._color = val

    @property
    def filters(self):
        return self._filters

    def to_dict(self):
        return {
            'filters': {k: f.to_dict() for k, f in self.filters.items()},
            'coordinates': self._coordinates
        }

class CameraConfig():
    def __init__(self, name, config, global_config):
        self._name = name
        self._ffmpeg = CameraFfmpegConfig(global_config['ffmpeg'], config['ffmpeg'])
        self._height = config.get('height')
        self._width = config.get('width')
        self._frame_shape = (self._height, self._width)
        self._frame_shape_yuv = (self._frame_shape[0]*3//2, self._frame_shape[1])
        self._fps = config.get('fps')
        self._best_image_timeout = config['best_image_timeout']
        self._zones = { name: ZoneConfig(name, z) for name, z in config['zones'].items() }
        self._clips = CameraClipsConfig(global_config, config['clips'])
        self._record = RecordConfig(global_config['record'], config['record'])
        self._rtmp = CameraRtmpConfig(global_config, config['rtmp'])
        self._snapshots = CameraSnapshotsConfig(global_config, config['snapshots'])
        self._mqtt = CameraMqttConfig(config['mqtt'])
        self._objects = ObjectConfig(global_config['objects'], config.get('objects', {}), self._frame_shape)
        self._motion = MotionConfig(global_config['motion'], config['motion'], self._frame_shape)
        self._detect = DetectConfig(global_config['detect'], config['detect'], config.get('fps', 5))

        self._ffmpeg_cmds = []
        for ffmpeg_input in self._ffmpeg.inputs:
            ffmpeg_cmd = self._get_ffmpeg_cmd(ffmpeg_input)
            if ffmpeg_cmd is None:
                continue

            self._ffmpeg_cmds.append({
                'roles': ffmpeg_input.roles,
                'cmd': ffmpeg_cmd
            })


        self._set_zone_colors(self._zones)

    def _get_ffmpeg_cmd(self, ffmpeg_input):
        ffmpeg_output_args = []
        if 'detect' in ffmpeg_input.roles:
            ffmpeg_output_args = self.ffmpeg.output_args['detect'] + ffmpeg_output_args + ['pipe:']
            if self.fps:
                ffmpeg_output_args = ["-r", str(self.fps)] + ffmpeg_output_args
        if 'rtmp' in ffmpeg_input.roles and self.rtmp.enabled:
            ffmpeg_output_args = self.ffmpeg.output_args['rtmp'] + [
                f"rtmp://127.0.0.1/live/{self.name}"
            ] + ffmpeg_output_args
        if 'clips' in ffmpeg_input.roles:
            ffmpeg_output_args = self.ffmpeg.output_args['clips'] + [
                f"{os.path.join(CACHE_DIR, self.name)}-%Y%m%d%H%M%S.mp4"
            ] + ffmpeg_output_args
        if 'record' in ffmpeg_input.roles and self.record.enabled:
            ffmpeg_output_args = self.ffmpeg.output_args['record'] + [
                f"{os.path.join(RECORD_DIR, self.name)}-%Y%m%d%H%M%S.mp4"
            ] + ffmpeg_output_args

        # if there arent any outputs enabled for this input
        if len(ffmpeg_output_args) == 0:
            return None

        cmd = (['ffmpeg'] +
                ffmpeg_input.global_args +
                ffmpeg_input.hwaccel_args +
                ffmpeg_input.input_args +
                ['-i', ffmpeg_input.path] +
                ffmpeg_output_args)

        return [part for part in cmd if part != '']

    def _set_zone_colors(self, zones: Dict[str, ZoneConfig]):
        # set colors for zones
        all_zone_names = zones.keys()
        zone_colors = {}
        colors = plt.cm.get_cmap('tab10', len(all_zone_names))
        for i, zone in enumerate(all_zone_names):
            zone_colors[zone] = tuple(int(round(255 * c)) for c in colors(i)[:3])

        for name, zone in zones.items():
            zone.color = zone_colors[name]

    @property
    def name(self):
        return self._name

    @property
    def ffmpeg(self):
        return self._ffmpeg

    @property
    def height(self):
        return self._height

    @property
    def width(self):
        return self._width

    @property
    def fps(self):
        return self._fps

    @property
    def best_image_timeout(self):
        return self._best_image_timeout

    @property
    def zones(self)-> Dict[str, ZoneConfig]:
        return self._zones

    @property
    def clips(self):
        return self._clips

    @property
    def record(self):
        return self._record

    @property
    def rtmp(self):
        return self._rtmp

    @property
    def snapshots(self):
        return self._snapshots

    @property
    def mqtt(self):
        return self._mqtt

    @property
    def objects(self):
        return self._objects

    @property
    def motion(self):
        return self._motion

    @property
    def detect(self):
        return self._detect

    @property
    def frame_shape(self):
        return self._frame_shape

    @property
    def frame_shape_yuv(self):
        return self._frame_shape_yuv

    @property
    def ffmpeg_cmds(self):
        return self._ffmpeg_cmds

    def to_dict(self):
        return {
            'name': self.name,
            'height': self.height,
            'width': self.width,
            'fps': self.fps,
            'best_image_timeout': self.best_image_timeout,
            'zones': {k: z.to_dict() for k, z in self.zones.items()},
            'clips': self.clips.to_dict(),
            'record': self.record.to_dict(),
            'rtmp': self.rtmp.to_dict(),
            'snapshots': self.snapshots.to_dict(),
            'mqtt': self.mqtt.to_dict(),
            'objects': self.objects.to_dict(),
            'motion': self.motion.to_dict(),
            'detect': self.detect.to_dict(),
            'frame_shape': self.frame_shape,
            'ffmpeg_cmds': [{'roles': c['roles'], 'cmd': ' '.join(c['cmd'])} for c in self.ffmpeg_cmds],
        }


class FrigateConfig():
    def __init__(self, config_file=None, config=None):
        if config is None and config_file is None:
            raise ValueError('config or config_file must be defined')
        elif not config_file is None:
            config = self._load_file(config_file)

        config = FRIGATE_CONFIG_SCHEMA(config)

        config = self._sub_env_vars(config)

        self._database = DatabaseConfig(config['database'])
        self._model = ModelConfig(config['model'])
        self._detectors = { name: DetectorConfig(d) for name, d in config['detectors'].items() }
        self._mqtt = MqttConfig(config['mqtt'])
        self._clips = ClipsConfig(config['clips'])
        self._snapshots = SnapshotsConfig(config['snapshots'])
        self._cameras = { name: CameraConfig(name, c, config) for name, c in config['cameras'].items() }
        self._logger = LoggerConfig(config['logger'])
        self._environment_vars = config['environment_vars']

    def _sub_env_vars(self, config):
        frigate_env_vars = {k: v for k, v in os.environ.items() if k.startswith('FRIGATE_')}

        if 'password' in config['mqtt']:
            config['mqtt']['password'] = config['mqtt']['password'].format(**frigate_env_vars)

        for camera in config['cameras'].values():
            for i in camera['ffmpeg']['inputs']:
                i['path'] = i['path'].format(**frigate_env_vars)

        return config

    def _load_file(self, config_file):
        with open(config_file) as f:
            raw_config = f.read()

        if config_file.endswith(".yml"):
            config = yaml.safe_load(raw_config)
        elif config_file.endswith(".json"):
            config = json.loads(raw_config)

        return config

    def to_dict(self):
        return {
            'database': self.database.to_dict(),
            'model': self.model.to_dict(),
            'detectors': {k: d.to_dict() for k, d in self.detectors.items()},
            'mqtt': self.mqtt.to_dict(),
            'clips': self.clips.to_dict(),
            'snapshots': self.snapshots.to_dict(),
            'cameras': {k: c.to_dict() for k, c in self.cameras.items()},
            'logger': self.logger.to_dict(),
            'environment_vars': self._environment_vars
        }

    @property
    def database(self):
        return self._database

    @property
    def model(self):
        return self._model

    @property
    def detectors(self) -> Dict[str, DetectorConfig]:
        return self._detectors

    @property
    def logger(self):
        return self._logger

    @property
    def mqtt(self):
        return self._mqtt

    @property
    def clips(self):
        return self._clips

    @property
    def snapshots(self):
        return self._snapshots

    @property
    def cameras(self) -> Dict[str, CameraConfig]:
        return self._cameras

    @property
    def environment_vars(self):
        return self._environment_vars
