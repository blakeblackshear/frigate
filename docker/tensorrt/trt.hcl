variable "ARCH" {
  default = "amd64"
}
variable "BASE_IMAGE" {
  default = null
}
variable "SLIM_BASE" {
  default = null
}
variable "TRT_BASE" {
  default = null
}

target "_build_args" {
  args = {
    BASE_IMAGE = BASE_IMAGE,
    SLIM_BASE = SLIM_BASE,
    TRT_BASE = TRT_BASE
  }
  platforms = ["linux/${ARCH}"]
}

target wget {
  dockerfile = "docker/main/Dockerfile"
  target = "wget"
  inherits = ["_build_args"]
}

target deps {
  dockerfile = "docker/main/Dockerfile"
  target = "deps"
  inherits = ["_build_args"]
}

target rootfs {
  dockerfile = "docker/main/Dockerfile"
  target = "rootfs"
  inherits = ["_build_args"]
}

target wheels {
  dockerfile = "docker/main/Dockerfile"
  target = "wheels"
  inherits = ["_build_args"]
}

target devcontainer {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/amd64"]
  target = "devcontainer"
}

target "trt-deps" {
  dockerfile = "docker/tensorrt/Dockerfile.base"
  context = "."
  contexts = {
    deps = "target:deps",
  }
  inherits = ["_build_args"]
}

target "tensorrt-base" {
  dockerfile = "docker/tensorrt/Dockerfile.base"
  context = "."
  contexts = {
    deps = "target:deps",
  }
  inherits = ["_build_args"]
}

target "tensorrt" {
  dockerfile = "docker/tensorrt/Dockerfile.${ARCH}"
  context = "."
  contexts = {
    wget = "target:wget",
    tensorrt-base = "target:tensorrt-base",
    rootfs = "target:rootfs"
    wheels = "target:wheels"
  }
  target = "frigate-tensorrt"
  inherits = ["_build_args"]
}

target "devcontainer-trt" {
  dockerfile = "docker/tensorrt/Dockerfile.amd64"
  context = "."
  contexts = {
    wheels = "target:wheels",
    trt-deps = "target:trt-deps",
    devcontainer = "target:devcontainer"
  }
  platforms = ["linux/amd64"]
  target = "devcontainer-trt"
}
