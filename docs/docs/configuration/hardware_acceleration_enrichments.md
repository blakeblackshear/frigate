---
id: hardware_acceleration_enrichments
title: Enrichments
---

# Enrichments

Some of Frigate's enrichments can use a discrete GPU for accelerated processing.

## Requirements

Object detection and enrichments (like Semantic Search, Face Recognition, and License Plate Recognition) are independent features. If you want to use your GPU with any supported enrichments, you must choose the appropriate Frigate Docker image for your GPU.

- **AMD**

  - ROCm will automatically be detected and used for enrichments in the `-rocm` Frigate image.

- **Intel**

  - OpenVINO will automatically be detected and used for Semantic Search in the default Frigate image.

- **Nvidia**
  - Nvidia GPUs will automatically be detected and used for Semantic Search in the `-tensorrt` Frigate image.
  - Jetson devices will automatically be detected and used for Semantic Search in the `-tensorrt-jp6` Frigate image.

Utilizing a GPU for enrichments does not require you to use the same GPU for object detection. For example, you can run the `tensorrt` Docker image for enrichments and still use other dedicated hardware for object detection.
