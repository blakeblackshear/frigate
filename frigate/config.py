import base64
import json
import os
import yaml

from typing import Dict

import cv2
import matplotlib.pyplot as plt
import numpy as np
import voluptuous as vol

from frigate.util import get_frame_shape

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

SAVE_CLIPS_SCHEMA = vol.Schema(
    {
        vol.Optional('max_seconds', default=300): int,
        vol.Optional('clips_dir', default='/media/frigate/clips'): str,
        vol.Optional('cache_dir', default='/tmp/cache'): str
    }
)

FFMPEG_GLOBAL_ARGS_DEFAULT = ['-hide_banner','-loglevel','panic']
FFMPEG_INPUT_ARGS_DEFAULT = ['-avoid_negative_ts', 'make_zero',
    '-fflags', 'nobuffer',
    '-flags', 'low_delay',
    '-strict', 'experimental',
    '-fflags', '+genpts+discardcorrupt',
    '-rtsp_transport', 'tcp',
    '-stimeout', '5000000',
    '-use_wallclock_as_timestamps', '1']
FFMPEG_OUTPUT_ARGS_DEFAULT = ['-f', 'rawvideo',
    '-pix_fmt', 'yuv420p']

GLOBAL_FFMPEG_SCHEMA = vol.Schema(
    { 
        vol.Optional('global_args', default=FFMPEG_GLOBAL_ARGS_DEFAULT):  [str],
        vol.Optional('hwaccel_args', default=[]): [str],
        vol.Optional('input_args', default=FFMPEG_INPUT_ARGS_DEFAULT): [str],
        vol.Optional('output_args', default=FFMPEG_OUTPUT_ARGS_DEFAULT): [str]
    }
)

FILTER_SCHEMA = vol.Schema(
    { 
        str: {
                vol.Optional('min_area', default=0): int,
                vol.Optional('max_area', default=24000000): int,
                vol.Optional('threshold', default=0.85): float
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
        # TODO: this should populate filters for all tracked objects
        vol.Optional('filters', default = {}): FILTER_SCHEMA.extend({ str: {vol.Optional('min_score', default=0.5): float}})
    }
))

DEFAULT_CAMERA_MQTT = {
    'crop_to_region': True
}
DEFAULT_CAMERA_SAVE_CLIPS = {
    'enabled': False
}
DEFAULT_CAMERA_SNAPSHOTS = {
    'show_timestamp': True,
    'draw_zones': False,
    'draw_bounding_boxes': True
}

CAMERA_FFMPEG_SCHEMA = vol.Schema(
    { 
        vol.Required('input'): str, 
        'global_args':  [str],
        'hwaccel_args': [str],
        'input_args': [str],
        'output_args': [str]
    }
)

CAMERAS_SCHEMA = vol.Schema(
    {
        str: {
            vol.Required('ffmpeg'): CAMERA_FFMPEG_SCHEMA,
            vol.Required('height'): int,
            vol.Required('width'): int,
            'fps': int,
            'mask': str,
            vol.Optional('best_image_timeout', default=60): int,
            vol.Optional('mqtt', default=DEFAULT_CAMERA_MQTT): {
                vol.Optional('crop_to_region', default=True): bool,
                'snapshot_height': int
            },
            vol.Optional('zones', default={}):  {
                str: {
                    vol.Required('coordinates'): vol.Any(str, [str]),
                    'filters': FILTER_SCHEMA
                }
             },
             vol.Optional('save_clips', default=DEFAULT_CAMERA_SAVE_CLIPS): {
                vol.Optional('enabled', default=False): bool,
                vol.Optional('pre_capture', default=30): int,
                'objects': [str],
             },
             vol.Optional('snapshots', default=DEFAULT_CAMERA_SNAPSHOTS): {
                vol.Optional('show_timestamp', default=True): bool,
                vol.Optional('draw_zones', default=False): bool,
                vol.Optional('draw_bounding_boxes', default=True): bool
             },
             'objects': OBJECTS_SCHEMA
        }
    }
)

FRIGATE_CONFIG_SCHEMA = vol.Schema(
    {
        vol.Optional('web_port', default=5000): int,
        vol.Optional('detectors', default=DEFAULT_DETECTORS): DETECTORS_SCHEMA,
        'mqtt': MQTT_SCHEMA,
        vol.Optional('save_clips', default={}): SAVE_CLIPS_SCHEMA,
        vol.Optional('ffmpeg', default={}): GLOBAL_FFMPEG_SCHEMA,
        vol.Optional('objects', default={}): OBJECTS_SCHEMA,
        vol.Required('cameras', default={}): CAMERAS_SCHEMA
    }
)

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

class SaveClipsConfig():
    def __init__(self, config):
        self._max_seconds = config['max_seconds']
        self._clips_dir = config['clips_dir']
        self._cache_dir = config['cache_dir']
    
    @property
    def max_seconds(self):
        return self._max_seconds
    
    @property
    def clips_dir(self):
        return self._clips_dir
    
    @property
    def cache_dir(self):
        return self._cache_dir

class FfmpegConfig():
    def __init__(self, global_config, config):
        self._input = config.get('input')
        self._global_args = config.get('global_args', global_config['global_args'])
        self._hwaccel_args = config.get('hwaccel_args', global_config['hwaccel_args'])
        self._input_args = config.get('input_args', global_config['input_args'])
        self._output_args = config.get('output_args', global_config['output_args'])
    
    @property
    def input(self):
        return self._input
    
    @property
    def global_args(self):
        return self._global_args
    
    @property
    def hwaccel_args(self):
        return self._hwaccel_args

    @property
    def input_args(self):
        return self._input_args
    
    @property
    def output_args(self):
        return self._output_args

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

