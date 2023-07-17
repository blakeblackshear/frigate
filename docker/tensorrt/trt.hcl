target "deps" {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/amd64"]
}

target rootfs {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/amd64"]
}

target "tensorrt" {
  dockerfile = "docker/tensorrt/Dockerfile"
  contexts = {
    deps = "target:deps",
    rootfs = "target:rootfs"
  }
  platforms = ["linux/amd64"]
}