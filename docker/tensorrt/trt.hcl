target deps {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/amd64"]
}

target rootfs {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/amd64"]
}

target wheels {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/amd64"]
}

target "tensorrt" {
  dockerfile = "docker/tensorrt/Dockerfile"
  context = "."
  contexts = {
    deps = "target:deps",
    rootfs = "target:rootfs"
    wheels = "target:wheels"
  }
  platforms = ["linux/amd64"]
}