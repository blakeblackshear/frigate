---
id: hardware_acceleration_enrichments
title: Enrichments
---

# Enrichments

Some of Frigate's enrichments can use a discrete GPU or integrated GPU for accelerated processing.

## Requirements

Object detection and enrichments (like Semantic Search, Face Recognition, and License Plate Recognition) are independent features. To use a GPU / NPU for object detection, see the [Object Detectors](/configuration/object_detectors.md) documentation. If you want to use your GPU for any supported enrichments, you must choose the appropriate Frigate Docker image for your GPU / NPU and configure the enrichment according to its specific documentation.

- **AMD**
  - ROCm support in the `-rocm` Frigate image is automatically detected for enrichments, but only some enrichment models are available due to ROCm's focus on LLMs and limited stability with certain neural network models. Frigate disables models that perform poorly or are unstable to ensure reliable operation, so only compatible enrichments may be active.

- **Intel**
  - OpenVINO will automatically be detected and used for enrichments in the default Frigate image.
  - **Note:** Intel NPUs have limited model support for enrichments. GPU is recommended for enrichments when available.

- **Nvidia**
  - Nvidia GPUs will automatically be detected and used for enrichments in the `-tensorrt` Frigate image.
  - Jetson devices will automatically be detected and used for enrichments in the `-tensorrt-jp6` Frigate image.

- **RockChip**
  - RockChip NPU will automatically be detected and used for semantic search v1 and face recognition in the `-rk` Frigate image.

Utilizing a GPU for enrichments does not require you to use the same GPU for object detection. For example, you can run the `tensorrt` Docker image to run enrichments on an Nvidia GPU and still use other dedicated hardware like a Coral or Hailo for object detection. However, one combination that is not supported is the `tensorrt` image for object detection on an Nvidia GPU and Intel iGPU for enrichments.

:::note

A Google Coral is a TPU (Tensor Processing Unit), not a dedicated GPU (Graphics Processing Unit) and therefore does not provide any kind of acceleration for Frigate's enrichments.

:::
