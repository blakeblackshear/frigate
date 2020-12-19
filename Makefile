default_target: amd64_frigate

COMMIT_HASH := $(shell git log -1 --pretty=format:"%h")

version:
	echo "VERSION='0.8.0-$(COMMIT_HASH)'" > frigate/version.py

amd64_wheels:
	docker build --tag blakeblackshear/frigate-wheels:amd64 --file docker/Dockerfile.wheels .

amd64_ffmpeg:
	docker build --tag blakeblackshear/frigate-ffmpeg:1.1.0-amd64 --file docker/Dockerfile.ffmpeg.amd64 .

amd64_frigate: version
	docker build --tag frigate-base --build-arg ARCH=amd64 --build-arg FFMPEG_VERSION=1.1.0 --file docker/Dockerfile.base .
	docker build --tag frigate --file docker/Dockerfile.amd64 .

amd64_all: amd64_wheels amd64_ffmpeg amd64_frigate

amd64nvidia_wheels:
	docker build --tag blakeblackshear/frigate-wheels:amd64nvidia --file docker/Dockerfile.wheels .

amd64nvidia_ffmpeg:
	docker build --tag blakeblackshear/frigate-ffmpeg:1.0.0-amd64nvidia --file docker/Dockerfile.ffmpeg.amd64nvidia .

amd64nvidia_frigate: version
	docker build --tag frigate-base --build-arg ARCH=amd64nvidia --build-arg FFMPEG_VERSION=1.0.0 --file docker/Dockerfile.base .
	docker build --tag frigate --file docker/Dockerfile.amd64nvidia .

amd64nvidia_all: amd64nvidia_wheels amd64nvidia_ffmpeg amd64nvidia_frigate

aarch64_wheels:
	docker build --tag blakeblackshear/frigate-wheels:aarch64 --file docker/Dockerfile.wheels.aarch64 .

aarch64_ffmpeg:
	docker build --tag blakeblackshear/frigate-ffmpeg:1.0.0-aarch64 --file docker/Dockerfile.ffmpeg.aarch64 .

aarch64_frigate: version
	docker build --tag frigate-base --build-arg ARCH=aarch64 --build-arg FFMPEG_VERSION=1.0.0 --file docker/Dockerfile.base .
	docker build --tag frigate --file docker/Dockerfile.aarch64 .

armv7_all: armv7_wheels armv7_ffmpeg armv7_frigate

armv7_wheels:
	docker build --tag blakeblackshear/frigate-wheels:armv7 --file docker/Dockerfile.wheels .

armv7_ffmpeg:
	docker build --tag blakeblackshear/frigate-ffmpeg:1.0.0-armv7 --file docker/Dockerfile.ffmpeg.armv7 .

armv7_frigate: version
	docker build --tag frigate-base --build-arg ARCH=armv7 --build-arg FFMPEG_VERSION=1.0.0 --file docker/Dockerfile.base .
	docker build --tag frigate --file docker/Dockerfile.armv7 .

armv7_all: armv7_wheels armv7_ffmpeg armv7_frigate
