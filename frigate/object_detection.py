import datetime
import cv2
import numpy as np
import tensorflow as tf
from object_detection.utils import label_map_util
from object_detection.utils import visualization_utils as vis_util
from . util import tonumpyarray

# TODO: make dynamic?
NUM_CLASSES = 90
# Path to frozen detection graph. This is the actual model that is used for the object detection.
PATH_TO_CKPT = '/frozen_inference_graph.pb'
# List of the strings that is used to add correct label for each box.
PATH_TO_LABELS = '/label_map.pbtext'

# Loading label map
label_map = label_map_util.load_labelmap(PATH_TO_LABELS)
categories = label_map_util.convert_label_map_to_categories(label_map, max_num_classes=NUM_CLASSES,
                                                            use_display_name=True)
category_index = label_map_util.create_category_index(categories)

# do the actual object detection
def tf_detect_objects(cropped_frame, sess, detection_graph, region_size, region_x_offset, region_y_offset, debug):
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
            objects.append({
                        'name': str(category_index.get(value).get('name')),
                        'score': float(score),
                        'ymin': int((box[0] * region_size) + region_y_offset),
                        'xmin': int((box[1] * region_size) + region_x_offset),
                        'ymax': int((box[2] * region_size) + region_y_offset),
                        'xmax': int((box[3] * region_size) + region_x_offset)
                    })

    return objects

def detect_objects(shared_arr, object_queue, shared_frame_time, frame_lock, frame_ready, 
                   motion_detected, frame_shape, region_size, region_x_offset, region_y_offset,
                   min_person_area, debug):
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
            # if there isnt a frame ready for processing or it is old, wait for a new frame
            if shared_frame_time.value == frame_time or (now - shared_frame_time.value) > 0.5:
                frame_ready.wait()
        
        # make a copy of the cropped frame
        with frame_lock:
            cropped_frame = arr[region_y_offset:region_y_offset+region_size, region_x_offset:region_x_offset+region_size].copy()
            frame_time = shared_frame_time.value

        # convert to RGB
        cropped_frame_rgb = cv2.cvtColor(cropped_frame, cv2.COLOR_BGR2RGB)
        # do the object detection
        objects = tf_detect_objects(cropped_frame_rgb, sess, detection_graph, region_size, region_x_offset, region_y_offset, debug)
        for obj in objects:
            # ignore persons below the size threshold
            if obj['name'] == 'person' and (obj['xmax']-obj['xmin'])*(obj['ymax']-obj['ymin']) < min_person_area:
                continue
            obj['frame_time'] = frame_time
            object_queue.put(obj)