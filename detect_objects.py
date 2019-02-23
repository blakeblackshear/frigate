import os
import cv2
import imutils
import time
import datetime
import ctypes
import logging
import multiprocessing as mp
import threading
import json
from contextlib import closing
import numpy as np
import tensorflow as tf
from object_detection.utils import label_map_util
from object_detection.utils import visualization_utils as vis_util
from flask import Flask, Response, make_response
import paho.mqtt.client as mqtt

RTSP_URL = os.getenv('RTSP_URL')

# Path to frozen detection graph. This is the actual model that is used for the object detection.
PATH_TO_CKPT = '/frozen_inference_graph.pb'

# List of the strings that is used to add correct label for each box.
PATH_TO_LABELS = '/label_map.pbtext'

MQTT_HOST = os.getenv('MQTT_HOST')
MQTT_TOPIC_PREFIX = os.getenv('MQTT_TOPIC_PREFIX')
MQTT_OBJECT_CLASSES = os.getenv('MQTT_OBJECT_CLASSES')

# TODO: make dynamic?
NUM_CLASSES = 90

# REGIONS = "350,0,300,50:400,350,250,50:400,750,250,50"
# REGIONS = "400,350,250,50"
REGIONS = os.getenv('REGIONS')

DETECTED_OBJECTS = []

# Loading label map
label_map = label_map_util.load_labelmap(PATH_TO_LABELS)
categories = label_map_util.convert_label_map_to_categories(label_map, max_num_classes=NUM_CLASSES,
                                                            use_display_name=True)
category_index = label_map_util.create_category_index(categories)

def detect_objects(cropped_frame, sess, detection_graph, region_size, region_x_offset, region_y_offset, debug):
    # Expand dimensions since the model expects images to have shape: [1, None, None, 3]
    image_np_expanded = np.expand_dims(cropped_frame, axis=0)
    image_tensor = detection_graph.get_tensor_by_name('image_tensor:0')

    # Each box represents a part of the image where a particular object was detected.
    boxes = detection_graph.get_tensor_by_name('detection_boxes:0')

    # Each score represent how level of confidence for each of the objects.
    # Score is shown on the result image, together with the class label.
    scores = detection_graph.get_tensor_by_name('detection_scores:0')
    classes = detection_graph.get_tensor_by_name('detection_classes:0')
    num_detections = detection_graph.get_tensor_by_name('num_detections:0')

    # Actual detection.
    (boxes, scores, classes, num_detections) = sess.run(
        [boxes, scores, classes, num_detections],
        feed_dict={image_tensor: image_np_expanded})

    if debug:
        if len([value for index,value in enumerate(classes[0]) if str(category_index.get(value).get('name')) == 'person' and scores[0,index] > 0.5]) > 0:
            vis_util.visualize_boxes_and_labels_on_image_array(
                cropped_frame,
                np.squeeze(boxes),
                np.squeeze(classes).astype(np.int32),
                np.squeeze(scores),
                category_index,
                use_normalized_coordinates=True,
                line_thickness=4)
            cv2.imwrite("/lab/debug/obj-{}-{}-{}.jpg".format(region_x_offset, region_y_offset, datetime.datetime.now().timestamp()), cropped_frame)


    # build an array of detected objects
    objects = []
    for index, value in enumerate(classes[0]):
        score = scores[0, index]
        if score > 0.5:
            box = boxes[0, index].tolist()
            box[0] = (box[0] * region_size) + region_y_offset
            box[1] = (box[1] * region_size) + region_x_offset
            box[2] = (box[2] * region_size) + region_y_offset
            box[3] = (box[3] * region_size) + region_x_offset
            objects += [value, scores[0, index]] + box
        # only get the first 10 objects
        if len(objects) == 60:
            break

    return objects

