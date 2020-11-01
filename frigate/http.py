import os

from flask import (
    Flask, Blueprint, jsonify
)
from peewee import SqliteDatabase
from playhouse.shortcuts import model_to_dict

from frigate.models import Event

bp = Blueprint('frigate', __name__)

def create_app(database: SqliteDatabase):
    app = Flask(__name__)

    @app.before_request
    def _db_connect():
        database.connect()

    @app.teardown_request
    def _db_close(exc):
        if not database.is_closed():
            database.close()
    
    app.register_blueprint(bp)

    return app

@bp.route('/')
def is_healthy():
    return "Frigate is running. Alive and healthy!"

@bp.route('/events')
def events():
    events = Event.select()
    return jsonify([model_to_dict(e) for e in events])

# @app.route('/debug/stats')
# def stats():
#     stats = {}

#     total_detection_fps = 0

#     for name, camera_stats in camera_process_info.items():
#         total_detection_fps += camera_stats['detection_fps'].value
#         stats[name] = {
#             'camera_fps': round(camera_stats['camera_fps'].value, 2),
#             'process_fps': round(camera_stats['process_fps'].value, 2),
#             'skipped_fps': round(camera_stats['skipped_fps'].value, 2),
#             'detection_fps': round(camera_stats['detection_fps'].value, 2),
#             'pid': camera_stats['process'].pid,
#             'capture_pid': camera_stats['capture_process'].pid,
#             'frame_info': {
#                 'detect': camera_stats['detection_frame'].value,
#                 'process': object_processor.camera_data[name]['current_frame_time']
#             }
#         }
    
#     stats['detectors'] = {}
#     for name, detector in detectors.items():
#         stats['detectors'][name] = {
#             'inference_speed': round(detector.avg_inference_speed.value*1000, 2),
#             'detection_start': detector.detection_start.value,
#             'pid': detector.detect_process.pid
#         }
#     stats['detection_fps'] = round(total_detection_fps, 2)

#     return jsonify(stats)

# @app.route('/<camera_name>/<label>/best.jpg')
# def best(camera_name, label):
#     if camera_name in CONFIG['cameras']:
#         best_object = object_processor.get_best(camera_name, label)
#         best_frame = best_object.get('frame')
#         if best_frame is None:
#             best_frame = np.zeros((720,1280,3), np.uint8)
#         else:
#             best_frame = cv2.cvtColor(best_frame, cv2.COLOR_YUV2BGR_I420)
        
#         crop = bool(request.args.get('crop', 0, type=int))
#         if crop:
#             region = best_object.get('region', [0,0,300,300])
#             best_frame = best_frame[region[1]:region[3], region[0]:region[2]]
        
#         height = int(request.args.get('h', str(best_frame.shape[0])))
#         width = int(height*best_frame.shape[1]/best_frame.shape[0])

#         best_frame = cv2.resize(best_frame, dsize=(width, height), interpolation=cv2.INTER_AREA)
#         ret, jpg = cv2.imencode('.jpg', best_frame)
#         response = make_response(jpg.tobytes())
#         response.headers['Content-Type'] = 'image/jpg'
#         return response
#     else:
#         return "Camera named {} not found".format(camera_name), 404

# @app.route('/<camera_name>')
# def mjpeg_feed(camera_name):
#     fps = int(request.args.get('fps', '3'))
#     height = int(request.args.get('h', '360'))
#     if camera_name in CONFIG['cameras']:
#         # return a multipart response
#         return Response(imagestream(camera_name, fps, height),
#                         mimetype='multipart/x-mixed-replace; boundary=frame')
#     else:
#         return "Camera named {} not found".format(camera_name), 404

# @app.route('/<camera_name>/latest.jpg')
# def latest_frame(camera_name):
#     if camera_name in CONFIG['cameras']:
#         # max out at specified FPS
#         frame = object_processor.get_current_frame(camera_name)
#         if frame is None:
#             frame = np.zeros((720,1280,3), np.uint8)

#         height = int(request.args.get('h', str(frame.shape[0])))
#         width = int(height*frame.shape[1]/frame.shape[0])

#         frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_AREA)

#         ret, jpg = cv2.imencode('.jpg', frame)
#         response = make_response(jpg.tobytes())
#         response.headers['Content-Type'] = 'image/jpg'
#         return response
#     else:
#         return "Camera named {} not found".format(camera_name), 404
        
# def imagestream(camera_name, fps, height):
#     while True:
#         # max out at specified FPS
#         time.sleep(1/fps)
#         frame = object_processor.get_current_frame(camera_name, draw=True)
#         if frame is None:
#             frame = np.zeros((height,int(height*16/9),3), np.uint8)

#         width = int(height*frame.shape[1]/frame.shape[0])
#         frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_LINEAR)

#         ret, jpg = cv2.imencode('.jpg', frame)
#         yield (b'--frame\r\n'
#             b'Content-Type: image/jpeg\r\n\r\n' + jpg.tobytes() + b'\r\n\r\n')

# app.run(host='0.0.0.0', port=WEB_PORT, debug=False)