target wheels {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/arm64"]
  target = "wheels"
}

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

target qcs6490 {
  dockerfile = "docker/qcs6490/Dockerfile"
  contexts = {
    wheels = "target:wheels",
    deps = "target:deps",
    rootfs = "target:rootfs"
  }
  platforms = ["linux/arm64"]
}
