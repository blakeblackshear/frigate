import numpy as np
import cv2
import matplotlib.pyplot as plt

# Function to read labels from text files.
def ReadLabelFile(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()
    ret = {}
    for line in lines:
        pair = line.strip().split(maxsplit=1)
        ret[int(pair[0])] = pair[1].strip()
    return ret

# convert shared memory array into numpy array
def tonumpyarray(mp_arr):
    return np.frombuffer(mp_arr.get_obj(), dtype=np.uint8)

def draw_box_with_label(frame, x_min, y_min, x_max, y_max, label, score, area):
    color = COLOR_MAP[label]
    display_text = "{}: {}% {}".format(label,int(score*100),int(area))
    cv2.rectangle(frame, (x_min, y_min), 
        (x_max, y_max), 
        color, 2)
    font_scale = 0.5
    font = cv2.FONT_HERSHEY_SIMPLEX
    # get the width and height of the text box
    size = cv2.getTextSize(display_text, font, fontScale=font_scale, thickness=2)
    text_width = size[0][0]
    text_height = size[0][1]
    line_height = text_height + size[1]
    # set the text start position
    text_offset_x = x_min
    text_offset_y = 0 if y_min < line_height else y_min - (line_height+8)
    # make the coords of the box with a small padding of two pixels
    textbox_coords = ((text_offset_x, text_offset_y), (text_offset_x + text_width + 2, text_offset_y + line_height))
    cv2.rectangle(frame, textbox_coords[0], textbox_coords[1], color, cv2.FILLED)
    cv2.putText(frame, display_text, (text_offset_x, text_offset_y + line_height - 3), font, fontScale=font_scale, color=(0, 0, 0), thickness=2)

# Path to frozen detection graph. This is the actual model that is used for the object detection.
PATH_TO_CKPT = '/frozen_inference_graph.pb'
# List of the strings that is used to add correct label for each box.
PATH_TO_LABELS = '/label_map.pbtext'

LABELS = ReadLabelFile(PATH_TO_LABELS)
cmap = plt.cm.get_cmap('tab10', len(LABELS.keys()))

COLOR_MAP = {}
for key, val in LABELS.items():
    COLOR_MAP[val] = tuple(int(round(255 * c)) for c in cmap(key)[:3])