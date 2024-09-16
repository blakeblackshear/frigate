BOARDS += rpi

local-rpi: version
	docker buildx bake --file=docker/rpi/rpi.hcl rpi \
		--set rpi.tags=frigate:latest-rpi \
		--load

build-rpi: version
	docker buildx bake --file=docker/rpi/rpi.hcl rpi \
		--set rpi.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rpi

push-rpi: build-rpi
	docker buildx bake --file=docker/rpi/rpi.hcl rpi \
		--set rpi.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rpi \
		--push
