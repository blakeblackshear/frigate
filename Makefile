default_target: local

COMMIT_HASH := $(shell git log -1 --pretty=format:"%h"|tail -1)
VERSION = 0.12.0
CURRENT_UID := $(shell id -u)
CURRENT_GID := $(shell id -g)

version:
	echo "VERSION=\"$(VERSION)-$(COMMIT_HASH)\"" > frigate/version.py

build_web:
	docker buildx build --target web-dist --output web/dist .

nginx_frigate:
	docker buildx build --push --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --tag blakeblackshear/frigate-nginx:1.0.2.nginx .

local:
	docker buildx build --tag frigate:latest .

amd64:
	docker buildx build --platform linux/amd64 --tag blakeblackshear/frigate:$(VERSION)-$(COMMIT_HASH) .

arm64:
	docker buildx build --platform linux/arm64 --tag blakeblackshear/frigate:$(VERSION)-$(COMMIT_HASH) .

armv7:
	docker buildx build --platform linux/arm/v7 --tag blakeblackshear/frigate:$(VERSION)-$(COMMIT_HASH) .

build: version amd64 arm64 armv7
	docker buildx build --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --tag blakeblackshear/frigate:$(VERSION)-$(COMMIT_HASH) .

push: build
	docker buildx build --push --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --tag ghcr.io/blakeblackshear/frigate:${GITHUB_REF_NAME}-$(COMMIT_HASH) .

run_tests: frigate
	docker run --rm --entrypoint=python3 frigate:latest -u -m unittest
	docker run --rm --entrypoint=python3 frigate:latest -u -m mypy --config-file frigate/mypy.ini frigate

.PHONY: run_tests
