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
variable "COMPUTE_LEVEL" {
  default = ""
}
variable "BUILD_ONNXRUNTIME_FROM_SOURCE" {
  default = "0"
}
variable "ONNXRUNTIME_VERSION" {
  default = "1.25.1"
}
variable "ONNXRUNTIME_BRANCH" {
  default = "rel-1.25.1"
}
variable "TENSORRT_PYTHON_BRANCH" {
  default = "release/8.6"
}
variable "L4T_APT_RELEASE" {
  default = ""
}
variable "JETSON_SOC_REPO" {
  default = ""
}
variable "PIP_IGNORE_INSTALLED" {
  default = ""
}
variable "BASE_HOOK" {
  # Ensure an up-to-date python 3.11 is available in jetson images
  default = <<EOT
if grep -iq \"ubuntu\" /etc/os-release; then
  . /etc/os-release

  # Add the deadsnakes PPA repository
  echo "deb https://ppa.launchpadcontent.net/deadsnakes/ppa/ubuntu $VERSION_CODENAME main" >> /etc/apt/sources.list.d/deadsnakes.list
  echo "deb-src https://ppa.launchpadcontent.net/deadsnakes/ppa/ubuntu $VERSION_CODENAME main" >> /etc/apt/sources.list.d/deadsnakes.list

  # Add deadsnakes signing key
  apt-key adv --keyserver keyserver.ubuntu.com --recv-keys F23C5A6CF475977595C89F51BA6932366A755776
fi
EOT
}

target "_build_args" {
  args = {
    BASE_IMAGE = BASE_IMAGE,
    SLIM_BASE = SLIM_BASE,
    TRT_BASE = TRT_BASE,
    COMPUTE_LEVEL = COMPUTE_LEVEL,
    BUILD_ONNXRUNTIME_FROM_SOURCE = BUILD_ONNXRUNTIME_FROM_SOURCE,
    ONNXRUNTIME_VERSION = ONNXRUNTIME_VERSION,
    ONNXRUNTIME_BRANCH = ONNXRUNTIME_BRANCH,
    TENSORRT_PYTHON_BRANCH = TENSORRT_PYTHON_BRANCH,
    L4T_APT_RELEASE = L4T_APT_RELEASE,
    JETSON_SOC_REPO = JETSON_SOC_REPO,
    PIP_IGNORE_INSTALLED = PIP_IGNORE_INSTALLED,
    BASE_HOOK = BASE_HOOK
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

target "tensorrt" {
  dockerfile = "docker/tensorrt/Dockerfile.${ARCH}"
  context = "."
  contexts = {
    wget = "target:wget",
    wheels = "target:wheels",
    deps = "target:deps",
    rootfs = "target:rootfs"
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
