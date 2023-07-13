default_target: local

COMMIT_HASH := $(shell git log -1 --pretty=format:"%h"|tail -1)
VERSION = 0.13.0
IMAGE_REPO ?= ghcr.io/blakeblackshear/frigate
CURRENT_UID := $(shell id -u)
CURRENT_GID := $(shell id -g)

version:
	echo 'VERSION = "$(VERSION)-$(COMMIT_HASH)"' > frigate/version.py

local: version
	docker buildx build --target=frigate --tag frigate:latest --load --file docker/build/main/Dockerfile .

local-rpi: version local
	docker buildx build --tag frigate:latest-rpi --build-arg BASE_IMAGE=frigate:latest --load --file docker/build/rpi/Dockerfile .

local-trt: version
	docker buildx build --target=frigate-tensorrt --tag frigate:latest-tensorrt --load --file docker/build/main/Dockerfile .

amd64:
	docker buildx build --platform linux/amd64 --target=frigate --tag $(IMAGE_REPO):$(VERSION)-$(COMMIT_HASH) --file docker/build/main/Dockerfile .
	docker buildx build --platform linux/amd64 --target=frigate-tensorrt --tag $(IMAGE_REPO):$(VERSION)-$(COMMIT_HASH)-tensorrt --file docker/build/main/Dockerfile .

arm64:
	docker buildx build --platform linux/arm64 --target=frigate --tag $(IMAGE_REPO):$(VERSION)-$(COMMIT_HASH) --file docker/build/main/Dockerfile .

build: version amd64 arm64
	docker buildx build --platform linux/arm64/v8,linux/amd64 --target=frigate --tag $(IMAGE_REPO):$(VERSION)-$(COMMIT_HASH) --file docker/build/main/Dockerfile .

push: build
	docker buildx build --push --platform linux/arm64/v8,linux/amd64 --target=frigate --tag $(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH) --file docker/build/main/Dockerfile .
	docker buildx build --push --platform linux/amd64 --target=frigate-tensorrt --tag $(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-tensorrt --file docker/build/main/Dockerfile .
	docker buildx build --push --platform linux/arm64 --build-arg BASE_IMAGE=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH) --tag $(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rpi --file docker/build/rpi/Dockerfile .

run: local
	docker run --rm --publish=5000:5000 --volume=${PWD}/config:/config frigate:latest

run_tests: local
	docker run --rm --workdir=/opt/frigate --entrypoint= frigate:latest python3 -u -m unittest
	docker run --rm --workdir=/opt/frigate --entrypoint= frigate:latest python3 -u -m mypy --config-file frigate/mypy.ini frigate

.PHONY: run_tests
