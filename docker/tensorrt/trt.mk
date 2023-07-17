BOARDS += trt

local-trt: version
	docker buildx bake --file=docker/rpi/bake.hcl --set rpi.tagsfrigate:latest-tensorrt tensorrt

build-trt:
	docker buildx bake --file=docker/rpi/bake.hcl --set rpi.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt tensorrt

push-trt: build-trt
	docker buildx bake --push --file=docker/rpi/bake.hcl --set rpi.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt tensorrt