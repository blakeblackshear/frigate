---
id: hardware
title: Recommended hardware
---

## Cameras

Cameras that output H.264 video and AAC audio will offer the most compatibility with all features of Frigate and Home Assistant. It is also helpful if your camera supports multiple substreams to allow different resolutions to be used for detection, streaming, and recordings without re-encoding.

I recommend Dahua, Hikvision, and Amcrest in that order. Dahua edges out Hikvision because they are easier to find and order, not because they are better cameras. I personally use Dahua cameras because they are easier to purchase directly. In my experience Dahua and Hikvision both have multiple streams with configurable resolutions and frame rates and rock solid streams. They also both have models with large sensors well known for excellent image quality at night. Not all the models are equal. Larger sensors are better than higher resolutions; especially at night. Amcrest is the fallback recommendation because they are rebranded Dahuas. They are rebranding the lower end models with smaller sensors or less configuration options.

Many users have reported various issues with Reolink cameras, so I do not recommend them. If you are using Reolink, I suggest the [Reolink specific configuration](configuration/camera_specific#reolink-410520-possibly-others). Wifi cameras are also not recommended. Their streams are less reliable and cause connection loss and/or lost video data.

Here are some of the camera's I recommend:

- [Loryta(Dahua) T5442TM-AS-LED](https://amzn.to/2Wck2hQ) (affiliate link)
- [Loryta(Dahua) IPC-T5442TM-AS](https://amzn.to/39FODrm) (affiliate link)
- [Amcrest IP5M-T1179EW-28MM](https://amzn.to/39H1zgt) (affiliate link)

I may earn a small commission for my endorsement, recommendation, testimonial, or link to any products or services from this website.

## Server

My current favorite is the Minisforum GK50 because the dual NICs allow you to setup a dedicated private network for your cameras where they can be blocked from accessing the internet. I may earn a small commission for my endorsement, recommendation, testimonial, or link to any products or services from this website.

| Name                                                                | Inference Speed | Notes                                                                                                                         |
| ------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [Minisforum GK41](https://amzn.to/3kI0njr) (affiliate link)         | 9-10ms          | Great alternative to a NUC. Easily handles several 1080p cameras.                                                             |
| [Minisforum GK50](https://amzn.to/3m49yKk) (affiliate link)         | 9-10ms          | Dual gigabit NICs for easy isolated camera network. Easily handles several 1080p cameras.                                     |
| [Intel NUC](https://amzn.to/3kImYMT) (affiliate link)               | 8-10ms          | Overkill for most, but great performance. Can handle many cameras at 5fps depending on typical amounts of motion.             |
| [BMAX B2 Plus](https://amzn.to/3uccBnD) (affiliate link)            | 10-12ms         | Good balance of performance and cost. Also capable of running many other services at the same time as frigate.                |
| [Atomic Pi](https://amzn.to/3i9YRVw) (affiliate link)               | 16ms            | Good option for a dedicated low power board with a small number of cameras. Can leverage Intel QuickSync for stream decoding. |
| [Raspberry Pi 3B (32bit)](https://amzn.to/3lZUi16) (affiliate link) | 60ms            | Can handle a small number of cameras, but the detection speeds are slow due to USB 2.0.                                       |
| [Raspberry Pi 4 (32bit)](https://amzn.to/2ZpgDNW) (affiliate link)  | 15-20ms         | Can handle a small number of cameras. The 2GB version runs fine.                                                              |
| [Raspberry Pi 4 (64bit)](https://amzn.to/2ZpgDNW) (affiliate link)  | 10-15ms         | Can handle a small number of cameras. The 2GB version runs fine.                                                              |

## Google Coral TPU

It is strongly recommended to use a Google Coral. Frigate is designed around the expectation that a Coral is used to achieve very low inference speeds. Offloading TensorFlow to the Google Coral is an order of magnitude faster and will reduce your CPU load dramatically. A $60 device will outperform $2000 CPU. Frigate should work with any supported Coral device from https://coral.ai

The USB version is compatible with the widest variety of hardware and does not require a driver on the host machine. However, it does lack the automatic throttling features of the other versions.

The PCIe and M.2 versions require installation of a driver on the host. Follow the instructions for your version from https://coral.ai

A single Coral can handle many cameras and will be sufficient for the majority of users. You can calculate the maximum performance of your Coral based on the inference speed reported by Frigate. With an inference speed of 10, your Coral will top out at `1000/10=100`, or 100 frames per second. If your detection fps is regularly getting close to that, you should first consider tuning motion masks. If those are already properly configured, a second Coral may be needed.
