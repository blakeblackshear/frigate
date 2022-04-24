default_target: frigate

COMMIT_HASH := $(shell git log -1 --pretty=format:"%h"|tail -1)
VERSION = 0.11.0

version:
	echo "VERSION=\"$(VERSION)-$(COMMIT_HASH)\"" > frigate/version.py

nginx_frigate:
	docker buildx build --push --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --tag blakeblackshear/frigate-nginx:1.0.2 --file docker/Dockerfile.nginx .

frigate: version
	DOCKER_BUILDKIT=1 docker build -t frigate -f docker/Dockerfile .

frigate_amd64: version
	docker buildx build --platform linux/amd64 --tag blakeblackshear/frigate:$(VERSION)-$(COMMIT_HASH) --file docker/Dockerfile .

frigate_arm64: version
	docker buildx build --platform linux/arm64 --tag blakeblackshear/frigate:$(VERSION)-$(COMMIT_HASH) --file docker/Dockerfile .

frigate_armv7: version
	docker buildx build --platform linux/arm/v7 --tag blakeblackshear/frigate:$(VERSION)-$(COMMIT_HASH) --file docker/Dockerfile .

frigate_build: frigate_amd64 frigate_arm64 frigate_armv7
	docker buildx build --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --tag blakeblackshear/frigate:$(VERSION)-$(COMMIT_HASH) --file docker/Dockerfile .

frigate_push: frigate_build
	docker buildx build --push --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --tag blakeblackshear/frigate:$(VERSION)-$(COMMIT_HASH) --file docker/Dockerfile .

run_tests: frigate
	docker run --rm --entrypoint=python3 frigate:latest -u -m unittest
	docker run --rm --entrypoint=python3 frigate:latest -u -m mypy --config-file frigate/mypy.ini frigate

.PHONY: run_tests
