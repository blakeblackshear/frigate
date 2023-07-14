BOARDS += trt

local-trt: version
	docker buildx build --tag frigate:latest-tensorrt --load --file docker/build/tensorrt/Dockerfile .

build-trt:
	docker buildx build --platform linux/amd64 --tag $(IMAGE_REPO):${VERSION}-$(COMMIT_HASH)-tensorrt --file docker/build/trt/Dockerfile .

push-trt: build-trt
	docker buildx build --push --platform linux/arm64 --tag $(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt --file docker/build/rpi/Dockerfile .