BOARDS += rk

local-rk: version
	docker buildx bake --load --file=docker/rockchip/rk.hcl --set rk.tags=frigate:latest-rk rk

build-rk: version
	docker buildx bake --file=docker/rockchip/rk.hcl --set rk.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rk rk

push-rk: build-rk
	docker buildx bake --push --file=docker/rockchip/rk.hcl --set rk.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-rk rk