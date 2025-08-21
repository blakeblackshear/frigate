BOARDS += rk

local-rk: version
	docker buildx bake --file=docker/rockchip/rk.hcl rk \
		--set rk.tags=frigate:latest-rk \
		--load

build-rk: version
	docker buildx bake --file=docker/rockchip/rk.hcl rk \
		--set rk.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rk

push-rk: build-rk
	docker buildx bake --file=docker/rockchip/rk.hcl rk \
		--set rk.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rk \
		--push