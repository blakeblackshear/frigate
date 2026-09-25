BOARDS += rocm-ryzenai

# Directory with the Ryzen AI 1.7.1 archive, ryzen_ai-1.7.1.tgz, as downloaded
RYZENAI_PATH ?=

check-rocm-ryzenai-paths:
	@if [ -z "$(RYZENAI_PATH)" ]; then \
		echo "ERROR: RYZENAI_PATH must be set to the directory holding ryzen_ai-1.7.1.tgz"; \
		exit 1; \
	fi

local-rocm-ryzenai: check-rocm-ryzenai-paths version
	docker buildx bake --file=docker/rocm-ryzenai/rocm-ryzenai.hcl rocm-ryzenai \
		--set rocm-ryzenai.tags=frigate:latest-rocm-ryzenai \
		--set rocm-ryzenai.contexts.ryzenai=$(RYZENAI_PATH) \
		--allow=fs.read=$(RYZENAI_PATH) \
		--load

build-rocm-ryzenai: check-rocm-ryzenai-paths version
	docker buildx bake --file=docker/rocm-ryzenai/rocm-ryzenai.hcl rocm-ryzenai \
		--set rocm-ryzenai.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rocm-ryzenai \
		--set rocm-ryzenai.contexts.ryzenai=$(RYZENAI_PATH) \
		--allow=fs.read=$(RYZENAI_PATH)

push-rocm-ryzenai: build-rocm-ryzenai
	docker buildx bake --file=docker/rocm-ryzenai/rocm-ryzenai.hcl rocm-ryzenai \
		--set rocm-ryzenai.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rocm-ryzenai \
		--set rocm-ryzenai.contexts.ryzenai=$(RYZENAI_PATH) \
		--allow=fs.read=$(RYZENAI_PATH) \
		--push
