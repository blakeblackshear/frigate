BOARDS += rocm

# AMD/ROCm is chunky so we build couple of smaller images for specific chipsets
ROCM_CHIPSETS:=gfx900:9.0.0 gfx1030:10.3.0 gfx1100:11.0.0

local-rocm: version
	$(foreach chipset,$(ROCM_CHIPSETS),AMDGPU=$(word 1,$(subst :, ,$(chipset))) HSA_OVERRIDE_GFX_VERSION=$(word 2,$(subst :, ,$(chipset))) HSA_OVERRIDE=1 docker buildx bake --load --file=docker/rocm/rocm.hcl --set rocm.tags=frigate:latest-rocm-$(word 1,$(subst :, ,$(chipset))) rocm;)
	unset HSA_OVERRIDE_GFX_VERSION && HSA_OVERRIDE=0 AMDGPU=gfx docker buildx bake --load --file=docker/rocm/rocm.hcl --set rocm.tags=frigate:latest-rocm rocm

build-rocm: version
	$(foreach chipset,$(ROCM_CHIPSETS),AMDGPU=$(word 1,$(subst :, ,$(chipset))) HSA_OVERRIDE_GFX_VERSION=$(word 2,$(subst :, ,$(chipset))) HSA_OVERRIDE=1 docker buildx bake --file=docker/rocm/rocm.hcl --set rocm.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rocm-$(chipset) rocm;)
	unset HSA_OVERRIDE_GFX_VERSION && HSA_OVERRIDE=0 AMDGPU=gfx docker buildx bake --file=docker/rocm/rocm.hcl --set rocm.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rocm rocm

push-rocm: build-rocm
	$(foreach chipset,$(ROCM_CHIPSETS),AMDGPU=$(word 1,$(subst :, ,$(chipset))) HSA_OVERRIDE_GFX_VERSION=$(word 2,$(subst :, ,$(chipset))) HSA_OVERRIDE=1 docker buildx bake --push --file=docker/rocm/rocm.hcl --set rocm.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rocm-$(chipset) rocm;)
	unset HSA_OVERRIDE_GFX_VERSION && HSA_OVERRIDE=0 AMDGPU=gfx docker buildx bake --push --file=docker/rocm/rocm.hcl --set rocm.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rocm rocm

