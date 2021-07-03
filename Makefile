default_target: amd64_frigate

COMMIT_HASH := $(shell git log -1 --pretty=format:"%h"|tail -1)

version:
	echo "VERSION='0.9.0-$(COMMIT_HASH)'" > frigate/version.py

web:
	docker build --tag frigate-web --file docker/Dockerfile.web web/

amd64_wheels:
	docker build --tag blakeblackshear/frigate-wheels:1.0.3-amd64 --file docker/Dockerfile.wheels .

amd64_ffmpeg:
	docker build --no-cache --pull --tag blakeblackshear/frigate-ffmpeg:1.2.0-amd64 --file docker/Dockerfile.ffmpeg.amd64 .

nginx_frigate:
	docker buildx build --push --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --tag blakeblackshear/frigate-nginx:1.0.0 --file docker/Dockerfile.nginx .

amd64_frigate: version web
	docker build --tag frigate-base --build-arg ARCH=amd64 --build-arg FFMPEG_VERSION=1.1.0 --build-arg WHEELS_VERSION=1.0.3 --build-arg NGINX_VERSION=1.0.0 --file docker/Dockerfile.base .
	docker build --tag frigate --file docker/Dockerfile.amd64 .

amd64_all: amd64_wheels amd64_ffmpeg amd64_frigate

amd64nvidia_wheels:
	docker build --tag blakeblackshear/frigate-wheels:1.0.3-amd64nvidia --file docker/Dockerfile.wheels .

amd64nvidia_ffmpeg:
	docker build --no-cache --pull --tag blakeblackshear/frigate-ffmpeg:1.0.0-amd64nvidia --file docker/Dockerfile.ffmpeg.amd64nvidia .

amd64nvidia_frigate: version web
	docker build --tag frigate-base --build-arg ARCH=amd64nvidia --build-arg FFMPEG_VERSION=1.0.0 --build-arg WHEELS_VERSION=1.0.3 --build-arg NGINX_VERSION=1.0.0 --file docker/Dockerfile.base .
	docker build --tag frigate --file docker/Dockerfile.amd64nvidia .

amd64nvidia_all: amd64nvidia_wheels amd64nvidia_ffmpeg amd64nvidia_frigate

aarch64_wheels:
	docker build --tag blakeblackshear/frigate-wheels:1.0.3-aarch64 --file docker/Dockerfile.wheels .

aarch64_ffmpeg:
	docker build --no-cache --pull --tag blakeblackshear/frigate-ffmpeg:1.0.0-aarch64 --file docker/Dockerfile.ffmpeg.aarch64 .

aarch64_frigate: version web
	docker build --tag frigate-base --build-arg ARCH=aarch64 --build-arg FFMPEG_VERSION=1.0.0 --build-arg WHEELS_VERSION=1.0.3 --build-arg NGINX_VERSION=1.0.0 --file docker/Dockerfile.base .
	docker build --tag frigate --file docker/Dockerfile.aarch64 .

armv7_all: armv7_wheels armv7_ffmpeg armv7_frigate

armv7_wheels:
	docker build --tag blakeblackshear/frigate-wheels:1.0.3-armv7 --file docker/Dockerfile.wheels .

armv7_ffmpeg:
	docker build --no-cache --pull --tag blakeblackshear/frigate-ffmpeg:1.0.0-armv7 --file docker/Dockerfile.ffmpeg.armv7 .

armv7_frigate: version web
	docker build --tag frigate-base --build-arg ARCH=armv7 --build-arg FFMPEG_VERSION=1.0.0 --build-arg WHEELS_VERSION=1.0.3 --build-arg NGINX_VERSION=1.0.0 --file docker/Dockerfile.base .
	docker build --tag frigate --file docker/Dockerfile.armv7 .

armv7_all: armv7_wheels armv7_ffmpeg armv7_frigate

.PHONY: web
