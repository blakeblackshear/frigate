---
id: wifi_cameras
title: Troubleshooting WiFi Cameras
---

The use of WiFi cameras is discouraged for a reason. Below some advice to mitigate some of the issues one may encounter.

### TLDR

* Provide separate physical access points for mobile devices (phones, tablets, etc.) and cameras.
* Configure different Wifi frequency channels for every 'camera AP' and the APs for mobile devices.
* Start with no more than ~2 cameras per access point and only increase the number after successful testing.
* Set the cameras to 'constant bitrate' as opposed to 'variable bitrate'.
* Start with no more than 1Mbps per camera and only increase after some testing.
* Limit traffic from each camera to the minimum.
    * Configure go2rtc to [Reduce Connections To Camera](/configuration/restream.md)
    * Do not use the sub-stream from the camera (as this would again increase traffic) but use the go2rtc re-stream instead (may require resizing, make sure to use [hardware acceleration](/configuration/hardware_acceleration.md)).

### General AP congestion

She: Honey, why is my youtube taking so long to load since you installed the surveilance system? And the Whatsapp calls get interrupted constantly!

He: I don't know, the feed of the cameras is stuttery and lagging too!

Access Points function similar to walkie-talkies, and can only 'talk' to one device at a time. Hence all the data packets from each device are transmitted and received one after the other. Consequently during the transmission of one device, all other devices on the same frequency must remain quiet and wait until it's their turn to transmit. As long as all devices make spurious transmits, are in reception range of each other and hence aware that another device is transmitting, they'll wait, won't talk over each other and get their transmits done at some point a few fractions of a second later. With devices further apart, and unable to determine that another device is transmitting, they start talking over each other, disrupting the communication, requiring re-transmit of the packages of both devices. In an attempt to combat interference, most devices will re-transmit at lower data rates, leading to increased air-time, leading to even more congestion. Adding WiFi cameras, transmitting each frame in near real-time causes a flood of packets/transmissions constantly hitting the AP. Having two wifi cameras out or range of each other, will allow them to constantly talk over each other, leading to a large amount of re-transmissions. A recipe to quickly saturate any AP.

Test setup:
* 4x ABUS TVIP42562 / TVIP62562 WiFi cameras, transmitting with constant bitrate of 4Mbps
* 1x smartphone
* Only these 5 devices connected to a Ubiquity UAP-AC-Pro (rated for 450Mbps @ 2.4GHz and 200 clients with 3x3 MIMO) with 1Gbps uplink
* Frigate running on bare metal with intel i9-9900K and plenty of resources, qsv hardware acceleration, Coral TPU, etc.

