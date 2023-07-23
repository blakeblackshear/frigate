BOARDS += trt

local-trt: version
	docker buildx bake --load --file=docker/tensorrt/trt.hcl --set tensorrt.tags=frigate:latest-tensorrt tensorrt

build-trt:
	docker buildx bake --file=docker/tensorrt/trt.hcl --set tensorrt.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt tensorrt

push-trt: build-trt
	docker buildx bake --push --file=docker/tensorrt/trt.hcl --set tensorrt.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt tensorrt