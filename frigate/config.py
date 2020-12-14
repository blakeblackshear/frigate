import base64
import json
import os
from typing import Dict

import cv2
import matplotlib.pyplot as plt
import numpy as np
import voluptuous as vol
import yaml

from frigate.const import RECORD_DIR, CLIPS_DIR, CACHE_DIR

DETECTORS_SCHEMA = vol.Schema(
    {
        vol.Required(str): {
            vol.Required('type', default='edgetpu'): vol.In(['cpu', 'edgetpu']), 
            vol.Optional('device', default='usb'): str
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
        'user': str,
        'password': str
    }
)

SAVE_CLIPS_RETAIN_SCHEMA = vol.Schema(
    {
        vol.Required('default',default=10): int,
        'objects': {
            str: int
        }
    }
)

SAVE_CLIPS_SCHEMA = vol.Schema(
    {
        vol.Optional('max_seconds', default=300): int,
        vol.Optional('retain', default={}): SAVE_CLIPS_RETAIN_SCHEMA
    }
)

FFMPEG_GLOBAL_ARGS_DEFAULT = ['-hide_banner','-loglevel','fatal']
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

FILTER_SCHEMA = vol.Schema(
    { 
        str: {
                vol.Optional('min_area', default=0): int,
                vol.Optional('max_area', default=24000000): int,
                vol.Optional('threshold', default=0.7): float
            }
    }
)

def filters_for_all_tracked_objects(object_config):
    for tracked_object in object_config.get('track', ['person']):
        if not 'filters' in object_config:
            object_config['filters'] = {}
        if not tracked_object in object_config['filters']:
            object_config['filters'][tracked_object] = {}
    return object_config

OBJECTS_SCHEMA = vol.Schema(vol.All(filters_for_all_tracked_objects,
    {
        vol.Optional('track', default=['person']): [str],
        vol.Optional('filters', default = {}): FILTER_SCHEMA.extend({ str: {vol.Optional('min_score', default=0.5): float}})
    }
))

DEFAULT_CAMERA_SAVE_CLIPS = {
    'enabled': False
}
DEFAULT_CAMERA_SNAPSHOTS = {
    'show_timestamp': True,
    'draw_zones': False,
    'draw_bounding_boxes': True,
    'crop_to_region': True
}

def each_role_used_once(inputs):
    roles = [role for i in inputs for role in i['roles']]
    roles_set = set(roles)
    if len(roles) > len(roles_set):
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
        }], vol.Msg(each_role_used_once, msg="Each input role may only be used once")), 
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
            'mask': str,
            vol.Optional('best_image_timeout', default=60): int,
            vol.Optional('zones', default={}):  {
                str: {
                    vol.Required('coordinates'): vol.Any(str, [str]),
                    vol.Optional('filters', default={}): FILTER_SCHEMA
                }
            },
            vol.Optional('save_clips', default=DEFAULT_CAMERA_SAVE_CLIPS): {
                vol.Optional('enabled', default=False): bool,
                vol.Optional('pre_capture', default=30): int,
                'objects': [str],
                vol.Optional('retain', default={}): SAVE_CLIPS_RETAIN_SCHEMA,
            },
            vol.Optional('record', default={}): {
                'enabled': bool,
                'retain_days': int,
            },
            vol.Optional('rtmp', default={}): {
                vol.Required('enabled', default=True): bool,
            },
            vol.Optional('snapshots', default=DEFAULT_CAMERA_SNAPSHOTS): {
                vol.Optional('show_timestamp', default=True): bool,
                vol.Optional('draw_zones', default=False): bool,
                vol.Optional('draw_bounding_boxes', default=True): bool,
                vol.Optional('crop_to_region', default=True): bool,
                vol.Optional('height', default=175): int
            },
            'objects': OBJECTS_SCHEMA
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
        vol.Optional('save_clips', default={}): SAVE_CLIPS_SCHEMA,
        vol.Optional('record', default={}): {
            vol.Optional('enabled', default=False): bool,
            vol.Optional('retain_days', default=30): int,
        },
        vol.Optional('ffmpeg', default={}): GLOBAL_FFMPEG_SCHEMA,
        vol.Optional('objects', default={}): OBJECTS_SCHEMA,
        vol.Required('cameras', default={}): CAMERAS_SCHEMA
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
    
    @property
    def type(self):
        return self._type
    
    @property
    def device(self):
        return self._device
    
    def to_dict(self):
        return {
            'type': self.type,
            'device': self.device
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

    def to_dict(self):
        return {
            'host': self.host,
            'port': self.port,
            'topic_prefix': self.topic_prefix,
            'client_id': self.client_id,
            'user': self.user
        }

class CameraInput():
    def __init__(self, global_config, ffmpeg_input):
        self._path = ffmpeg_input['path']
        self._roles = ffmpeg_input['roles']
        self._global_args = ffmpeg_input.get('global_args', global_config['global_args'])
        self._hwaccel_args = ffmpeg_input.get('hwaccel_args', global_config['hwaccel_args'])
        self._input_args = ffmpeg_input.get('input_args', global_config['input_args'])
    
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
        self._inputs = [CameraInput(global_config, i) for i in config['inputs']]
        self._output_args = config.get('output_args', global_config['output_args'])
    
    @property
    def inputs(self):
        return self._inputs
    
    @property
    def output_args(self):
        return {k: v if isinstance(v, list) else v.split(' ') for k, v in self._output_args.items()}

class SaveClipsRetainConfig():
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

class SaveClipsConfig():
    def __init__(self, config):
        self._max_seconds = config['max_seconds']
        self._retain = SaveClipsRetainConfig(config['retain'], config['retain'])
    
    @property
    def max_seconds(self):
        return self._max_seconds

    @property
    def retain(self):
        return self._retain
    
    def to_dict(self):
        return {
            'max_seconds': self.max_seconds,
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
    def __init__(self, config):
        self._min_area = config['min_area']
        self._max_area = config['max_area']
        self._threshold = config['threshold']
        self._min_score = config.get('min_score')
    
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
    
    def to_dict(self):
        return {
            'min_area': self.min_area,
            'max_area': self.max_area,
            'threshold': self.threshold,
            'min_score': self.min_score
        }

class ObjectConfig():
    def __init__(self, global_config, config):
        self._track = config.get('track', global_config['track'])
        if 'filters' in config:
            self._filters = { name: FilterConfig(c) for name, c in config['filters'].items() }
        else:
            self._filters = { name: FilterConfig(c) for name, c in global_config['filters'].items() }
    
    @property
    def track(self):
        return self._track
    
    @property
    def filters(self) -> Dict[str, FilterConfig]:
        return self._filters

    def to_dict(self):
        return {
            'track': self.track,
            'filters': { k: f.to_dict() for k, f in self.filters.items() }
        }

class CameraSnapshotsConfig():
    def __init__(self, config):
        self._show_timestamp = config['show_timestamp']
        self._draw_zones = config['draw_zones']
        self._draw_bounding_boxes = config['draw_bounding_boxes']
        self._crop_to_region = config['crop_to_region']
        self._height = config.get('height')
    
    @property
    def show_timestamp(self):
        return self._show_timestamp
    
    @property
    def draw_zones(self):
        return self._draw_zones

    @property
    def draw_bounding_boxes(self):
        return self._draw_bounding_boxes

    @property
    def crop_to_region(self):
        return self._crop_to_region

    @property
    def height(self):
        return self._height
    
    def to_dict(self):
        return {
            'show_timestamp': self.show_timestamp,
            'draw_zones': self.draw_zones,
            'draw_bounding_boxes': self.draw_bounding_boxes,
            'crop_to_region': self.crop_to_region,
            'height': self.height
        }

class CameraSaveClipsConfig():
    def __init__(self, global_config, config):
        self._enabled = config['enabled']
        self._pre_capture = config['pre_capture']
        self._objects = config.get('objects', global_config['objects']['track'])
        self._retain = SaveClipsRetainConfig(global_config['save_clips']['retain'], config['retain'])
    
    @property
    def enabled(self):
        return self._enabled
    
    @property
    def pre_capture(self):
        return self._pre_capture

    @property
    def objects(self):
        return self._objects
    
    @property
    def retain(self):
        return self._retain
    
    def to_dict(self):
        return {
            'enabled': self.enabled,
            'pre_capture': self.pre_capture,
            'objects': self.objects,
            'retain': self.retain.to_dict()
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

class ZoneConfig():
    def __init__(self, name, config):
        self._coordinates = config['coordinates']
        self._filters = { name: FilterConfig(c) for name, c in config['filters'].items() }

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
            'filters': {k: f.to_dict() for k, f in self.filters.items()}
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
        self._mask = self._create_mask(config.get('mask'))
        self._best_image_timeout = config['best_image_timeout']
        self._zones = { name: ZoneConfig(name, z) for name, z in config['zones'].items() }
        self._save_clips = CameraSaveClipsConfig(global_config, config['save_clips'])
        self._record = RecordConfig(global_config['record'], config['record'])
        self._rtmp = CameraRtmpConfig(global_config, config['rtmp'])
        self._snapshots = CameraSnapshotsConfig(config['snapshots'])
        self._objects = ObjectConfig(global_config['objects'], config.get('objects', {}))

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

    def _create_mask(self, mask):
        if mask:
            if mask.startswith('base64,'):
                img = base64.b64decode(mask[7:]) 
                np_img = np.fromstring(img, dtype=np.uint8)
                mask_img = cv2.imdecode(np_img, cv2.IMREAD_GRAYSCALE)
            elif mask.startswith('poly,'):
                points = mask.split(',')[1:]
                contour =  np.array([[int(points[i]), int(points[i+1])] for i in range(0, len(points), 2)])
                mask_img = np.zeros(self.frame_shape, np.uint8)
                mask_img[:] = 255
                cv2.fillPoly(mask_img, pts=[contour], color=(0))
            else:
                mask_img = cv2.imread(f"/config/{mask}", cv2.IMREAD_GRAYSCALE)
        else:
            mask_img = None

        if mask_img is None or mask_img.size == 0:
            mask_img = np.zeros(self.frame_shape, np.uint8)
            mask_img[:] = 255
        
        return mask_img

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
        if 'clips' in ffmpeg_input.roles and self.save_clips.enabled:
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
    def mask(self):
        return self._mask
    
    @property
    def best_image_timeout(self):
        return self._best_image_timeout
    
    @property
    def zones(self)-> Dict[str, ZoneConfig]:
        return self._zones
    
    @property
    def save_clips(self):
        return self._save_clips
    
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
    def objects(self):
        return self._objects

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
            'save_clips': self.save_clips.to_dict(),
            'record': self.record.to_dict(),
            'rtmp': self.rtmp.to_dict(),
            'snapshots': self.snapshots.to_dict(),
            'objects': self.objects.to_dict(),
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
        self._save_clips = SaveClipsConfig(config['save_clips'])
        self._cameras = { name: CameraConfig(name, c, config) for name, c in config['cameras'].items() }
        self._logger = LoggerConfig(config['logger'])

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
            'save_clips': self.save_clips.to_dict(),
            'cameras': {k: c.to_dict() for k, c in self.cameras.items()},
            'logger': self.logger.to_dict()
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
    def save_clips(self):
        return self._save_clips

    @property
    def cameras(self) -> Dict[str, CameraConfig]:
        return self._cameras
