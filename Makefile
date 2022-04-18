default_target: frigate

COMMIT_HASH := $(shell git log -1 --pretty=format:"%h"|tail -1)
VERSION = 0.11.0

version:
	echo "VERSION=\"$(VERSION)-$(COMMIT_HASH)\"" > frigate/version.py

nginx_frigate:
	docker buildx build --push --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --tag blakeblackshear/frigate-nginx:1.0.2 --file docker/Dockerfile.nginx .

frigate: version
	DOCKER_BUILDKIT=1 docker build -t frigate -f docker/Dockerfile .

frigate_push: version
	docker buildx build --push --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --tag blakeblackshear/frigate:$(VERSION)-$(COMMIT_HASH) --file docker/Dockerfile .

run_tests: frigate
	docker run --rm --entrypoint=python3 frigate:latest -u -m unittest
	docker run --rm --entrypoint=python3 frigate:latest -u -m mypy --config-file frigate/mypy.ini frigate

.PHONY: run_tests
