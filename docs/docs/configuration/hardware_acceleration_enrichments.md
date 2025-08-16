---
id: hardware_acceleration_enrichments
title: Enrichments
---

# Enrichments

Some of Frigate's enrichments can use a discrete GPU for accelerated processing.

## Requirements

Object detection and enrichments (like Semantic Search, Face Recognition, and License Plate Recognition) are independent features. To use a GPU for object detection, see the [Object Detectors](/configuration/object_detectors.md) documentation. If you want to use your GPU for any supported enrichments, you must choose the appropriate Frigate Docker image for your GPU and configure the enrichment according to its specific documentation.

- **AMD**

  - ROCm will automatically be detected and used for enrichments in the `-rocm` Frigate image.

- **Intel**

  - OpenVINO will automatically be detected and used for enrichments in the default Frigate image.

- **Nvidia**
  - Nvidia GPUs will automatically be detected and used for enrichments in the `-tensorrt` Frigate image.
  - Jetson devices will automatically be detected and used for enrichments in the `-tensorrt-jp6` Frigate image.

Utilizing a GPU for enrichments does not require you to use the same GPU for object detection. For example, you can run the `tensorrt` Docker image for enrichments and still use other dedicated hardware like a Coral or Hailo for object detection. However, one combination that is not supported is TensorRT for object detection and OpenVINO for enrichments.

:::note

A Google Coral is a TPU (Tensor Processing Unit), not a dedicated GPU (Graphics Processing Unit) and therefore does not provide any kind of acceleration for Frigate's enrichments.

:::
