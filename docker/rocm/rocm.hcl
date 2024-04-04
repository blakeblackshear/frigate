variable "AMDGPU" {
  default = "gfx1100"
}
variable "ROCM" {
  default = "5.7.3"
}
variable "HSA_OVERRIDE_GFX_VERSION" {
  default = "11.0.0"
}
variable "HSA_OVERRIDE" {
  default = "1"
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

target rocm {
  dockerfile = "docker/rocm/Dockerfile"
  contexts = {
    deps = "target:deps",
    rootfs = "target:rootfs"
  }
  platforms = ["linux/amd64"]
  args = {
    AMDGPU = AMDGPU,
    ROCM = ROCM,
    HSA_OVERRIDE_GFX_VERSION = HSA_OVERRIDE_GFX_VERSION,
    HSA_OVERRIDE = HSA_OVERRIDE
  }
}
