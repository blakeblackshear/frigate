---
id: planning_setup
title: Planning a New Installation
---

Choosing the right hardware for your Frigate NVR setup is important for optimal performance and a smooth experience. This guide will walk you through the key considerations, focusing on the number of cameras and the hardware required for efficient object detection.

## Key Considerations

### Number of Cameras and Simultaneous Activity

The most fundamental factor in your hardware decision is the number of cameras you plan to use. However, it's not just about the raw count; it's also about how many of those cameras are likely to see activity and require object detection simultaneously.

When motion is detected in a camera's feed, regions of that frame are sent to your chosen [object detection hardware](/configuration/object_detectors).

- **Low Simultaneous Activity (1-6 cameras with occasional motion)**: If you have a few cameras in areas with infrequent activity (e.g., a seldom-used backyard, a quiet interior), the demand on your object detection hardware will be lower. A single, entry-level AI accelerator will suffice.
- **Moderate Simultaneous Activity (6-12 cameras with some overlapping motion)**: For setups with more cameras, especially in areas like a busy street or a property with multiple access points, it's more likely that several cameras will capture activity at the same time. This increases the load on your object detection hardware, requiring more processing power.
- **High Simultaneous Activity (12+ cameras or highly active zones)**: Large installations or scenarios where many cameras frequently capture activity (e.g., busy street with overview, identification, dedicated LPR cameras, etc.) will necessitate robust object detection capabilities. You'll likely need multiple entry-level AI accelerators or a more powerful single unit such as a discrete GPU.
- **Commercial Installations (40+ cameras)**: Commercial installations or scenarios where a substantial number of cameras capture activity (e.g., a commercial property, an active public space) will necessitate robust object detection capabilities. You'll likely need a modern discrete GPU.

### Video Decoding

Modern CPUs with integrated GPUs (Intel Quick Sync, AMD VCN) or dedicated GPUs can significantly offload video decoding from the main CPU, freeing up resources. This is highly recommended, especially for multiple cameras.

:::tip

For commercial installations it is important to verify the number of supported concurrent streams on your GPU, many consumer GPUs max out at ~20 concurrent camera streams.

:::

## Hardware Considerations

### Object Detection

There are many different hardware options for object detection depending on priorities and available hardware. See [the recommended hardware page](./hardware.md#detectors) for more specifics on what hardware is recommended for object detection.

### Storage

Storage is an important consideration when planning a new installation. To get a more precise estimate of your storage requirements, you can use an IP camera storage calculator. Websites like [IPConfigure Storage Calculator](https://calculator.ipconfigure.com/) can help you determine the necessary disk space based on your camera settings.


#### SSDs (Solid State Drives)

SSDs are an excellent choice for Frigate, offering high speed and responsiveness. The older concern that SSDs would quickly "wear out" from constant video recording is largely no longer valid for modern consumer and enterprise-grade SSDs.

- Longevity: Modern SSDs are designed with advanced wear-leveling algorithms and significantly higher "Terabytes Written" (TBW) ratings than earlier models. For typical home NVR use, a good quality SSD will likely outlast the useful life of your NVR hardware itself.
- Performance: SSDs excel at handling the numerous small write operations that occur during continuous video recording and can significantly improve the responsiveness of the Frigate UI and clip retrieval.
- Silence and Efficiency: SSDs produce no noise and consume less power than traditional HDDs.

#### HDDs (Hard Disk Drives)

Traditional Hard Disk Drives (HDDs) remain a great and often more cost-effective option for long-term video storage, especially for larger setups where raw capacity is prioritized.

- Cost-Effectiveness: HDDs offer the best cost per gigabyte, making them ideal for storing many days, weeks, or months of continuous footage.
- Capacity: HDDs are available in much larger capacities than most consumer SSDs, which is beneficial for extensive video archives.
- NVR-Rated Drives: If choosing an HDD, consider drives specifically designed for surveillance (NVR) use, such as Western Digital Purple or Seagate SkyHawk. These drives are engineered for 24/7 operation and continuous write workloads, offering improved reliability compared to standard desktop drives.

Determining Your Storage Needs
The amount of storage you need will depend on several factors:

- Number of Cameras: More cameras naturally require more space.
- Resolution and Framerate: Higher resolution (e.g., 4K) and higher framerate (e.g., 30fps) streams consume significantly more storage.
- Recording Method: Continuous recording uses the most space. motion-only recording or object-triggered recording can save space, but may miss some footage.
- Retention Period: How many days, weeks, or months of footage do you want to keep?

#### Network Storage (NFS/SMB)

While supported, using network-attached storage (NAS) for recordings can introduce latency and network dependency considerations. For optimal performance and reliability, it is generally recommended to have local storage for your Frigate recordings. If using a NAS, ensure your network connection to it is robust and fast (Gigabit Ethernet at minimum) and that the NAS itself can handle the continuous write load.

### RAM (Memory)

- **Basic Minimum: 4GB RAM**: This is generally sufficient for a very basic Frigate setup with a few cameras and a dedicated object detection accelerator, without running any enrichments. Performance might be tight, especially with higher resolution streams or numerous detections.
- **Minimum for Enrichments: 8GB RAM**: If you plan to utilize Frigate's enrichment features (e.g., facial recognition, license plate recognition, or other AI models that run alongside standard object detection), 8GB of RAM should be considered the minimum. Enrichments require additional memory to load and process their respective models and data.
- **Recommended: 16GB RAM**: For most users, especially those with many cameras (8+) or who plan to heavily leverage enrichments, 16GB of RAM is highly recommended. This provides ample headroom for smooth operation, reduces the likelihood of swapping to disk (which can impact performance), and allows for future expansion.