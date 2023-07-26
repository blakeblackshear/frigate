BOARDS += trt

JETPACK4_BASE ?= timongentzsch/l4t-ubuntu20-opencv:latest	# L4T 32.7.1 JetPack 4.6.1
JETPACK5_BASE ?= nvcr.io/nvidia/l4t-tensorrt:r8.5.2-runtime	# L4T 35.3.1 JetPack 5.1.1
X86_DGPU_ARGS := ARCH=amd64
JETPACK4_ARGS := ARCH=arm64 BASE_IMAGE=$(JETPACK4_BASE) SLIM_BASE=$(JETPACK4_BASE) TRT_BASE=$(JETPACK4_BASE)
JETPACK5_ARGS := ARCH=arm64 BASE_IMAGE=$(JETPACK5_BASE) SLIM_BASE=$(JETPACK5_BASE) TRT_BASE=$(JETPACK5_BASE)

local-trt: version
	$(X86_DGPU_ARGS) docker buildx bake --load --file=docker/tensorrt/trt.hcl --set tensorrt.tags=frigate:latest-tensorrt tensorrt

local-trt-jp4: version
	$(JETPACK4_ARGS) docker buildx bake --load --file=docker/tensorrt/trt.hcl --set tensorrt.tags=frigate:latest-tensorrt-jp4 tensorrt

local-trt-jp5: version
	$(JETPACK5_ARGS) docker buildx bake --load --file=docker/tensorrt/trt.hcl --set tensorrt.tags=frigate:latest-tensorrt-jp5 tensorrt

build-trt:
	$(X86_DGPU_ARGS) docker buildx bake --file=docker/tensorrt/trt.hcl --set tensorrt.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt tensorrt
	$(JETPACK4_ARGS) docker buildx bake --file=docker/tensorrt/trt.hcl --set tensorrt.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt-jp4 tensorrt
	$(JETPACK5_ARGS) docker buildx bake --file=docker/tensorrt/trt.hcl --set tensorrt.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt-jp5 tensorrt

push-trt: build-trt
	$(X86_DGPU_ARGS) docker buildx bake --push --file=docker/tensorrt/trt.hcl --set tensorrt.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt tensorrt
	$(JETPACK4_ARGS) docker buildx bake --push --file=docker/tensorrt/trt.hcl --set tensorrt.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt-jp4 tensorrt
	$(JETPACK5_ARGS) docker buildx bake --push --file=docker/tensorrt/trt.hcl --set tensorrt.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt-jp5 tensorrt
