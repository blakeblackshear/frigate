---
id: hardware
title: Recommended hardware
---

## Cameras

Cameras that output H.264 video and AAC audio will offer the most compatibility with all features of Frigate and Home Assistant. It is also helpful if your camera supports multiple substreams to allow different resolutions to be used for detection, streaming, and recordings without re-encoding.

I recommend Dahua, Hikvision, and Amcrest in that order. Dahua edges out Hikvision because they are easier to find and order, not because they are better cameras. I personally use Dahua cameras because they are easier to purchase directly. In my experience Dahua and Hikvision both have multiple streams with configurable resolutions and frame rates and rock solid streams. They also both have models with large sensors well known for excellent image quality at night. Not all the models are equal. Larger sensors are better than higher resolutions; especially at night. Amcrest is the fallback recommendation because they are rebranded Dahuas. They are rebranding the lower end models with smaller sensors or less configuration options.

Many users have reported various issues with Reolink cameras, so I do not recommend them. If you are using Reolink, I suggest the [Reolink specific configuration](configuration/camera_specific#reolink-410520-possibly-others). Wifi cameras are also not recommended. Their streams are less reliable and cause connection loss and/or lost video data.

Here are some of the camera's I recommend:

- <a href="https://amzn.to/3uFLtxB" target="_blank" rel="nofollow noopener sponsored">Loryta(Dahua) T5442TM-AS-LED</a> (affiliate link)
- <a href="https://amzn.to/3isJ3gU" target="_blank" rel="nofollow noopener sponsored">Loryta(Dahua) IPC-T5442TM-AS</a> (affiliate link)
- <a href="https://amzn.to/2ZWNWIA" target="_blank" rel="nofollow noopener sponsored">Amcrest IP5M-T1179EW-28MM</a> (affiliate link)

I may earn a small commission for my endorsement, recommendation, testimonial, or link to any products or services from this website.

## Server

My current favorite is the Odyssey X86 Blue J4125 because the Coral M.2 compatibility and dual NICs that allow you to setup a dedicated private network for your cameras where they can be blocked from accessing the internet. I may earn a small commission for my endorsement, recommendation, testimonial, or link to any products or services from this website.

| Name                                                                                                                             | Inference Speed | Coral Compatibility | Notes                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| <a href="https://amzn.to/3oH4BKi" target="_blank" rel="nofollow noopener sponsored">Odyssey X86 Blue J4125</a> (affiliate link)  | 9-10ms          | M.2 B+M             | Dual gigabit NICs for easy isolated camera network. Easily handles several 1080p cameras.                                     |
| <a href="https://amzn.to/3oxEC8m" target="_blank" rel="nofollow noopener sponsored">Minisforum GK41</a> (affiliate link)         | 9-10ms          | USB                 | Great alternative to a NUC. Easily handles several 1080p cameras.                                                             |
| <a href="https://amzn.to/3ixJFlb" target="_blank" rel="nofollow noopener sponsored">Minisforum GK50</a> (affiliate link)         | 9-10ms          | USB                 | Dual gigabit NICs for easy isolated camera network. Easily handles several 1080p cameras.                                     |
| <a href="https://amzn.to/3l7vCEI" target="_blank" rel="nofollow noopener sponsored">Intel NUC</a> (affiliate link)               | 8-10ms          | USB                 | Overkill for most, but great performance. Can handle many cameras at 5fps depending on typical amounts of motion.             |
| <a href="https://amzn.to/3a6TBh8" target="_blank" rel="nofollow noopener sponsored">BMAX B2 Plus</a> (affiliate link)            | 10-12ms         | USB                 | Good balance of performance and cost. Also capable of running many other services at the same time as frigate.                |
| <a href="https://amzn.to/2YjpY9m" target="_blank" rel="nofollow noopener sponsored">Atomic Pi</a> (affiliate link)               | 16ms            | USB                 | Good option for a dedicated low power board with a small number of cameras. Can leverage Intel QuickSync for stream decoding. |
| <a href="https://amzn.to/2WIpwRU" target="_blank" rel="nofollow noopener sponsored">Raspberry Pi 3B (32bit)</a> (affiliate link) | 60ms            | USB                 | Can handle a small number of cameras, but the detection speeds are slow due to USB 2.0.                                       |
| <a href="https://amzn.to/2YhSGHH" target="_blank" rel="nofollow noopener sponsored">Raspberry Pi 4 (32bit)</a> (affiliate link)  | 15-20ms         | USB                 | Can handle a small number of cameras. The 2GB version runs fine.                                                              |
| <a href="https://amzn.to/2YhSGHH" target="_blank" rel="nofollow noopener sponsored">Raspberry Pi 4 (64bit)</a> (affiliate link)  | 10-15ms         | USB                 | Can handle a small number of cameras. The 2GB version runs fine.                                                              |

## Google Coral TPU

It is strongly recommended to use a Google Coral. Frigate is designed around the expectation that a Coral is used to achieve very low inference speeds. Offloading TensorFlow to the Google Coral is an order of magnitude faster and will reduce your CPU load dramatically. A $60 device will outperform $2000 CPU. Frigate should work with any supported Coral device from https://coral.ai

The USB version is compatible with the widest variety of hardware and does not require a driver on the host machine. However, it does lack the automatic throttling features of the other versions.

The PCIe and M.2 versions require installation of a driver on the host. Follow the instructions for your version from https://coral.ai

A single Coral can handle many cameras and will be sufficient for the majority of users. You can calculate the maximum performance of your Coral based on the inference speed reported by Frigate. With an inference speed of 10, your Coral will top out at `1000/10=100`, or 100 frames per second. If your detection fps is regularly getting close to that, you should first consider tuning motion masks. If those are already properly configured, a second Coral may be needed.

### What does Frigate use the CPU for and what does it use the Coral for? (ELI5 Version)

This is taken from a [user question on reddit](https://www.reddit.com/r/homeassistant/comments/q8mgau/comment/hgqbxh5/?utm_source=share&utm_medium=web2x&context=3). Modified slightly for clarity.

CPU Usage: I am a CPU, Mendel is a Google Coral

My buddy Mendel and I have been tasked with keeping the neighbor's red footed booby off my parent's yard. Now I'm really bad at identifying birds. It takes me forever, but my buddy Mendel is incredible at it.

Mendel however, struggles at pretty much anything else. So we make an agreement. I wait till I see something that moves, and snap a picture of it for Mendel. I then show him the picture and he tells me what it is. Most of the time it isn't anything. But eventually I see some movement and Mendel tells me it is the Booby. Score!

_What happens when I increase the resolution of my camera?_

However we realize that there is a problem. There is still booby poop all over the yard. How could we miss that! I've been watching all day! My parents check the window and realize its dirty and a bit small to see the entire yard so they clean it and put a bigger one in there. Now there is so much more to see! However I now have a much bigger area to scan for movement and have to work a lot harder! Even my buddy Mendel has to work harder, as now the pictures have a lot more detail in them that he has to look at to see if it is our sneaky booby.

Basically - When you increase the resolution and/or the frame rate of the stream there is now significantly more data for the CPU to parse. That takes additional computing power. The Google Coral is really good at doing object detection, but it doesn't have time to look everywhere all the time (especially when there are many windows to check). To balance it, Frigate uses the CPU to look for movement, then sends those frames to the Coral to do object detection. This allows the Coral to be available to a large number of cameras and not overload it.

### Do hwaccel args help if I am using a Coral?

YES! The Coral does not help with decoding video streams.

Decompressing video streams takes a significant amount of CPU power. Video compression uses key frames (also known as I-frames) to send a full frame in the video stream. The following frames only include the difference from the key frame, and the CPU has to compile each frame by merging the differences with the key frame. [More detailed explanation](https://blog.video.ibm.com/streaming-video-tips/keyframes-interframe-video-compression/). Higher resolutions and frame rates mean more processing power is needed to decode the video stream, so try and set them on the camera to avoid unnecessary decoding work.
