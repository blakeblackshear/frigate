import os
import time

import cv2
import numpy as np

from flask import (
    Flask, Blueprint, jsonify, request, Response, current_app, make_response
)
from peewee import SqliteDatabase
from playhouse.shortcuts import model_to_dict

from frigate.models import Event

bp = Blueprint('frigate', __name__)

def create_app(frigate_config, database: SqliteDatabase, camera_metrics, detectors, detected_frames_processor):
    app = Flask(__name__)

    @app.before_request
    def _db_connect():
        database.connect()

    @app.teardown_request
    def _db_close(exc):
        if not database.is_closed():
            database.close()

    app.frigate_config = frigate_config
    app.camera_metrics = camera_metrics
    app.detectors = detectors
    app.detected_frames_processor = detected_frames_processor
    
    app.register_blueprint(bp)

    return app

@bp.route('/')
def is_healthy():
    return "Frigate is running. Alive and healthy!"

@bp.route('/events')
def events():
    events = Event.select()
    return jsonify([model_to_dict(e) for e in events])

@bp.route('/debug/stats')
def stats():
    camera_metrics = current_app.camera_metrics
    stats = {}

    total_detection_fps = 0

    for name, camera_stats in camera_metrics.items():
        total_detection_fps += camera_stats['detection_fps'].value
        stats[name] = {
            'camera_fps': round(camera_stats['camera_fps'].value, 2),
            'process_fps': round(camera_stats['process_fps'].value, 2),
            'skipped_fps': round(camera_stats['skipped_fps'].value, 2),
            'detection_fps': round(camera_stats['detection_fps'].value, 2),
            'pid': camera_stats['process'].pid,
            'capture_pid': camera_stats['capture_process'].pid
        }
    
    stats['detectors'] = {}
    for name, detector in current_app.detectors.items():
        stats['detectors'][name] = {
            'inference_speed': round(detector.avg_inference_speed.value*1000, 2),
            'detection_start': detector.detection_start.value,
            'pid': detector.detect_process.pid
        }
    stats['detection_fps'] = round(total_detection_fps, 2)

    return jsonify(stats)

@bp.route('/<camera_name>/<label>/best.jpg')
def best(camera_name, label):
    if camera_name in current_app.frigate_config.cameras:
        best_object = current_app.detected_frames_processor.get_best(camera_name, label)
        best_frame = best_object.get('frame')
        if best_frame is None:
            best_frame = np.zeros((720,1280,3), np.uint8)
        else:
            best_frame = cv2.cvtColor(best_frame, cv2.COLOR_YUV2BGR_I420)
        
        crop = bool(request.args.get('crop', 0, type=int))
        if crop:
            region = best_object.get('region', [0,0,300,300])
            best_frame = best_frame[region[1]:region[3], region[0]:region[2]]
        
        height = int(request.args.get('h', str(best_frame.shape[0])))
        width = int(height*best_frame.shape[1]/best_frame.shape[0])

        best_frame = cv2.resize(best_frame, dsize=(width, height), interpolation=cv2.INTER_AREA)
        ret, jpg = cv2.imencode('.jpg', best_frame)
        response = make_response(jpg.tobytes())
        response.headers['Content-Type'] = 'image/jpg'
        return response
    else:
        return "Camera named {} not found".format(camera_name), 404

@bp.route('/<camera_name>')
def mjpeg_feed(camera_name):
    fps = int(request.args.get('fps', '3'))
    height = int(request.args.get('h', '360'))
    if camera_name in current_app.frigate_config.cameras:
        # return a multipart response
        return Response(imagestream(current_app.detected_frames_processor, camera_name, fps, height),
                        mimetype='multipart/x-mixed-replace; boundary=frame')
    else:
        return "Camera named {} not found".format(camera_name), 404

@bp.route('/<camera_name>/latest.jpg')
def latest_frame(camera_name):
    if camera_name in current_app.frigate_config.cameras:
        # max out at specified FPS
        frame = current_app.detected_frames_processor.get_current_frame(camera_name)
        if frame is None:
            frame = np.zeros((720,1280,3), np.uint8)

        height = int(request.args.get('h', str(frame.shape[0])))
        width = int(height*frame.shape[1]/frame.shape[0])

        frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_AREA)

        ret, jpg = cv2.imencode('.jpg', frame)
        response = make_response(jpg.tobytes())
        response.headers['Content-Type'] = 'image/jpg'
        return response
    else:
        return "Camera named {} not found".format(camera_name), 404
        
def imagestream(detected_frames_processor, camera_name, fps, height):
    while True:
        # max out at specified FPS
        time.sleep(1/fps)
        frame = detected_frames_processor.get_current_frame(camera_name, draw=True)
        if frame is None:
            frame = np.zeros((height,int(height*16/9),3), np.uint8)

        width = int(height*frame.shape[1]/frame.shape[0])
        frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_LINEAR)

        ret, jpg = cv2.imencode('.jpg', frame)
        yield (b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' + jpg.tobytes() + b'\r\n\r\n')
