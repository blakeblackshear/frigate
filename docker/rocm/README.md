
# AMD/ROCm GPU based detector

## Docker settings

AMD/ROCm needs access to `/dev/kfd` and `/dev/dri`. When running as user also needs the `video group. Sometimes also needs the `render` and `ssh/_ssh` groups.
For reference/comparison see [running ROCm PyTorch Docker image](https://rocm.docs.amd.com/projects/install-on-linux/en/develop/how-to/3rd-party/pytorch-install.html#using-docker-with-pytorch-pre-installed).

```bash
$ docker run -it --device=/dev/kfd --device=/dev/dri --group-add video \
    ...
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


