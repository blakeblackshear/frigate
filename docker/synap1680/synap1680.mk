BOARDS += synap1680

local-synap1680: version
	docker buildx bake --file=docker/synap1680/synap1680.hcl synap1680 \
		--set synap1680.tags=frigate:latest-synap1680 \
		--load

build-synap1680: version
	docker buildx bake --file=docker/synap1680/synap1680.hcl synap1680 \
		--set synap1680.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-synap1680

push-synap1680: build-synap1680
	docker buildx bake --file=docker/synap1680/synap1680.hcl synap1680 \
		--set synap1680.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-synap1680 \
		--push
