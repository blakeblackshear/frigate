default_target: amd64_frigate

COMMIT_HASH := $(shell git log -1 --pretty=format:"%h"|tail -1)

version:
	echo "VERSION='0.10.0-$(COMMIT_HASH)'" > frigate/version.py

web:
	docker build --tag frigate-web --file docker/Dockerfile.web web/

amd64_wheels:
	docker build --tag blakeblackshear/frigate-wheels:1.0.3-amd64 --file docker/Dockerfile.wheels .

amd64_ffmpeg:
	docker build --no-cache --pull --tag blakeblackshear/frigate-ffmpeg:1.2.0-amd64 --file docker/Dockerfile.ffmpeg.amd64 .

nginx_frigate:
	docker buildx build --push --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --tag blakeblackshear/frigate-nginx:1.0.2 --file docker/Dockerfile.nginx .

amd64_frigate: version web
	docker build --no-cache --tag frigate-base --build-arg ARCH=amd64 --build-arg FFMPEG_VERSION=1.1.0 --build-arg WHEELS_VERSION=1.0.3 --build-arg NGINX_VERSION=1.0.2 --file docker/Dockerfile.base .
	docker build --no-cache --tag frigate --file docker/Dockerfile.amd64 .

amd64_all: amd64_wheels amd64_ffmpeg amd64_frigate

amd64nvidia_wheels:
	docker build --tag blakeblackshear/frigate-wheels:1.0.3-amd64nvidia --file docker/Dockerfile.wheels .

amd64nvidia_ffmpeg:
	docker build --no-cache --pull --tag blakeblackshear/frigate-ffmpeg:1.2.0-amd64nvidia --file docker/Dockerfile.ffmpeg.amd64nvidia .

amd64nvidia_frigate: version web
	docker build --no-cache --tag frigate-base --build-arg ARCH=amd64nvidia --build-arg FFMPEG_VERSION=1.0.0 --build-arg WHEELS_VERSION=1.0.3 --build-arg NGINX_VERSION=1.0.2 --file docker/Dockerfile.base .
	docker build --no-cache --tag frigate --file docker/Dockerfile.amd64nvidia .

amd64nvidia_all: amd64nvidia_wheels amd64nvidia_ffmpeg amd64nvidia_frigate

aarch64_wheels:
	docker build --tag blakeblackshear/frigate-wheels:1.0.3-aarch64 --file docker/Dockerfile.wheels .

aarch64_ffmpeg:
	docker build --no-cache --pull --tag blakeblackshear/frigate-ffmpeg:1.3.0-aarch64 --file docker/Dockerfile.ffmpeg.aarch64 .

aarch64_frigate: version web
	docker build --no-cache --tag frigate-base --build-arg ARCH=aarch64 --build-arg FFMPEG_VERSION=1.0.0 --build-arg WHEELS_VERSION=1.0.3 --build-arg NGINX_VERSION=1.0.2 --file docker/Dockerfile.base .
	docker build --no-cache --tag frigate --file docker/Dockerfile.aarch64 .

aarch64_all: aarch64_wheels aarch64_ffmpeg aarch64_frigate

aarch64_l4t_assets:
	mkdir -p $$(pwd)/.l4t_assets
	cp ./converters/yolo4/plugin/* .l4t_assets/
	cp ./converters/yolo4/model/yolov4-tiny-416.trt .l4t_assets/yolov4-tiny-416.trt
	cp ./converters/yolo4/model/yolov4-tiny-288.trt .l4t_assets/yolov4-tiny-288.trt
	# cp ./converters/yolo4/model/yolov4-416.trt .l4t_assets/yolov4-416.trt
	# cp ./converters/yolo4/model/yolov4-288.trt .l4t_assets/yolov4-288.trt

aarch64_l4t_wheels:
	@docker build --tag frigate-wheels-l4t --file docker/Dockerfile.wheels.l4t .
	# Run l4t wheels using nvidia runtime
	@docker rm frigate.wheels.l4t || true
	@docker run --name frigate.wheels.l4t -it --runtime=nvidia -e NVIDIA_VISIBLE_DEVICES=all -e NVIDIA_DRIVER_CAPABILITIES=compute,utility,video --privileged frigate-wheels-l4t
	# Commit changes to the container
	@CONTAINER_ID=`docker ps -n 1 --format "{{.ID}}"`
	@docker commit $$CONTAINER_ID frigate.wheels.l4t frigate-wheels-l4t:latest
	@docker rm frigate.wheels.l4t || true

aarch64_l4t_frigate: # aarch64_l4t_wheels aarch64_l4t_assets
	docker build --tag frigate-base-l4t --build-arg BASE_IMAGE=timongentzsch/l4t-ubuntu20-opencv:latest --build-arg FFMPEG_ARCH=arm64 --build-arg ARCH=aarch64 --build-arg WHEELS_VERSION=1.0.3 --build-arg NGINX_VERSION=1.0.2 --file docker/Dockerfile.base .
	nvidia-docker build --tag frigate.l4t --build-arg NGINX_VERSION=1.0.2 --file docker/Dockerfile.aarch64.l4t .


armv7_wheels:
	docker build --tag blakeblackshear/frigate-wheels:1.0.3-armv7 --file docker/Dockerfile.wheels .

armv7_ffmpeg:
	docker build --no-cache --pull --tag blakeblackshear/frigate-ffmpeg:1.2.0-armv7 --file docker/Dockerfile.ffmpeg.armv7 .

armv7_frigate: version web
	docker build --no-cache --tag frigate-base --build-arg ARCH=armv7 --build-arg FFMPEG_VERSION=1.0.0 --build-arg WHEELS_VERSION=1.0.3 --build-arg NGINX_VERSION=1.0.2 --file docker/Dockerfile.base .
	docker build --no-cache --tag frigate --file docker/Dockerfile.armv7 .

armv7_all: armv7_wheels armv7_ffmpeg armv7_frigate

run_tests:
	# PLATFORM: linux/arm64/v8 linux/amd64 or linux/arm/v7
	# ARCH: aarch64 amd64 or armv7
	@cat docker/Dockerfile.base docker/Dockerfile.$(ARCH) > docker/Dockerfile.test
	@sed -i "s/FROM frigate-web as web/#/g" docker/Dockerfile.test
	@sed -i "s/COPY --from=web \/opt\/frigate\/build web\//#/g" docker/Dockerfile.test
	@sed -i "s/FROM frigate-base/#/g" docker/Dockerfile.test
	@echo "" >> docker/Dockerfile.test
	@echo "RUN python3 -m unittest" >> docker/Dockerfile.test
	@docker buildx build --platform=$(PLATFORM) --tag frigate-base --build-arg NGINX_VERSION=1.0.2 --build-arg FFMPEG_VERSION=1.0.0 --build-arg ARCH=$(ARCH) --build-arg FFMPEG_ARCH=$(FFMPEG_ARCH) --build-arg WHEELS_VERSION=1.0.3 --file docker/Dockerfile.test .
	@rm docker/Dockerfile.test

.PHONY: web run_tests
