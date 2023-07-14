BOARDS += rpi

local-rpi: version
	docker buildx build --tag frigate:latest-rpi --load --file docker/build/rpi/Dockerfile .

build-rpi:
	docker buildx build --platform linux/arm64 --tag $(IMAGE_REPO):${VERSION}-$(COMMIT_HASH)-rpi --file docker/build/rpi/Dockerfile .

push-rpi: build-rpi
	docker buildx build --push --platform linux/arm64 --tag $(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rpi --file docker/build/rpi/Dockerfile .