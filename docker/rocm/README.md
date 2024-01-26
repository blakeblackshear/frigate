
# AMD/ROCm GPU based detector

## Building

Running `make local-rocm` results in following images:

- `frigate:latest-rocm`, 7.64 GB, all possible chipsets
- `frigate:latest-rocm-gfx1030`, 3.72 GB, gfx1030 and compatible
- `frigate:latest-rocm-gfx900`, 3.64 GB, gfx900 and compatible

## Docker settings

AMD/ROCm needs access to `/dev/kfd` and `/dev/dri`. When running as user also needs the `video` group. Sometimes also needs the `render` and `ssh/_ssh` groups.
For reference/comparison see [running ROCm PyTorch Docker image](https://rocm.docs.amd.com/projects/install-on-linux/en/develop/how-to/3rd-party/pytorch-install.html#using-docker-with-pytorch-pre-installed).

```bash
$ docker run --device=/dev/kfd --device=/dev/dri --group-add video \
    ...
```

When running on iGPU you likely need to specify the proper `HSA_OVERRIDE_GFX_VERSION` environment variable. For chip specific docker images this is done automatically, for others you need to figure out what it is. AMD/ROCm does not officially support the iGPUs. See the [ROCm issue](https://github.com/ROCm/ROCm/issues/174) for context and examples.

If you have `gfx90c` (can be queried with `/opt/rocm/bin/rocminfo`) then you need to run with the gfx900 driver, so you would modify the docker launch by something like this:

```bash
$ docker run ... -e HSA_OVERRIDE_GFX_VERSION=9.0.0 ...
```

## Frigate configuration

An example of a working configuration:

```yaml
model:
  path: /yolov8n_320x320.onnx
  labelmap_path: /yolov8s_labels.txt
  model_type: yolov8
detectors:
  rocm:
    type: rocm
```


