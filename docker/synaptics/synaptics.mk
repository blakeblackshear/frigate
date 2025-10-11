BOARDS += synaptics

local-synaptics: version
	docker buildx bake --file=docker/synaptics/synaptics.hcl synaptics \
		--set synaptics.tags=frigate:latest-synaptics \
		--load

build-synaptics: version
	docker buildx bake --file=docker/synaptics/synaptics.hcl synaptics \
		--set synaptics.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-synaptics

push-synaptics: build-synaptics
	docker buildx bake --file=docker/synaptics/synaptics.hcl synaptics \
		--set synaptics.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-synaptics \
		--push
