variable "ROCM" {
  default = "7.2.3"
}
variable "HSA_OVERRIDE_GFX_VERSION" {
  default = ""
}
variable "HSA_OVERRIDE" {
  default = "1"
}
# Directory with the Ryzen AI 1.7.1 Linux archive, ryzen_ai-1.7.1.tgz, as downloaded
variable "RYZENAI_PATH" {
  default = ""
}

target wget {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/amd64"]
  target = "wget"
}

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

target rocm-dist {
  dockerfile = "docker/rocm/Dockerfile"
  contexts = {
    wget = "target:wget"
  }
  platforms = ["linux/amd64"]
  target = "rocm-dist"
  args = {
    ROCM = ROCM
  }
}

target rocm-ryzenai {
  dockerfile = "docker/rocm-ryzenai/Dockerfile"
  contexts = {
    deps = "target:deps",
    wget = "target:wget",
    rootfs = "target:rootfs",
    rocm-dist = "target:rocm-dist",
    ryzenai = RYZENAI_PATH
  }
  platforms = ["linux/amd64"]
  args = {
    HSA_OVERRIDE_GFX_VERSION = HSA_OVERRIDE_GFX_VERSION,
    HSA_OVERRIDE = HSA_OVERRIDE
  }
}
