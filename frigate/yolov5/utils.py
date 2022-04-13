import os
import sys
import argparse
import logging
import time
from pathlib import Path

import numpy as np
import cv2


class Colors:
    # Ultralytics color palette https://ultralytics.com/
    def __init__(self):
        # hex = matplotlib.colors.TABLEAU_COLORS.values()
        hex = ('FF3838', 'FF9D97', 'FF701F', 'FFB21D', 'CFD231', '48F90A', '92CC17', '3DDB86', '1A9334', '00D4BB',
               '2C99A8', '00C2FF', '344593', '6473FF', '0018EC', '8438FF', '520085', 'CB38FF', 'FF95C8', 'FF37C7')
        self.palette = [self.hex2rgb('#' + c) for c in hex]
        self.n = len(self.palette)

    def __call__(self, i, bgr=False):
        c = self.palette[int(i) % self.n]
        return (c[2], c[1], c[0]) if bgr else c

    @staticmethod
    def hex2rgb(h):  # rgb order (PIL)
        return tuple(int(h[1 + i:1 + i + 2], 16) for i in (0, 2, 4))


def plot_one_box(box, im, color=(128, 128, 128), txt_color=(255, 255, 255), label=None, line_width=3):
    # Plots one xyxy box on image im with label
    assert im.data.contiguous, 'Image not contiguous. Apply np.ascontiguousarray(im) to plot_on_box() input image.'
    lw = line_width or max(int(min(im.size) / 200), 2)  # line width

    c1, c2 = (int(box[0]), int(box[1])), (int(box[2]), int(box[3]))

    cv2.rectangle(im, c1, c2, color, thickness=lw, lineType=cv2.LINE_AA)
    if label:
        tf = max(lw - 1, 1)  # font thickness
        txt_width, txt_height = cv2.getTextSize(label, 0, fontScale=lw / 3, thickness=tf)[0]
        c2 = c1[0] + txt_width, c1[1] - txt_height - 3
        cv2.rectangle(im, c1, c2, color, -1, cv2.LINE_AA)  # filled
        cv2.putText(im, label, (c1[0], c1[1] - 2), 0, lw / 3, txt_color, thickness=tf, lineType=cv2.LINE_AA)
    return im


def resize_and_pad(image, desired_size):
    old_size = image.shape[:2]
    ratio = float(desired_size / max(old_size))
    new_size = tuple([int(x * ratio) for x in old_size])

    # new_size should be in (width, height) format

    image = cv2.resize(image, (new_size[1], new_size[0]))

    delta_w = desired_size - new_size[1]
    delta_h = desired_size - new_size[0]

    pad = (delta_w, delta_h)

    color = [100, 100, 100]
    new_im = cv2.copyMakeBorder(image, 0, delta_h, 0, delta_w, cv2.BORDER_CONSTANT,
                                value=color)

    return new_im, pad


def get_image_tensor(img, max_size, debug=False):
    """
    Reshapes an input image into a square with sides max_size
    """
    if type(img) is str:
        img = cv2.imread(img)

    resized, pad = resize_and_pad(img, max_size)
    resized = resized.astype(np.float32)

    if debug:
        cv2.imwrite("intermediate.png", resized)

    # Normalise!
    resized /= 255.0

    return img, resized, pad


def xyxy2xywh(x):
    # Convert nx4 boxes from [x1, y1, x2, y2] to [x, y, w, h] where xy1=top-left, xy2=bottom-right
    y = np.copy(x)
    y[:, 0] = (x[:, 0] + x[:, 2]) / 2  # x center
    y[:, 1] = (x[:, 1] + x[:, 3]) / 2  # y center
    y[:, 2] = x[:, 2] - x[:, 0]  # width
    y[:, 3] = x[:, 3] - x[:, 1]  # height
    return y


def coco80_to_coco91_class():  # converts 80-index (val2014) to 91-index (paper)
    # https://tech.amikelive.com/node-718/what-object-categories-labels-are-in-coco-dataset/
    # a = np.loadtxt('data/coco.names', dtype='str', delimiter='\n')
    # b = np.loadtxt('data/coco_paper.names', dtype='str', delimiter='\n')
    # x1 = [list(a[i] == b).index(True) + 1 for i in range(80)]  # darknet to coco
    # x2 = [list(b[i] == a).index(True) if any(b[i] == a) else None for i in range(91)]  # coco to darknet
    x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 27, 28, 31, 32, 33, 34,
         35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63,
         64, 65, 67, 70, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 84, 85, 86, 87, 88, 89, 90]
    return x


def save_one_json(predn, jdict, path, class_map):
    # Save one JSON result {"image_id": 42, "category_id": 18, "bbox": [258.15, 41.29, 348.26, 243.78], "score": 0.236}
    image_id = int(path.stem) if path.stem.isnumeric() else path.stem

    box = xyxy2xywh(predn[:, :4])  # xywh
    box[:, :2] -= box[:, 2:] / 2  # xy center to top-left corner

    for p, b in zip(predn.tolist(), box.tolist()):
        jdict.append({'image_id': image_id,
                      'category_id': class_map[int(p[5])],
                      'bbox': [round(x, 3) for x in b],
                      'score': round(p[4], 5)})
