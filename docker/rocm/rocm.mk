BOARDS += rocm

# AMD/ROCm is chunky so we build couple of smaller images for specific chipsets
ROCM_CHIPSETS:=gfx900:9.0.0 gfx1030:10.3.0 gfx1100:11.0.0

local-rocm: version
	$(foreach chipset,$(ROCM_CHIPSETS), \
		AMDGPU=$(word 1,$(subst :, ,$(chipset))) \
		HSA_OVERRIDE_GFX_VERSION=$(word 2,$(subst :, ,$(chipset))) \
		HSA_OVERRIDE=1 \
		docker buildx bake --file=docker/rocm/rocm.hcl rocm \
			--set rocm.tags=frigate:latest-rocm-$(word 1,$(subst :, ,$(chipset))) \
			--load \
	&&) true
	
	unset HSA_OVERRIDE_GFX_VERSION && \
	HSA_OVERRIDE=0 \
	AMDGPU=gfx \
	docker buildx bake --file=docker/rocm/rocm.hcl rocm \
		--set rocm.tags=frigate:latest-rocm \
		--load

build-rocm: version
	$(foreach chipset,$(ROCM_CHIPSETS), \
		AMDGPU=$(word 1,$(subst :, ,$(chipset))) \
		HSA_OVERRIDE_GFX_VERSION=$(word 2,$(subst :, ,$(chipset))) \
		HSA_OVERRIDE=1 \
		docker buildx bake --file=docker/rocm/rocm.hcl rocm \
			--set rocm.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rocm-$(chipset) \
	&&) true

	unset HSA_OVERRIDE_GFX_VERSION && \
	HSA_OVERRIDE=0 \
	AMDGPU=gfx \
	docker buildx bake --file=docker/rocm/rocm.hcl rocm \
		--set rocm.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rocm

push-rocm: build-rocm
	$(foreach chipset,$(ROCM_CHIPSETS), \
		AMDGPU=$(word 1,$(subst :, ,$(chipset))) \
		HSA_OVERRIDE_GFX_VERSION=$(word 2,$(subst :, ,$(chipset))) \
		HSA_OVERRIDE=1 \
		docker buildx bake --file=docker/rocm/rocm.hcl rocm \
			--set rocm.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rocm-$(chipset) \
			--push \
	&&) true

	unset HSA_OVERRIDE_GFX_VERSION && \
	HSA_OVERRIDE=0 \
	AMDGPU=gfx \
	docker buildx bake --file=docker/rocm/rocm.hcl rocm \
		--set rocm.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rocm \
		--push
