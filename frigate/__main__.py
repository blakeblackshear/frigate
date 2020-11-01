import os 
import json
import yaml
import multiprocessing as mp

from playhouse.sqlite_ext import *

from frigate.config import FRIGATE_CONFIG_SCHEMA
from frigate.http import create_app
from frigate.models import Event
from frigate.mqtt import create_mqtt_client
class FrigateApp():
    def __init__(self, stop: mp.Event):
        self.stop = stop
        self.config = None
    
    def init_config(self):
        config_file = os.environ.get('CONFIG_FILE', '/config/config.yml')

        if config_file.endswith(".yml"):
            with open(config_file) as f:
                config = yaml.safe_load(f)
        elif config_file.endswith(".json"):
            with open(config_file) as f:
                config = json.load(f)
        
        self.config = FRIGATE_CONFIG_SCHEMA(config)

        # TODO: sub in FRIGATE_ENV vars

    def init_database(self):
        self.db = SqliteExtDatabase(f"/{os.path.join(self.config['save_clips']['clips_dir'], 'frigate.db')}")
        models = [Event]
        self.db.bind(models)
        self.db.create_tables(models, safe=True)

    def init_web_server(self):
        self.flask_app = create_app(self.db)

    def init_mqtt(self):
        # TODO: create config class
        mqtt_config = self.config['mqtt']
        self.mqtt_client = create_mqtt_client(
            mqtt_config['host'],
            mqtt_config['port'],
            mqtt_config['topic_prefix'],
            mqtt_config['client_id'],
            mqtt_config.get('user'),
            mqtt_config.get('password')
        )

    def start_detectors(self):
        pass

    def start_detection_processor(self):
        pass

    def start_frame_processors(self):
        pass

    def start_camera_capture_processes(self):
        pass

    def start_watchdog(self):
        pass

    def start(self):
        self.init_config()
        self.init_database()
        self.init_web_server()
        self.init_mqtt()
        self.start_detectors()
        self.start_detection_processor()
        self.start_frame_processors()
        self.start_camera_capture_processes()
        self.start_watchdog()
        self.flask_app.run(host='0.0.0.0', port=self.config['web_port'], debug=False)

if __name__ == '__main__':
    # register stop handler
    stop_event = mp.Event()
    frigate_app = FrigateApp(stop_event)
    frigate_app.start()
    # main()
