BOARDS += trt

X86_DGPU_ARGS := ARCH=amd64

local-trt: version
	$(X86_DGPU_ARGS) docker buildx bake --load --file=docker/tensorrt/trt.hcl --set tensorrt.tags=frigate:latest-tensorrt tensorrt

build-trt:
	$(X86_DGPU_ARGS) docker buildx bake --file=docker/tensorrt/trt.hcl --set tensorrt.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt tensorrt

push-trt: build-trt
	$(X86_DGPU_ARGS) docker buildx bake --push --file=docker/tensorrt/trt.hcl --set tensorrt.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt tensorrt
