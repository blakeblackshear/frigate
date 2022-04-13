import torch
import numpy as np
#import cv2
from time import time
import sys


class ObjectDetection:
    """
    The class performs generic object detection on a video file.
    It uses yolo5 pretrained model to make inferences and opencv2 to manage frames.
    Included Features:
    1. Reading and writing of video file using  Opencv2
    2. Using pretrained model to make inferences on frames.
    3. Use the inferences to plot boxes on objects along with labels.
    Upcoming Features:
    """
    def __init__(self):
        self.model = self.load_model()
        self.model.conf = 0.4 # set inference threshold at 0.3
        self.model.iou = 0.3 # set inference IOU threshold at 0.3
        #self.model.classes = [0] # set model to only detect "Person" class
        #self.model.classes = self.model.names
        self.classes = self.model.names
        self.found_lables = set() # set
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'

    def load_model(self):
        """
        Function loads the yolo5 model from PyTorch Hub.
        """
        #model = torch.hub.load('/media/frigate/yolov5', 'custom', path='/media/frigate/yolov5/yolov5l.pt', source='local')
        model = torch.hub.load('/media/frigate/yolov5', 'custom', path='/media/frigate/yolov5/yolov5s.pt', source='local')
        #model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)
        #model = torch.hub.load('ultralytics/yolov3', 'yolov3', pretrained=True)
        return model

    def class_to_label(self, x):
        """
        For a given label value, return corresponding string label.
        :param x: numeric label
        :return: corresponding string label
        """
        return self.classes[int(x)]

    def score_frame(self, frame):
        """
        function scores each frame of the video and returns results.
        :param frame: frame to be infered.
        :return: labels and coordinates of objects found.
        """
        self.model.to(self.device)
        results = self.model(frame)
        labels, cord = results.xyxyn[0][:, -1].to('cpu').numpy(), results.xyxyn[0][:, :-1].to('cpu').numpy()
        return labels, cord

    def plot_boxes(self, results, frame):
        """
        plots boxes and labels on frame.
        :param results: inferences made by model
        :param frame: frame on which to  make the plots
        :return: new frame with boxes and labels plotted.
        """
        labels, cord = results
        n = len(labels)
        if n > 0:
            print(f"Total Targets: {n}")
            print(f"Labels: {set([self.class_to_label(label) for label in labels])}")
        x_shape, y_shape = frame.shape[1], frame.shape[0]
        for i in range(n):
            self.found_lables.add(self.class_to_label(labels[i]))
            row = cord[i]
            x1, y1, x2, y2 = int(row[0]*x_shape), int(row[1]*y_shape), int(row[2]*x_shape), int(row[3]*y_shape)
            bgr = (0, 0, 255)
            cv2.rectangle(frame, (x1, y1), (x2, y2), bgr, 1)
            label = f"{int(row[4]*100)}"
            cv2.putText(frame, self.class_to_label(labels[i]), (x1, y1), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 1)
            cv2.putText(frame, f"Total Targets: {n}", (30, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        return frame

    def __call__(self):
        player = self.get_video_from_file() # create streaming service for application
        assert player.isOpened()
        x_shape = int(player.get(cv2.CAP_PROP_FRAME_WIDTH))
        y_shape = int(player.get(cv2.CAP_PROP_FRAME_HEIGHT))
        four_cc = cv2.VideoWriter_fourcc(*"MJPG")
        out = cv2.VideoWriter(self.out_file, four_cc, 20, (x_shape, y_shape))
        fc = 0
        fps = 0
        tfc = int(player.get(cv2.CAP_PROP_FRAME_COUNT))
        tfcc = 0
        while True:
            fc += 1
            start_time = time()
            ret, frame = player.read()
            if not ret:
                break
            results = self.score_frame(frame)
            frame = self.plot_boxes(results, frame)
            end_time = time()
            fps += 1/np.round(end_time - start_time, 3)
            if fc == 10:
                fps = int(fps / 10)
                tfcc += fc
                fc = 0
                per_com = int(tfcc / tfc * 100)
                print(f"Frames Per Second : {fps} || Percentage Parsed : {per_com}")
            out.write(frame)
        print(f"Found labels: {self.found_lables}")
        player.release()
