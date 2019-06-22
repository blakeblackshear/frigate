import numpy as np
import cv2

LABEL_FONT = cv2.FONT_HERSHEY_PLAIN
FONT_SCALE = 0.8

# convert shared memory array into numpy array
def tonumpyarray(mp_arr):
    return np.frombuffer(mp_arr.get_obj(), dtype=np.uint8)

# draw a box with text in the upper left on the image
def drawobjectbox(image, text, rect):
    x1, y1, x2, y2 = rect

    # draw the red bounding box
    cv2.rectangle(image, (x1, y1), (x2, y2), (0, 0, 255), 2)

    # get the size of the text
    (text_width, text_height) = cv2.getTextSize(text, LABEL_FONT, FONT_SCALE, 1)[0]

    # draw the text background with padding
    cv2.rectangle(image, (x1, y1), (x1 + text_width + 8, y1 - text_height - 8), (0, 0, 255), cv2.FILLED)

    # draw the text
    cv2.putText(image, text, (x1 + 4, y1 - 4), LABEL_FONT, FONT_SCALE, (0, 0, 0), lineType=cv2.LINE_AA)
