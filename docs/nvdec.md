# nVidia hardware decoder (NVDEC)

Certain nvidia cards include a hardware decoder, which can greatly improve the
performance of video decoding. In order to use NVDEC, a special build of 
ffmpeg with NVDEC support is required. The special docker architecture 'amd64nvidia'
includes this support for amd64 platforms. An aarch64 for the Jetson, which 
also includes NVDEC may be added in the future.

## Docker setup

### Requirements
[nVidia closed source driver](https://www.nvidia.com/en-us/drivers/unix/) required to access NVDEC.
[nvidia-docker](https://github.com/NVIDIA/nvidia-docker) required to pass NVDEC to docker.

### Setting up docker-compose

In order to pass NVDEC, the docker engine must be set to `nvidia` and the environment variables
`NVIDIA_VISIBLE_DEVICES=all` and `NVIDIA_DRIVER_CAPABILITIES=compute,utility,video` must be set.

In a docker compose file, these lines need to be set:
```
services:
  frigate:
    ...
    image: blakeblackshear/frigate:stable-amd64nvidia
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - NVIDIA_DRIVER_CAPABILITIES=compute,utility,video 
```

### Setting up the configuration file

In your frigate config.yml, you'll need to set ffmpeg to use the hardware decoder. 
The decoder you choose will depend on the input video. 

A list of supported codecs (you can use `ffmpeg -decoders | grep cuvid` in the container to get a list)
```
 V..... h263_cuvid           Nvidia CUVID H263 decoder (codec h263)
 V..... h264_cuvid           Nvidia CUVID H264 decoder (codec h264)
 V..... hevc_cuvid           Nvidia CUVID HEVC decoder (codec hevc)
 V..... mjpeg_cuvid          Nvidia CUVID MJPEG decoder (codec mjpeg)
 V..... mpeg1_cuvid          Nvidia CUVID MPEG1VIDEO decoder (codec mpeg1video)
 V..... mpeg2_cuvid          Nvidia CUVID MPEG2VIDEO decoder (codec mpeg2video)
 V..... mpeg4_cuvid          Nvidia CUVID MPEG4 decoder (codec mpeg4)
 V..... vc1_cuvid            Nvidia CUVID VC1 decoder (codec vc1)
 V..... vp8_cuvid            Nvidia CUVID VP8 decoder (codec vp8)
 V..... vp9_cuvid            Nvidia CUVID VP9 decoder (codec vp9)
 ```

For example, for H265 video (hevc), you'll select `hevc_cuvid`. Add
`-c:v hevc_covid` to your ffmpeg input arguments:

```
ffmpeg:
  input_args:
    ...
    - -c:v 
    - hevc_cuvid
```

If everything is working correctly, you should see a significant improvement in performance.
Verify that hardware decoding is working by running `nvidia-smi`, which should show the ffmpeg
processes:

```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 455.38       Driver Version: 455.38       CUDA Version: 11.1     |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|                               |                      |               MIG M. |
|===============================+======================+======================|
|   0  GeForce GTX 166...  Off  | 00000000:03:00.0 Off |                  N/A |
| 38%   41C    P2    36W / 125W |   2082MiB /  5942MiB |      5%      Default |
|                               |                      |                  N/A |
+-------------------------------+----------------------+----------------------+
                                                                               
+-----------------------------------------------------------------------------+
| Processes:                                                                  |
|  GPU   GI   CI        PID   Type   Process name                  GPU Memory |
|        ID   ID                                                   Usage      |
|=============================================================================|
|    0   N/A  N/A     12737      C   ffmpeg                            249MiB |
|    0   N/A  N/A     12751      C   ffmpeg                            249MiB |
|    0   N/A  N/A     12772      C   ffmpeg                            249MiB |
|    0   N/A  N/A     12775      C   ffmpeg                            249MiB |
|    0   N/A  N/A     12800      C   ffmpeg                            249MiB |
|    0   N/A  N/A     12811      C   ffmpeg                            417MiB |
|    0   N/A  N/A     12827      C   ffmpeg                            417MiB |
+-----------------------------------------------------------------------------+
```

To further improve performance, you can set ffmpeg to skip frames in the output,
using the fps filter:

```
  output_args:
    - -filter:v 
    - fps=fps=5
```

This setting, for example, allows Frigate to consume my 10-15fps camera streams on
my relatively low powered Haswell machine with relatively low cpu usage.

