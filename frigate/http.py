import base64
import datetime
import logging
import os
import time
from functools import reduce

import cv2
import numpy as np
from flask import (Blueprint, Flask, Response, current_app, jsonify,
                   make_response, request)
from peewee import SqliteDatabase, operator, fn, DoesNotExist
from playhouse.shortcuts import model_to_dict

from frigate.models import Event
from frigate.stats import stats_snapshot
from frigate.util import calculate_region
from frigate.version import VERSION

logger = logging.getLogger(__name__)

bp = Blueprint('frigate', __name__)

def create_app(frigate_config, database: SqliteDatabase, stats_tracking, detected_frames_processor):
    app = Flask(__name__)

    @app.before_request
    def _db_connect():
        database.connect()

    @app.teardown_request
    def _db_close(exc):
        if not database.is_closed():
            database.close()

    app.frigate_config = frigate_config
    app.stats_tracking = stats_tracking
    app.detected_frames_processor = detected_frames_processor

    app.register_blueprint(bp)

    return app

@bp.route('/')
def is_healthy():
    return "Frigate is running. Alive and healthy!"

@bp.route('/events/summary')
def events_summary():
    has_clip = request.args.get('has_clip', type=int)
    has_snapshot = request.args.get('has_snapshot', type=int)

    clauses = []

    if not has_clip is None:
        clauses.append((Event.has_clip == has_clip))
    
    if not has_snapshot is None:
        clauses.append((Event.has_snapshot == has_snapshot))

    if len(clauses) == 0:
        clauses.append((1 == 1))

    groups = (
        Event
            .select(
                Event.camera,
                Event.label,
                fn.strftime('%Y-%m-%d', fn.datetime(Event.start_time, 'unixepoch', 'localtime')).alias('day'),
                Event.zones,
                fn.COUNT(Event.id).alias('count')
            )
            .where(reduce(operator.and_, clauses))
            .group_by(
                Event.camera,
                Event.label,
                fn.strftime('%Y-%m-%d', fn.datetime(Event.start_time, 'unixepoch', 'localtime')),
                Event.zones
            )
        )

    return jsonify([e for e in groups.dicts()])

@bp.route('/events/<id>')
def event(id):
    try:
        return model_to_dict(Event.get(Event.id == id))
    except DoesNotExist:
        return "Event not found", 404

@bp.route('/events/<id>/snapshot.jpg')
def event_snapshot(id):
    format = request.args.get('format', 'ios')
    thumbnail_bytes = None
    try:
        event = Event.get(Event.id == id)
        thumbnail_bytes = base64.b64decode(event.thumbnail)
    except DoesNotExist:
        # see if the object is currently being tracked
        try:
            for camera_state in current_app.detected_frames_processor.camera_states.values():
                if id in camera_state.tracked_objects:
                    tracked_obj = camera_state.tracked_objects.get(id)
                    if not tracked_obj is None:
                        thumbnail_bytes = tracked_obj.get_jpg_bytes()
        except:
            return "Event not found", 404

    if thumbnail_bytes is None:
        return "Event not found", 404

    # android notifications prefer a 2:1 ratio
    if format == 'android':
        jpg_as_np = np.frombuffer(thumbnail_bytes, dtype=np.uint8)
        img = cv2.imdecode(jpg_as_np, flags=1)
        thumbnail = cv2.copyMakeBorder(img, 0, 0, int(img.shape[1]*0.5), int(img.shape[1]*0.5), cv2.BORDER_CONSTANT, (0,0,0))
        ret, jpg = cv2.imencode('.jpg', thumbnail)
        thumbnail_bytes = jpg.tobytes()

    response = make_response(thumbnail_bytes)
    response.headers['Content-Type'] = 'image/jpg'
    return response

@bp.route('/events')
def events():
    limit = request.args.get('limit', 100)
    camera = request.args.get('camera')
    label = request.args.get('label')
    zone = request.args.get('zone')
    after = request.args.get('after', type=int)
    before = request.args.get('before', type=int)
    has_clip = request.args.get('has_clip', type=int)
    has_snapshot = request.args.get('has_snapshot', type=int)

    clauses = []

    if camera:
        clauses.append((Event.camera == camera))

    if label:
        clauses.append((Event.label == label))

    if zone:
        clauses.append((Event.zones.cast('text') % f"*\"{zone}\"*"))

    if after:
        clauses.append((Event.start_time >= after))

    if before:
        clauses.append((Event.start_time <= before))

    if not has_clip is None:
        clauses.append((Event.has_clip == has_clip))
    
    if not has_snapshot is None:
        clauses.append((Event.has_snapshot == has_snapshot))

    if len(clauses) == 0:
        clauses.append((1 == 1))

    events =    (Event.select()
                .where(reduce(operator.and_, clauses))
                .order_by(Event.start_time.desc())
                .limit(limit))

    return jsonify([model_to_dict(e) for e in events])

@bp.route('/config')
def config():
    return jsonify(current_app.frigate_config.to_dict())

@bp.route('/version')
def version():
    return VERSION

@bp.route('/stats')
def stats():
    stats = stats_snapshot(current_app.stats_tracking)
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
            box = best_object.get('box', (0,0,300,300))
            region = calculate_region(best_frame.shape, box[0], box[1], box[2], box[3], 1.1)
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
    draw_options = {
        'bounding_boxes': request.args.get('bbox', type=int),
        'timestamp': request.args.get('timestamp', type=int),
        'zones': request.args.get('zones', type=int),
        'mask': request.args.get('mask', type=int),
        'motion_boxes': request.args.get('motion', type=int),
        'regions': request.args.get('regions', type=int),
    }
    if camera_name in current_app.frigate_config.cameras:
        # return a multipart response
        return Response(imagestream(current_app.detected_frames_processor, camera_name, fps, height, draw_options),
                        mimetype='multipart/x-mixed-replace; boundary=frame')
    else:
        return "Camera named {} not found".format(camera_name), 404

@bp.route('/<camera_name>/latest.jpg')
def latest_frame(camera_name):
    draw_options = {
        'bounding_boxes': request.args.get('bbox', type=int),
        'timestamp': request.args.get('timestamp', type=int),
        'zones': request.args.get('zones', type=int),
        'mask': request.args.get('mask', type=int),
        'motion_boxes': request.args.get('motion', type=int),
        'regions': request.args.get('regions', type=int),
    }
    if camera_name in current_app.frigate_config.cameras:
        # max out at specified FPS
        frame = current_app.detected_frames_processor.get_current_frame(camera_name, draw_options)
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

def imagestream(detected_frames_processor, camera_name, fps, height, draw_options):
    while True:
        # max out at specified FPS
        time.sleep(1/fps)
        frame = detected_frames_processor.get_current_frame(camera_name, draw_options)
        if frame is None:
            frame = np.zeros((height,int(height*16/9),3), np.uint8)

        width = int(height*frame.shape[1]/frame.shape[0])
        frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_LINEAR)

        ret, jpg = cv2.imencode('.jpg', frame)
        yield (b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' + jpg.tobytes() + b'\r\n\r\n')