Results:
* Approx. 35% of packets from all cameras need re-transmission (The guidance is to stay below 10% for time critical applications like VoIP, so that's not a good number)
* The video feed is stuttery
* ffmpeg logs start showing decoding errors, supposedly because some packets never make it to the frigate server
    ```
    2024-05-26 17:05:57.264698659  [h264 @ 0x7fd9cc25b940] error while decoding MB 9 3
    2024-05-26 17:06:07.226321574  [h264 @ 0x7fd9cc25b940] out of range intra chroma pred mode
    2024-05-26 17:06:07.226326051  [h264 @ 0x7fd9cc25b940] error while decoding MB 19 46
    2024-05-26 17:06:12.185106863  [h264 @ 0x7fd9cc25b940] out of range intra chroma pred mode
    2024-05-26 17:06:12.185109402  [h264 @ 0x7fd9cc25b940] error while decoding MB 57 9
    2024-05-26 17:06:17.235267075  [h264 @ 0x7fd9cc261ac0] corrupted macroblock 94 58 (total_coeff=-1)
    2024-05-26 17:06:17.235271191  [h264 @ 0x7fd9cc261ac0] error while decoding MB 94 58
    ```
* ffmpeg crashing 'randomly'
* Loading time on smartphone becomes annoyingly long, VoIP calls get dropped

YMMV, but at a certain point the AP can't cope with it anymore, and this is generally the case at data rates much lower than what it says in the brochure (in this case transmitting only 16Mbps on an AP stated to be capable of 450Mbps).

Mitigations:
* Separate mobile devices from cameras to prevent impact on mobile device users
* Reduce air-time/traffic on the AP:
    * Reduce data rates on cameras
    * Reduce number of connections to the camera
    * Reduce number of cameras per AP

### AP congestion during motion events, possibly crashing ffmpeg

...When the surveillance system functions smoothly, and exactly when the burglar enters the frame the recording stops, ffmpeg crashes and when 20s later everything has recovered and is up and running again, the show is already over...

This behavior may lead one to believe that the host running frigate has some issue with the workload caused by motion and object detection in the event of action (or there is some frigate internal issue). One can then start to do performance tuning, add motion masks to reduce workload and offload the server, etc. However, the root cause may be elsewhere...

In this case it's helpful to monitor the stream from the camera directly (yet again increasing AP congestion), or better the go2rtc re-stream. ffplay may be useful for this (to ensure there is no buffering or other amenities): `ffplay -i 'rtsp://10.0.20.200:8554/entrance' -rtsp_transport tcp`. The stream may be smooth and as soon as the spouse walks by the camera, the stream may become laggy and stuttery, and may only recover once the person has left the frame.

This indicates that the camera/stream/network is the problem, and not the server running frigate.

When using 'variable bitrate' on the cameras, the transmitted bitrate can be drastically reduced when there are little changes from frame to frame. However, as soon as there is some motion, the bitrate suddenly increases. Of course this is even worse when the same event is 'seen' by more than one camera, and all of them start ramping up their data rate at the same time. This may then set off the 'talk-over-each-other' issue, followed by re-transmits described above. This can quickly become so bad that the frames arrive on the server out of order (or multiple time the same frame is received), making the life of ffmpeg extremely difficult, somtimes leading to crashes:
```
2024-05-26 17:16:45.609121781  [2024-05-26 17:16:45] watchdog.entrance              ERROR   : Ffmpeg process crashed unexpectedly for entrance.
2024-05-26 17:16:45.609362682  [2024-05-26 17:16:45] watchdog.entrance              ERROR   : The following ffmpeg logs include the last 100 lines prior to exit.
2024-05-26 17:16:45.609568327  [2024-05-26 17:16:45] ffmpeg.entrance.detect         ERROR   : [segment @ 0x557e8a8c1b80] Timestamps are unset in a packet for stream 0. This is deprecated and will stop working in the future. Fix your code to set the timestamps properly
2024-05-26 17:16:45.609750645  [2024-05-26 17:16:45] ffmpeg.entrance.detect         ERROR   : [segment @ 0x557e8a8c1b80] Non-monotonous DTS in output stream 0:0; previous: 180224, current: 180224; changing to 180225. This may result in incorrect timestamps in the output file.
2024-05-26 17:16:45.609919297  [2024-05-26 17:16:45] ffmpeg.entrance.detect         ERROR   : [segment @ 0x557e8a8c1b80] Non-monotonous DTS in output stream 0:0; previous: 794637, current: 794637; changing to 794638. This may result in incorrect timestamps in the output file.
```
Effects:
* Frigate functions nicely most of the time
* Exactly when there is motion, everything comes crashing down. Where motion on one camera makes the recording of other cameras (on the same AP) stutter, sometimes taking down ffmpeg and interrupting all recordings.
* After about 20s the watchdogs have restarted everything, and all is normal again.

Mitigations:
* When using variable bitrate, make sure the AP/network is sufficiently over provisioned to handle peak bitrate from all cameras simultaneously (which is difficult to test and confirm).
* Set the cameras to 'constant bitrate' to provide a stable traffic load, whether there is motion or not.
* Assign cameras to APs such that only one camera on the same AP would 'see' an event, i.e. only one of them ramping up bitrate at the same time.

### Conclusions

* WiFi cameras are discouraged for a reason. Sooner or later you find yourself on the struggle-bus and investing a lot of effort to make it work.
* The setup quickly requires numerous APs and somewhat elaborate configuration.
* And even then, you'll most likely find ffmpeg crashes and lost footage in the logs.