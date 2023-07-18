target deps {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/arm64"]
  target = "deps"
}

target rootfs {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/arm64"]
  target = "rootfs"
}

target rpi {
  dockerfile = "docker/rpi/Dockerfile"
  contexts = {
    deps = "target:deps",
    rootfs = "target:rootfs"
  }
  platforms = ["linux/arm64"]
}