default_target: local

COMMIT_HASH := $(shell git log -1 --pretty=format:"%h"|tail -1)
VERSION = 0.11.0
CURRENT_UID := $(shell id -u)
CURRENT_GID := $(shell id -g)

version:
	echo "VERSION=\"$(VERSION)-$(COMMIT_HASH)\"" > frigate/version.py

build_web:
	docker run --volume ${PWD}/web:/web -w /web --volume /etc/passwd:/etc/passwd:ro --volume /etc/group:/etc/group:ro -u $(CURRENT_UID):$(CURRENT_GID) node:16 /bin/bash -c "npm install && npm run build"

nginx_frigate:
	docker buildx build --push --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --tag blakeblackshear/frigate-nginx:1.0.2 --file docker/Dockerfile.nginx .

local:
	DOCKER_BUILDKIT=1 docker build -t frigate -f docker/Dockerfile .

amd64:
	docker buildx build --platform linux/amd64 --tag blakeblackshear/frigate:$(VERSION)-$(COMMIT_HASH) --file docker/Dockerfile .

arm64:
	docker buildx build --platform linux/arm64 --tag blakeblackshear/frigate:$(VERSION)-$(COMMIT_HASH) --file docker/Dockerfile .

armv7:
	docker buildx build --platform linux/arm/v7 --tag blakeblackshear/frigate:$(VERSION)-$(COMMIT_HASH) --file docker/Dockerfile .

build: version build_web amd64 arm64 armv7
	docker buildx build --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --tag blakeblackshear/frigate:$(VERSION)-$(COMMIT_HASH) --file docker/Dockerfile .

push: build
	docker buildx build --push --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --tag blakeblackshear/frigate:$(VERSION)-$(COMMIT_HASH) --file docker/Dockerfile .

run_tests: frigate
	docker run --rm --entrypoint=python3 frigate:latest -u -m unittest
	docker run --rm --entrypoint=python3 frigate:latest -u -m mypy --config-file frigate/mypy.ini frigate

.PHONY: run_tests
