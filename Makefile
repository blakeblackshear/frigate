default_target: frigate

COMMIT_HASH := $(shell git log -1 --pretty=format:"%h"|tail -1)

version:
	echo "VERSION='0.11.0-$(COMMIT_HASH)'" > frigate/version.py

nginx_frigate:
	docker buildx build --push --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --tag blakeblackshear/frigate-nginx:1.0.2 --file docker/Dockerfile.nginx .

frigate: version
	DOCKER_BUILDKIT=1 docker build -t frigate -f docker/Dockerfile .

frigate_push: version
	docker buildx build --push --platform linux/arm64/v8,linux/amd64 --tag blakeblackshear/frigate:0.11.0-$(COMMIT_HASH) --file docker/Dockerfile .

run_tests:
	# PLATFORM: linux/arm64/v8 linux/amd64 or linux/arm/v7
	# ARCH: aarch64 amd64 or armv7
	@cat docker/Dockerfile.base docker/Dockerfile.$(ARCH) > docker/Dockerfile.test
	@sed -i "s/FROM frigate-web as web/#/g" docker/Dockerfile.test
	@sed -i "s/COPY --from=web \/opt\/frigate\/build web\//#/g" docker/Dockerfile.test
	@sed -i "s/FROM frigate-base/#/g" docker/Dockerfile.test
	@echo "" >> docker/Dockerfile.test
	@echo "RUN python3 -m unittest" >> docker/Dockerfile.test
	@docker buildx build --platform=$(PLATFORM) --tag frigate-base --build-arg NGINX_VERSION=1.0.2 --build-arg FFMPEG_VERSION=1.0.0 --build-arg ARCH=$(ARCH) --build-arg WHEELS_VERSION=1.0.3 --file docker/Dockerfile.test .
	@rm docker/Dockerfile.test

.PHONY: run_tests