class ObjectParser(threading.Thread):
    def __init__(self, objects_changed, objects_parsed, object_arrays):
        threading.Thread.__init__(self)
        self._objects_changed = objects_changed
        self._objects_parsed = objects_parsed
        self._object_arrays = object_arrays

    def run(self):
        global DETECTED_OBJECTS
        while True:
            detected_objects = []
            # wait until object detection has run
            # TODO: what if something else changed while I was processing???
            with self._objects_changed:
                self._objects_changed.wait()

            for object_array in self._object_arrays:
                object_index = 0
                while(object_index < 60 and object_array[object_index] > 0):
                    object_class = object_array[object_index]
                    detected_objects.append({
                        'name': str(category_index.get(object_class).get('name')),
                        'score': object_array[object_index+1],
                        'ymin': int(object_array[object_index+2]),
                        'xmin': int(object_array[object_index+3]),
                        'ymax': int(object_array[object_index+4]),
                        'xmax': int(object_array[object_index+5])
                    })
                    object_index += 6
            DETECTED_OBJECTS = detected_objects
            # notify that objects were parsed
            with self._objects_parsed:
                self._objects_parsed.notify_all()

class MqttMotionPublisher(threading.Thread):
    def __init__(self, client, topic_prefix, motion_changed, motion_flags):
        threading.Thread.__init__(self)
        self.client = client
        self.topic_prefix = topic_prefix
        self.motion_changed = motion_changed
        self.motion_flags = motion_flags

    def run(self):
        last_sent_motion = ""
        while True:
            with self.motion_changed:
                self.motion_changed.wait()
            
            # send message for motion
            motion_status = 'OFF'
            if any(obj.is_set() for obj in self.motion_flags):
                motion_status = 'ON'

            if last_sent_motion != motion_status:
                last_sent_motion = motion_status
                self.client.publish(self.topic_prefix+'/motion', motion_status, retain=False)

class MqttObjectPublisher(threading.Thread):
    def __init__(self, client, topic_prefix, objects_parsed, object_classes):
        threading.Thread.__init__(self)
        self.client = client
        self.topic_prefix = topic_prefix
        self.objects_parsed = objects_parsed
        self.object_classes = object_classes

    def run(self):
        global DETECTED_OBJECTS

        last_sent_payload = ""
        while True:

            # initialize the payload
            payload = {}
            for obj in self.object_classes:
                payload[obj] = []

            # wait until objects have been parsed
            with self.objects_parsed:
                self.objects_parsed.wait()

            # loop over detected objects and populate
            # the payload
            detected_objects = DETECTED_OBJECTS.copy()
            for obj in detected_objects:
                if obj['name'] in self.object_classes:
                    payload[obj['name']].append(obj)
            
            # send message for objects if different
            new_payload = json.dumps(payload, sort_keys=True)
            if new_payload != last_sent_payload:
                last_sent_payload = new_payload
                self.client.publish(self.topic_prefix+'/objects', new_payload, retain=False)

