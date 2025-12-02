BOARDS += rocm

local-rocm: version
	docker buildx bake --file=docker/rocm/rocm.hcl rocm \
		--set rocm.tags=frigate:latest-rocm \
		--load

build-rocm: version
	docker buildx bake --file=docker/rocm/rocm.hcl rocm \
		--set rocm.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rocm

push-rocm: build-rocm
	docker buildx bake --file=docker/rocm/rocm.hcl rocm \
		--set rocm.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rocm \
		--push
