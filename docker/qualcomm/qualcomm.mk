BOARDS += qualcomm

local-qualcomm: version
	docker buildx bake --file=docker/qualcomm/qualcomm.hcl qualcomm \
		--set qualcomm.tags=frigate:latest-qualcomm \
		--load

build-qualcomm: version
	docker buildx bake --file=docker/qualcomm/qualcomm.hcl qualcomm \
		--set qualcomm.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-qualcomm

push-qualcomm: build-qualcomm
	docker buildx bake --file=docker/qualcomm/qualcomm.hcl qualcomm \
		--set qualcomm.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-qualcomm \
		--push