def main():
    # Parse selected regions
    regions = []
    for region_string in REGIONS.split(':'):
        region_parts = region_string.split(',')
        region_mask_image = cv2.imread("/config/{}".format(region_parts[4]), cv2.IMREAD_GRAYSCALE)
        region_mask = np.where(region_mask_image==[0])
        regions.append({
            'size': int(region_parts[0]),
            'x_offset': int(region_parts[1]),
            'y_offset': int(region_parts[2]),
            'min_object_size': int(region_parts[3]),
            'mask': region_mask,
            # Event for motion detection signaling
            'motion_detected': mp.Event(),
            # create shared array for storing 10 detected objects
            # note: this must be a double even though the value you are storing
            #       is a float. otherwise it stops updating the value in shared
            #       memory. probably something to do with the size of the memory block
            'output_array': mp.Array(ctypes.c_double, 6*10)
        })
    # capture a single frame and check the frame shape so the correct array
    # size can be allocated in memory
    video = cv2.VideoCapture(RTSP_URL)
    ret, frame = video.read()
    if ret:
        frame_shape = frame.shape
    else:
        print("Unable to capture video stream")
        exit(1)
    video.release()
        
    # compute the flattened array length from the array shape
    flat_array_length = frame_shape[0] * frame_shape[1] * frame_shape[2]
    # create shared array for storing the full frame image data
    shared_arr = mp.Array(ctypes.c_uint16, flat_array_length)
    # create shared value for storing the frame_time
    shared_frame_time = mp.Value('d', 0.0)
    # Lock to control access to the frame while writing
    frame_lock = mp.Lock()
    # Condition for notifying that a new frame is ready
    frame_ready = mp.Condition()
    # Condition for notifying that motion status changed globally
    motion_changed = mp.Condition()
    # Condition for notifying that object detection ran
    objects_changed = mp.Condition()
    # Condition for notifying that objects were parsed
    objects_parsed = mp.Condition()
    # shape current frame so it can be treated as an image
    frame_arr = tonumpyarray(shared_arr).reshape(frame_shape)

    capture_process = mp.Process(target=fetch_frames, args=(shared_arr, 
        shared_frame_time, frame_lock, frame_ready, frame_shape))
    capture_process.daemon = True

    detection_processes = []
    motion_processes = []
    for region in regions:
        detection_process = mp.Process(target=process_frames, args=(shared_arr, 
            region['output_array'],
            shared_frame_time,
            frame_lock, frame_ready,
            region['motion_detected'],
            objects_changed,
            frame_shape, 
            region['size'], region['x_offset'], region['y_offset'],
            False))
        detection_process.daemon = True
        detection_processes.append(detection_process)

        motion_process = mp.Process(target=detect_motion, args=(shared_arr,
            shared_frame_time,
            frame_lock, frame_ready,
            region['motion_detected'],
            motion_changed,
            frame_shape, 
            region['size'], region['x_offset'], region['y_offset'],
            region['min_object_size'], region['mask'],
            True))
        motion_process.daemon = True
        motion_processes.append(motion_process)

    object_parser = ObjectParser(objects_changed, objects_parsed, [region['output_array'] for region in regions])
    object_parser.start()

    client = mqtt.Client()
    client.will_set(MQTT_TOPIC_PREFIX+'/available', payload='offline', qos=1, retain=True)
    client.connect(MQTT_HOST, 1883, 60)
    client.loop_start()
    client.publish(MQTT_TOPIC_PREFIX+'/available', 'online', retain=True)

    mqtt_publisher = MqttObjectPublisher(client, MQTT_TOPIC_PREFIX, objects_parsed,
        MQTT_OBJECT_CLASSES.split(','))
    mqtt_publisher.start()

    mqtt_motion_publisher = MqttMotionPublisher(client, MQTT_TOPIC_PREFIX, motion_changed,
        [region['motion_detected'] for region in regions])
    mqtt_motion_publisher.start()

    capture_process.start()
    print("capture_process pid ", capture_process.pid)
    for detection_process in detection_processes:
        detection_process.start()
        print("detection_process pid ", detection_process.pid)
    for motion_process in motion_processes:
        motion_process.start()
        print("motion_process pid ", motion_process.pid)

    app = Flask(__name__)

    @app.route('/')
    def index():
        # return a multipart response
        return Response(imagestream(),
                        mimetype='multipart/x-mixed-replace; boundary=frame')
    def imagestream():
        global DETECTED_OBJECTS
        while True:
            # max out at 5 FPS
            time.sleep(0.2)
            # make a copy of the current detected objects
            detected_objects = DETECTED_OBJECTS.copy()
            # lock and make a copy of the current frame
            with frame_lock:
                frame = frame_arr.copy()
            # convert to RGB for drawing
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            # draw the bounding boxes on the screen
            for obj in detected_objects:
                vis_util.draw_bounding_box_on_image_array(frame,
                    obj['ymin'],
                    obj['xmin'],
                    obj['ymax'],
                    obj['xmax'],
                    color='red',
                    thickness=2,
                    display_str_list=["{}: {}%".format(obj['name'],int(obj['score']*100))],
                    use_normalized_coordinates=False)

            for region in regions:
                color = (255,255,255)
                if region['motion_detected'].is_set():
                    color = (0,255,0)
                cv2.rectangle(frame, (region['x_offset'], region['y_offset']), 
                    (region['x_offset']+region['size'], region['y_offset']+region['size']), 
                    color, 2)

            # convert back to BGR
            frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            # encode the image into a jpg
            ret, jpg = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + jpg.tobytes() + b'\r\n\r\n')

    app.run(host='0.0.0.0', debug=False)

    capture_process.join()
    for detection_process in detection_processes:
        detection_process.join()
    for motion_process in motion_processes:
        motion_process.join()
    object_parser.join()
    mqtt_publisher.join()

