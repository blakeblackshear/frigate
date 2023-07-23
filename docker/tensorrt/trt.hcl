target deps {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/amd64"]
  target = "deps"
}

target rootfs {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/amd64"]
  target = "rootfs"
}

target wheels {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/amd64"]
  target = "wheels"
}

target devcontainer {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/amd64"]
  target = "devcontainer"
}

target tensorrt {
  dockerfile = "docker/tensorrt/Dockerfile"
  context = "."
  contexts = {
    deps = "target:deps",
    rootfs = "target:rootfs"
    wheels = "target:wheels"
  }
  platforms = ["linux/amd64"]
  target = "frigate-tensorrt"
}

target devcontainer-trt {
  dockerfile = "docker/tensorrt/Dockerfile"
  context = "."
  contexts = {
    deps = "target:deps",
    rootfs = "target:rootfs"
    wheels = "target:wheels"
    devcontainer = "target:devcontainer"
  }
  platforms = ["linux/amd64"]
  target = "devcontainer-trt"
}