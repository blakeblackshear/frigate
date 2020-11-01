import voluptuous as vol

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
        vol.Optional('clips_dir', default='/clips'): str,
        vol.Optional('cache_dir', default='/cache'): str
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

OBJECTS_SCHEMA = vol.Schema(
    {
        vol.Optional('track', default=['person']): [str],
        'filters': FILTER_SCHEMA.extend({vol.Optional('min_score', default=0.5): float})
    }
)

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
            'height': int,
            'width': int,
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
