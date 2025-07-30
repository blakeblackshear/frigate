---
id: planning_setup
title: Planning setup
---

Choosing the right hardware for your Frigate NVR setup is important for optimal performance and a smooth experience. This guide will walk you through the key considerations, focusing on the number of cameras and the hardware required for efficient object detection.

## Key Considerations

### Number of Cameras and Simultaneous Activity

The most fundamental factor in your hardware decision is the number of cameras you plan to use. However, it's not just about the raw count; it's also about how many of those cameras are likely to see activity and require object detection simultaneously.

When motion is detected in a camera's feed, regions of that frame are sent to your chosen object detection hardware (e.g., a Coral TPU).

- **Low Simultaneous Activity (1-6 cameras with occasional motion)**: If you have a few cameras in areas with infrequent activity (e.g., a seldom-used backyard, a quiet interior), the demand on your object detection hardware will be lower. A single, entry-level AI accelerator will suffice.
- **Moderate Simultaneous Activity (6-12 cameras with some overlapping motion)**: For setups with more cameras, especially in areas like a busy street or a property with multiple access points, it's more likely that several cameras will capture activity at the same time. This increases the load on your object detection hardware, requiring more processing power.
- **High Simultaneous Activity (12+ cameras or highly active zones)**: Large installations or scenarios where many cameras frequently capture activity (e.g., busy street with overview, identification, dedicated LPR cameras, etc.) will necessitate robust object detection capabilities. You'll likely need multiple entry-level AI accelerators or a more powerful single unit such as a discrete GPU.
- **Commercial Installations (40+ cameras)**: Commercial installations or scenarios where a substantial number of cameras capture activity (e.g., a commercial property, an active public space) will necessitate robust object detection capabilities. You'll likely need a modern discrete GPU.

### Video Decoding

Modern CPUs with integrated GPUs (Intel Quick Sync, AMD VCN) or dedicated GPUs can significantly offload video decoding from the main CPU, freeing up resources. This is highly recommended, especially for multiple cameras.

:::tip

For commercial installations it is important to verify the number of supported concurrent streams on your GPU, many consumer GPUs max out at ~20 concurrent camera streams.

:::

### Object Detection

There are many different hardware options for object detection depending on priorities and available hardware. See [the recommended hardware page](./hardware.md#detectors) for more specifics on what hardware is recommended for object detection.

### RAM (Memory)

- **Basic Minimum: 4GB RAM**: This is generally sufficient for a very basic Frigate setup with a few cameras and a dedicated object detection accelerator, without running any enrichments. Performance might be tight, especially with higher resolution streams or numerous detections.
- **Minimum for Enrichments: 8GB RAM**: If you plan to utilize Frigate's enrichment features (e.g., facial recognition, license plate recognition, or other AI models that run alongside standard object detection), 8GB of RAM should be considered the minimum. Enrichments require additional memory to load and process their respective models and data.
- **Recommended: 16GB RAM**: For most users, especially those with many cameras (8+) or who plan to heavily leverage enrichments, 16GB of RAM is highly recommended. This provides ample headroom for smooth operation, reduces the likelihood of swapping to disk (which can impact performance), and allows for future expansion.