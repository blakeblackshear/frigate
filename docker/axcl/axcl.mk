BOARDS += axcl

local-axcl: version
	docker buildx bake --file=docker/axcl/axcl.hcl axcl \
		--set axcl.tags=frigate:latest-axcl \
		--load

build-axcl: version
	docker buildx bake --file=docker/axcl/axcl.hcl axcl \
		--set axcl.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-axcl

push-axcl: build-axcl
	docker buildx bake --file=docker/axcl/axcl.hcl axcl \
		--set axcl.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-axcl \
		--push