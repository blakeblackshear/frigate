default_target: amd64_frigate

amd64_wheels:
	docker build --tag blakeblackshear/frigate-wheels:amd64 --file docker/Dockerfile.wheels .

amd64_ffmpeg:
	docker build --tag blakeblackshear/frigate-ffmpeg:amd64 --file docker/Dockerfile.ffmpeg.amd64 .

amd64_frigate:
	docker build --tag frigate-base --build-arg ARCH=amd64 --file docker/Dockerfile.base .
	docker build --tag frigate --file docker/Dockerfile.amd64 .

amd64_all: amd64_wheels amd64_ffmpeg amd64_frigate

arm64_wheels:
	docker build --tag blakeblackshear/frigate-wheels:arm64 --file docker/Dockerfile.wheels.arm64 .

arm64_ffmpeg:
	docker build --tag blakeblackshear/frigate-ffmpeg:arm64 --file docker/Dockerfile.ffmpeg.arm64 .

arm64_frigate:
	docker build --tag frigate-base --build-arg ARCH=arm64 --file docker/Dockerfile.base .
	docker build --tag frigate --file docker/Dockerfile.arm64 .

armv7hf_all: arm64_wheels arm64_ffmpeg arm64_frigate

armv7hf_wheels:
	docker build --tag blakeblackshear/frigate-wheels:armv7hf --file docker/Dockerfile.wheels .

armv7hf_ffmpeg:
	docker build --tag blakeblackshear/frigate-ffmpeg:armv7hf --file docker/Dockerfile.ffmpeg.armv7hf .

armv7hf_frigate:
	docker build --tag frigate-base --build-arg ARCH=armv7hf --file docker/Dockerfile.base .
	docker build --tag frigate --file docker/Dockerfile.armv7hf .

armv7hf_all: armv7hf_wheels armv7hf_ffmpeg armv7hf_frigate
