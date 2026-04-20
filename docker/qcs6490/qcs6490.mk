BOARDS += qcs6490

local-qcs6490: version
	docker buildx bake --file=docker/qcs6490/qcs6490.hcl qcs6490 \
		--set qcs6490.tags=frigate:latest-qcs6490 \
		--load

build-qcs6490: version
	docker buildx bake --file=docker/qcs6490/qcs6490.hcl qcs6490 \
		--set qcs6490.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-qcs6490

push-qcs6490: build-qcs6490
	docker buildx bake --file=docker/qcs6490/qcs6490.hcl qcs6490 \
		--set qcs6490.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-qcs6490 \
		--push