class CameraSnapshotsConfig():
    def __init__(self, config):
        self._show_timestamp = config['show_timestamp']
        self._draw_zones = config['draw_zones']
        self._draw_bounding_boxes = config['draw_bounding_boxes']
    
    @property
    def show_timestamp(self):
        return self._show_timestamp
    
    @property
    def draw_zones(self):
        return self._draw_zones

    @property
    def draw_bounding_boxes(self):
        return self._draw_bounding_boxes

class CameraSaveClipsConfig():
    def __init__(self, config):
        self._enabled = config['enabled']
        self._pre_capture = config['pre_capture']
        self._objects = config.get('objects')
    
    @property
    def enabled(self):
        return self._enabled
    
    @property
    def pre_capture(self):
        return self._pre_capture

    @property
    def objects(self):
        return self._objects

class CameraMqttConfig():
    def __init__(self, config):
        self._crop_to_region = config['crop_to_region']
        self._snapshot_height = config.get('snapshot_height')
    
    @property
    def crop_to_region(self):
        return self._crop_to_region
    
    @property
    def snapshot_height(self):
        return self._snapshot_height

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

class CameraConfig():
    def __init__(self, name, config, cache_dir, global_ffmpeg, global_objects):
        self._name = name
        self._ffmpeg = FfmpegConfig(global_ffmpeg, config['ffmpeg'])
        self._height = config.get('height')
        self._width = config.get('width')
        self._frame_shape = (self._height, self._width)
        self._frame_shape_yuv = (self._frame_shape[0]*3//2, self._frame_shape[1])
        self._fps = config.get('fps')
        self._mask = self._create_mask(config.get('mask'))
        self._best_image_timeout = config['best_image_timeout']
        self._mqtt = CameraMqttConfig(config['mqtt'])
        self._zones = { name: ZoneConfig(name, z) for name, z in config['zones'].items() }
        self._save_clips = CameraSaveClipsConfig(config['save_clips'])
        self._snapshots = CameraSnapshotsConfig(config['snapshots'])
        self._objects = ObjectConfig(global_objects, config.get('objects', {}))

        self._ffmpeg_cmd = self._get_ffmpeg_cmd(cache_dir)

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

    def _get_ffmpeg_cmd(self, cache_dir):
        ffmpeg_output_args = self.ffmpeg.output_args
        if self.fps:
            ffmpeg_output_args = ["-r", str(self.fps)] + ffmpeg_output_args
        if self.save_clips.enabled:
            ffmpeg_output_args = [
                "-f",
                "segment",
                "-segment_time",
                "10",
                "-segment_format",
                "mp4",
                "-reset_timestamps",
                "1",
                "-strftime",
                "1",
                "-c",
                "copy",
                "-an",
                f"{os.path.join(cache_dir, self.name)}-%Y%m%d%H%M%S.mp4"
            ] + ffmpeg_output_args
        return (['ffmpeg'] +
                self.ffmpeg.global_args +
                self.ffmpeg.hwaccel_args +
                self.ffmpeg.input_args +
                ['-i', self.ffmpeg.input] +
                ffmpeg_output_args +
                ['pipe:'])
    
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
    def mqtt(self):
        return self._mqtt
    
    @property
    def zones(self)-> Dict[str, ZoneConfig]:
        return self._zones
    
    @property
    def save_clips(self):
        return self._save_clips
    
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
    def ffmpeg_cmd(self):
        return self._ffmpeg_cmd

class FrigateConfig():
    def __init__(self, config_file=None, config=None):
        if config is None and config_file is None:
            raise ValueError('config or config_file must be defined')
        elif not config_file is None:
            config = self._load_file(config_file)
        
        config = FRIGATE_CONFIG_SCHEMA(config)

        config = self._sub_env_vars(config)

        self._web_port = config['web_port']
        self._detectors = { name: DetectorConfig(d) for name, d in config['detectors'].items() }
        self._mqtt = MqttConfig(config['mqtt'])
        self._save_clips = SaveClipsConfig(config['save_clips'])
        self._cameras = { name: CameraConfig(name, c, self._save_clips.cache_dir, config['ffmpeg'], config['objects']) for name, c in config['cameras'].items() }

        self._ensure_dirs()

    def _sub_env_vars(self, config):
        frigate_env_vars = {k: v for k, v in os.environ.items() if k.startswith('FRIGATE_')}

        if 'password' in config['mqtt']:
            config['mqtt']['password'] = config['mqtt']['password'].format(**frigate_env_vars) 
        
        for camera in config['cameras'].values():
            camera['ffmpeg']['input'] = camera['ffmpeg']['input'].format(**frigate_env_vars)
        
        return config
    
    def _ensure_dirs(self):
        cache_dir = self.save_clips.cache_dir
        clips_dir = self.save_clips.clips_dir

        if not os.path.exists(cache_dir) and not os.path.islink(cache_dir):
            os.makedirs(cache_dir)
        if not os.path.exists(clips_dir) and not os.path.islink(clips_dir):
            os.makedirs(clips_dir)

    def _load_file(self, config_file):
        with open(config_file) as f:
            raw_config = f.read()
        
        if config_file.endswith(".yml"):    
            config = yaml.safe_load(raw_config)
        elif config_file.endswith(".json"):
            config = json.loads(raw_config)
        
        return config
    
    @property
    def web_port(self):
        return self._web_port
    
    @property
    def detectors(self) -> Dict[str, DetectorConfig]:
        return self._detectors
    
    @property
    def mqtt(self):
        return self._mqtt
    
    @property
    def save_clips(self):
        return self._save_clips

    @property
    def cameras(self) -> Dict[str, CameraConfig]:
        return self._cameras