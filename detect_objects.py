import os
import cv2
import time
import datetime
import ctypes
import logging
import multiprocessing as mp
from contextlib import closing
import numpy as np
import tensorflow as tf
from object_detection.utils import label_map_util
from object_detection.utils import visualization_utils as vis_util
from flask import Flask, Response, make_response

RTSP_URL = os.getenv('RTSP_URL')

# Path to frozen detection graph. This is the actual model that is used for the object detection.
PATH_TO_CKPT = '/frozen_inference_graph.pb'

# List of the strings that is used to add correct label for each box.
PATH_TO_LABELS = '/label_map.pbtext'

# TODO: make dynamic?
NUM_CLASSES = 90

# Loading label map
label_map = label_map_util.load_labelmap(PATH_TO_LABELS)
categories = label_map_util.convert_label_map_to_categories(label_map, max_num_classes=NUM_CLASSES,
                                                            use_display_name=True)
category_index = label_map_util.create_category_index(categories)

def detect_objects(image_np, sess, detection_graph):
    # Expand dimensions since the model expects images to have shape: [1, None, None, 3]
    image_np_expanded = np.expand_dims(image_np, axis=0)
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

    # build an array of detected objects
    objects = []
    for index, value in enumerate(classes[0]):
        object_dict = {}
        if scores[0, index] > 0.5:
            object_dict[(category_index.get(value)).get('name').encode('utf8')] = \
                                scores[0, index]
            objects.append(object_dict)

    # draw boxes for detected objects on image
    vis_util.visualize_boxes_and_labels_on_image_array(
        image_np,
        np.squeeze(boxes),
        np.squeeze(classes).astype(np.int32),
        np.squeeze(scores),
        category_index,
        use_normalized_coordinates=True,
        line_thickness=4)

    return objects, image_np

def main():
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

    # create shared value for storing the time the frame was captured
    # note: this must be a double even though the value you are storing
    #       is a float. otherwise it stops updating the value in shared
    #       memory. probably something to do with the size of the memory block
    shared_frame_time = mp.Value('d', 0.0)
    # compute the flattened array length from the array shape
    flat_array_length = frame_shape[0] * frame_shape[1] * frame_shape[2]
    # create shared array for passing the image data from capture to detect_objects
    shared_arr = mp.Array(ctypes.c_uint16, flat_array_length)
    # create shared array for passing the image data from detect_objects to flask
    shared_output_arr = mp.Array(ctypes.c_uint16, flat_array_length)
    # create a numpy array with the image shape from the shared memory array
    # this is used by flask to output an mjpeg stream
    frame_output_arr = tonumpyarray(shared_output_arr).reshape(frame_shape)

    capture_process = mp.Process(target=fetch_frames, args=(shared_arr, shared_frame_time, frame_shape))
    capture_process.daemon = True

    detection_process = mp.Process(target=process_frames, args=(shared_arr, shared_output_arr, shared_frame_time, frame_shape))
    detection_process.daemon = True

    capture_process.start()
    print("capture_process pid ", capture_process.pid)
    detection_process.start()
    print("detection_process pid ", detection_process.pid)

    app = Flask(__name__)

    @app.route('/')
    def index():
        # return a multipart response
        return Response(imagestream(),
                        mimetype='multipart/x-mixed-replace; boundary=frame')
    def imagestream():
        while True:
            # max out at 5 FPS
            time.sleep(0.2)
            # convert back to BGR
            frame_bgr = cv2.cvtColor(frame_output_arr, cv2.COLOR_RGB2BGR)
            # encode the image into a jpg
            ret, jpg = cv2.imencode('.jpg', frame_bgr)
            yield (b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + jpg.tobytes() + b'\r\n\r\n')

    app.run(host='0.0.0.0', debug=False)

    capture_process.join()
    detection_process.join()

# convert shared memory array into numpy array
def tonumpyarray(mp_arr):
    return np.frombuffer(mp_arr.get_obj(), dtype=np.uint16)

# fetch the frames as fast a possible, only decoding the frames when the
# detection_process has consumed the current frame
def fetch_frames(shared_arr, shared_frame_time, frame_shape):
    # convert shared memory array into numpy and shape into image array
    arr = tonumpyarray(shared_arr).reshape(frame_shape)

    # start the video capture
    video = cv2.VideoCapture(RTSP_URL)
    # keep the buffer small so we minimize old data
    video.set(cv2.CAP_PROP_BUFFERSIZE,1)

    while True:
        # grab the frame, but dont decode it yet
        ret = video.grab()
        # snapshot the time the frame was grabbed
        frame_time = datetime.datetime.now()
        if ret:
            # if the detection_process is ready for the next frame decode it
            # otherwise skip this frame and move onto the next one
            if shared_frame_time.value == 0.0:
                # go ahead and decode the current frame
                ret, frame = video.retrieve()
                if ret:
                    # copy the frame into the numpy array
                    arr[:] = frame
                    # signal to the detection_process by setting the shared_frame_time
                    shared_frame_time.value = frame_time.timestamp()
    
    video.release()

# do the actual object detection
def process_frames(shared_arr, shared_output_arr, shared_frame_time, frame_shape):
    # shape shared input array into frame for processing
    arr = tonumpyarray(shared_arr).reshape(frame_shape)
    # shape shared output array into frame so it can be copied into
    output_arr = tonumpyarray(shared_output_arr).reshape(frame_shape)

    # Load a (frozen) Tensorflow model into memory before the processing loop
    detection_graph = tf.Graph()
    with detection_graph.as_default():
        od_graph_def = tf.GraphDef()
        with tf.gfile.GFile(PATH_TO_CKPT, 'rb') as fid:
            serialized_graph = fid.read()
            od_graph_def.ParseFromString(serialized_graph)
            tf.import_graph_def(od_graph_def, name='')
        sess = tf.Session(graph=detection_graph)

    no_frames_available = -1
    while True:
        # if there isnt a frame ready for processing
        if shared_frame_time.value == 0.0:
            # save the first time there were no frames available
            if no_frames_available == -1:
                no_frames_available = datetime.datetime.now().timestamp()
            # if there havent been any frames available in 30 seconds, 
            # sleep to avoid using so much cpu if the camera feed is down
            if no_frames_available > 0 and (datetime.datetime.now().timestamp() - no_frames_available) > 30:
                time.sleep(1)
                print("sleeping because no frames have been available in a while")
            else:
                # rest a little bit to avoid maxing out the CPU
                time.sleep(0.01)
            continue
        
        # we got a valid frame, so reset the timer
        no_frames_available = -1

        # if the frame is more than 0.5 second old, discard it
        if (datetime.datetime.now().timestamp() - shared_frame_time.value) > 0.5:
            # signal that we need a new frame
            shared_frame_time.value = 0.0
            # rest a little bit to avoid maxing out the CPU
            time.sleep(0.01)
            continue
        
        # make a copy of the frame
        frame = arr.copy()
        frame_time = shared_frame_time.value
        # signal that the frame has been used so a new one will be ready
        shared_frame_time.value = 0.0

        # convert to RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        # do the object detection
        objects, frame_overlay = detect_objects(frame_rgb, sess, detection_graph)
        # copy the output frame with the bounding boxes to the output array
        output_arr[:] = frame_overlay
        if(len(objects) > 0):
            print(objects)

if __name__ == '__main__':
    mp.freeze_support()
    main()