# convert shared memory array into numpy array
def tonumpyarray(mp_arr):
    return np.frombuffer(mp_arr.get_obj(), dtype=np.uint16)

# fetch the frames as fast a possible, only decoding the frames when the
# detection_process has consumed the current frame
def fetch_frames(shared_arr, shared_frame_time, frame_lock, frame_ready, frame_shape):
    # convert shared memory array into numpy and shape into image array
    arr = tonumpyarray(shared_arr).reshape(frame_shape)

    # start the video capture
    video = cv2.VideoCapture()
    video.open(RTSP_URL)
    # keep the buffer small so we minimize old data
    video.set(cv2.CAP_PROP_BUFFERSIZE,1)

    while True:
        # check if the video stream is still open, and reopen if needed
        if not video.isOpened():
            success = video.open(RTSP_URL)
            if not success:
                time.sleep(1)
                continue
        # grab the frame, but dont decode it yet
        ret = video.grab()
        # snapshot the time the frame was grabbed
        frame_time = datetime.datetime.now()
        if ret:
            # go ahead and decode the current frame
            ret, frame = video.retrieve()
            if ret:
                # Lock access and update frame
                with frame_lock:
                    arr[:] = frame
                    shared_frame_time.value = frame_time.timestamp()
                # Notify with the condition that a new frame is ready
                with frame_ready:
                    frame_ready.notify_all()
    
    video.release()

# do the actual object detection
def process_frames(shared_arr, shared_output_arr, shared_frame_time, frame_lock, frame_ready, 
                   motion_detected, objects_changed, frame_shape, region_size, region_x_offset, region_y_offset,
                   debug):
    debug = True
    # shape shared input array into frame for processing
    arr = tonumpyarray(shared_arr).reshape(frame_shape)

    # Load a (frozen) Tensorflow model into memory before the processing loop
    detection_graph = tf.Graph()
    with detection_graph.as_default():
        od_graph_def = tf.GraphDef()
        with tf.gfile.GFile(PATH_TO_CKPT, 'rb') as fid:
            serialized_graph = fid.read()
            od_graph_def.ParseFromString(serialized_graph)
            tf.import_graph_def(od_graph_def, name='')
        sess = tf.Session(graph=detection_graph)

    frame_time = 0.0
    while True:
        now = datetime.datetime.now().timestamp()

        # wait until motion is detected
        motion_detected.wait()

        with frame_ready:
            # if there isnt a frame ready for processing or it is old, wait for a signal
            if shared_frame_time.value == frame_time or (now - shared_frame_time.value) > 0.5:
                frame_ready.wait()
        
        # make a copy of the cropped frame
        with frame_lock:
            cropped_frame = arr[region_y_offset:region_y_offset+region_size, region_x_offset:region_x_offset+region_size].copy()
            frame_time = shared_frame_time.value

        # convert to RGB
        cropped_frame_rgb = cv2.cvtColor(cropped_frame, cv2.COLOR_BGR2RGB)
        # do the object detection
        objects = detect_objects(cropped_frame_rgb, sess, detection_graph, region_size, region_x_offset, region_y_offset, debug)
        # copy the detected objects to the output array, filling the array when needed
        shared_output_arr[:] = objects + [0.0] * (60-len(objects))
        with objects_changed:
            objects_changed.notify_all()

