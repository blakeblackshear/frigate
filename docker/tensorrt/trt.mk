BOARDS += trt

JETPACK5_BASE ?= nvcr.io/nvidia/l4t-tensorrt:r8.5.2-runtime	# L4T 35.3.1 JetPack 5.1.1
JETPACK6_BASE ?= nvcr.io/nvidia/tensorrt:23.12-py3-igpu
X86_DGPU_ARGS := ARCH=amd64 COMPUTE_LEVEL="50 60 70 80 90"
JETPACK5_ARGS := ARCH=arm64 BASE_IMAGE=$(JETPACK5_BASE) SLIM_BASE=$(JETPACK5_BASE) TRT_BASE=$(JETPACK5_BASE)
JETPACK6_ARGS := ARCH=arm64 BASE_IMAGE=$(JETPACK6_BASE) SLIM_BASE=$(JETPACK6_BASE) TRT_BASE=$(JETPACK6_BASE)

local-trt: version
	$(X86_DGPU_ARGS) docker buildx bake --file=docker/tensorrt/trt.hcl tensorrt \
		--set tensorrt.tags=frigate:latest-tensorrt \
		--load

local-trt-jp5: version
	$(JETPACK5_ARGS) docker buildx bake --file=docker/tensorrt/trt.hcl tensorrt \
		--set tensorrt.tags=frigate:latest-tensorrt-jp5 \
		--load

local-trt-jp6: version
	$(JETPACK6_ARGS) docker buildx bake --file=docker/tensorrt/trt.hcl tensorrt \
		--set tensorrt.tags=frigate:latest-tensorrt-jp6 \
		--load

build-trt:
	$(X86_DGPU_ARGS) docker buildx bake --file=docker/tensorrt/trt.hcl tensorrt \
		--set tensorrt.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt
	$(JETPACK5_ARGS) docker buildx bake --file=docker/tensorrt/trt.hcl tensorrt \
		--set tensorrt.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt-jp5
	$(JETPACK6_ARGS) docker buildx bake --file=docker/tensorrt/trt.hcl tensorrt \
		--set tensorrt.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt-jp6

push-trt: build-trt
	$(X86_DGPU_ARGS) docker buildx bake --file=docker/tensorrt/trt.hcl tensorrt \
		--set tensorrt.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt \
		--push
	$(JETPACK5_ARGS) docker buildx bake --file=docker/tensorrt/trt.hcl tensorrt \
		--set tensorrt.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt-jp5 \
		--push
	$(JETPACK6_ARGS) docker buildx bake --file=docker/tensorrt/trt.hcl tensorrt \
		--set tensorrt.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt-jp6 \
		--push
