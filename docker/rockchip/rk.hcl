target wheels {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/arm64"]
  target = "wheels"
}

target deps-rootfs {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/arm64"]
  target = "deps-rootfs"
}

target rootfs {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/arm64"]
  target = "rootfs"
}

target rk {
  dockerfile = "docker/rockchip/Dockerfile"
  contexts = {
    wheels = "target:wheels",
    deps-rootfs = "target:deps-rootfs",
    rootfs = "target:rootfs"
  }
  platforms = ["linux/arm64"]
}