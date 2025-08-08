# Notebooks

## YOLO-NAS Pretrained

You can build and download a compatible model with pre-trained weights using [Google Colab](https://colab.research.google.com/github/blakeblackshear/frigate/blob/dev/notebooks/YOLO_NAS_Pretrained_Export.ipynb).

> [!WARNING]  
> The pre-trained YOLO-NAS weights from DeciAI are subject to their license and can't be used commercially. For more information, see: https://docs.deci.ai/super-gradients/latest/LICENSE.YOLONAS.html

The input image size in this notebook is set to 320x320. This results in lower CPU usage and faster inference times without impacting performance in most cases due to the way Frigate crops video frames to areas of interest before running detection. The notebook and config can be updated to 640x640 if desired. By default, YOLO_NAS_S is built with YOLO_NAS_M and YOLO_NAS_L sizes also being available for export.