import numpy as np
import tensorflow as tf


class ObjectDetector():
    def __init__(self):
        self.detection_graph = tf.Graph()
        with self.detection_graph.as_default():
            od_graph_def = tf.compat.v1.GraphDef()
            with tf.io.gfile.GFile('/cpu_model.pb', 'rb') as fid:
                serialized_graph = fid.read()
                od_graph_def.ParseFromString(serialized_graph)
                tf.import_graph_def(od_graph_def, name='')

        config = tf.compat.v1.ConfigProto(
            device_count={'GPU': 0}
        )
        self.sess = tf.compat.v1.Session(
            graph=self.detection_graph,
            config=config)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        pass

    def detect_raw(self, tensor_input):
        ops = self.detection_graph.get_operations()
        all_tensor_names = {output.name for op in ops for output in op.outputs}
        tensor_dict = {}
        for key in ['detection_boxes', 'detection_scores', 'detection_classes']:
            tensor_name = key + ':0'
            if tensor_name in all_tensor_names:
                tensor_dict[key] = self.detection_graph.get_tensor_by_name(tensor_name)

        image_tensor = self.detection_graph.get_tensor_by_name('image_tensor:0')
        output_dict = self.sess.run(tensor_dict,
                                    feed_dict={image_tensor: tensor_input})

        boxes = output_dict['detection_boxes'][0]
        label_codes = output_dict['detection_classes'][0] - 1
        scores = output_dict['detection_scores'][0]

        detections = np.zeros((20, 6), np.float32)
        for i, score in enumerate(scores):
            if i == detections.shape[0]:
                break
            detections[i] = [label_codes[i], score, boxes[i][0], boxes[i][1], boxes[i][2], boxes[i][3]]

        return detections