# do the actual motion detection
def detect_motion(shared_arr, shared_frame_time, frame_lock, frame_ready, motion_detected, motion_changed,
                  frame_shape, region_size, region_x_offset, region_y_offset, min_motion_area, mask, debug):
    # shape shared input array into frame for processing
    arr = tonumpyarray(shared_arr).reshape(frame_shape)

    avg_frame = None
    avg_delta = None
    frame_time = 0.0
    motion_frames = 0
    while True:
        now = datetime.datetime.now().timestamp()
        
        with frame_ready:
            # if there isnt a frame ready for processing or it is old, wait for a signal
            if shared_frame_time.value == frame_time or (now - shared_frame_time.value) > 0.5:
                frame_ready.wait()
        
        # lock and make a copy of the cropped frame
        with frame_lock: 
            cropped_frame = arr[region_y_offset:region_y_offset+region_size, region_x_offset:region_x_offset+region_size].copy().astype('uint8')
            frame_time = shared_frame_time.value

        # convert to grayscale
        gray = cv2.cvtColor(cropped_frame, cv2.COLOR_BGR2GRAY)

        # apply image mask to remove areas from motion detection
        gray[mask] = [255]

        # apply gaussian blur
        gray = cv2.GaussianBlur(gray, (21, 21), 0)

        if avg_frame is None:
            avg_frame = gray.copy().astype("float")
            continue
        
        # look at the delta from the avg_frame
        frameDelta = cv2.absdiff(gray, cv2.convertScaleAbs(avg_frame))
        
        if avg_delta is None:
            avg_delta = frameDelta.copy().astype("float")

        # compute the average delta over the past few frames
        # the alpha value can be modified to configure how sensitive the motion detection is.
        # higher values mean the current frame impacts the delta a lot, and a single raindrop may
        # register as motion, too low and a fast moving person wont be detected as motion
        # this also assumes that a person is in the same location across more than a single frame
        cv2.accumulateWeighted(frameDelta, avg_delta, 0.2)

        # compute the threshold image for the current frame
        current_thresh = cv2.threshold(frameDelta, 25, 255, cv2.THRESH_BINARY)[1]

        # black out everything in the avg_delta where there isnt motion in the current frame
        avg_delta_image = cv2.convertScaleAbs(avg_delta)
        avg_delta_image[np.where(current_thresh==[0])] = [0]

        # then look for deltas above the threshold, but only in areas where there is a delta
        # in the current frame. this prevents deltas from previous frames from being included
        thresh = cv2.threshold(avg_delta_image, 25, 255, cv2.THRESH_BINARY)[1]
 
        # dilate the thresholded image to fill in holes, then find contours
        # on thresholded image
        thresh = cv2.dilate(thresh, None, iterations=2)
        cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = imutils.grab_contours(cnts)

        # if there are no contours, there is no motion
        if len(cnts) < 1:
            motion_frames = 0
            continue

        motion_found = False

        # loop over the contours
        for c in cnts:
            # if the contour is big enough, count it as motion
            contour_area = cv2.contourArea(c)
            if contour_area > min_motion_area:
                motion_found = True
                if debug:
                    cv2.drawContours(cropped_frame, [c], -1, (0, 255, 0), 2)
                    x, y, w, h = cv2.boundingRect(c)
                    cv2.putText(cropped_frame, str(contour_area), (x, y),
		                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 100, 0), 2)
                else:
                    break
        
        if motion_found:
            motion_frames += 1
            # if there have been enough consecutive motion frames, report motion
            if motion_frames >= 3:
                # only average in the current frame if the difference persists for at least 3 frames
                cv2.accumulateWeighted(gray, avg_frame, 0.01)
                motion_detected.set()
                with motion_changed:
                    motion_changed.notify_all()
        else:
            # when no motion, just keep averaging the frames together
            cv2.accumulateWeighted(gray, avg_frame, 0.01)
            motion_frames = 0
            if motion_detected.is_set():
                motion_detected.clear()
                with motion_changed:
                    motion_changed.notify_all()

        if debug and motion_frames == 3:
            cv2.imwrite("/lab/debug/motion-{}-{}-{}.jpg".format(region_x_offset, region_y_offset, datetime.datetime.now().timestamp()), cropped_frame)
            cv2.imwrite("/lab/debug/avg_delta-{}-{}-{}.jpg".format(region_x_offset, region_y_offset, datetime.datetime.now().timestamp()), avg_delta_image)

if __name__ == '__main__':
    mp.freeze_support()
    main()