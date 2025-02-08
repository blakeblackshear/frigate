target wget {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/arm64","linux/amd64"]
  target = "wget"
}

target wheels {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/arm64","linux/amd64"]
  target = "wheels"
}

target deps {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/arm64","linux/amd64"]
  target = "deps"
}

target rootfs {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/arm64","linux/amd64"]
  target = "rootfs"
}

target h8l {
  dockerfile = "docker/hailo8l/Dockerfile"
  contexts = {
    wget = "target:wget"
    wheels = "target:wheels"
    deps = "target:deps"
    rootfs = "target:rootfs"
  }
  platforms = ["linux/arm64","linux/amd64"]
}
