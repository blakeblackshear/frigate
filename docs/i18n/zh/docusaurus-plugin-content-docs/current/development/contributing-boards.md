---
id: contributing-boards
title: 社区支持的开发板
---

## 关于社区支持的开发板

有许多单板计算机(SBC)拥有热情的社区支持，比如Jetson Nano。这些SBC通常具有专用硬件，可以大大加速Frigate的AI和视频处理工作负载，但这些硬件需要非常特定的框架来进行接口对接。

这意味着对Frigate的维护者来说，要支持这些不同的开发板将非常困难，特别是考虑到相对较小的用户群。

社区支持开发板框架允许社区用户通过提供代码、维护和用户支持，成为某个SBC或其他检测器支持的代码所有者。

## 入门指南

1. 遵循[主要贡献文档](/development/contributing.md)中的步骤。
2. 在`docker/`下创建新的构建类型。
3. 确保构建按预期工作，所有特定于开发板的更改都应在开发板特定的docker文件中完成。

## 必需的结构

每个开发板都有不同的构建要求，运行在不同的架构上等，但是所有开发板都需要一组特定的文件。

### Bake File .hcl

`board.hcl`文件允许社区开发板构建使用主构建作为缓存。这可以实现干净的基础和更快的构建时间。有关Bake文件中可用格式和选项的更多信息，[请参见官方Buildx Bake文档](https://docs.docker.com/build/bake/reference/)。

### 开发板Make文件

`board.mk`文件允许将自动化和可配置的Make目标包含在主Make文件中。以下是此文件的一般格式：

```Makefile
BOARDS += board # 将`board`替换为开发板后缀，例如：rpi

local-rpi: version
	docker buildx bake --load --file=docker/board/board.hcl --set board.tags=frigate:latest-board bake-target # 将`board`替换为开发板后缀，例如：rpi。Bake目标是board.hcl文件中的目标，例如：board

build-rpi: version
	docker buildx bake --file=docker/board/board.hcl --set board.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-board bake-target # 将`board`替换为开发板后缀，例如：rpi。Bake目标是board.hcl文件中的目标，例如：board

push-rpi: build-rpi
	docker buildx bake --push --file=docker/board/board.hcl --set board.tags=$(IMAGE_REPO):${GITHUB_REF_NAME}-$(COMMIT_HASH)-board bake-target # 将`board`替换为开发板后缀，例如：rpi。Bake目标是board.hcl文件中的目标，例如：board
```

### Dockerfile

`Dockerfile`用于编排构建，这将根据开发板的不同而有很大差异，但某些部分是必需的。以下是Dockerfile的必需部分：

```Dockerfile
# syntax=docker/dockerfile:1.4

# https://askubuntu.com/questions/972516/debian-frontend-environment-variable
ARG DEBIAN_FRONTEND=noninteractive

# 所有特定于开发板的工作都应以`deps`为基础
FROM deps AS board-deps

# 执行特定于开发板的操作

# 设置工作目录
WORKDIR /opt/frigate/

# 从主Frigate构建中复制基础文件
COPY --from=rootfs / /
```

## 其他必需的更改

### CI/CD

每个开发板的镜像将在每个Frigate发布时构建，这在`.github/workflows/ci.yml`文件中完成。需要在此处添加开发板构建工作流。

```yml
- name: Build and push board build
  uses: docker/bake-action@v3
  with:
    push: true
    targets: board # 这是board.hcl文件中的目标
    files: docker/board/board.hcl # 应该用实际的开发板类型更新
    # 标签也应该用实际的开发板类型更新
    # 社区开发板构建永远不应推送到缓存，但可以从缓存中拉取
    set: |
      board.tags=ghcr.io/${{ steps.lowercaseRepo.outputs.lowercase }}:${{ github.ref_name }}-${{ env.SHORT_SHA }}-board
      *.cache-from=type=gha
```

### 代码所有者文件

应更新`CODEOWNERS`文件以包含`docker/board`以及作为此开发板代码所有者的每个用户的`@user`。

## 文档

至少应更新`installation`、`object_detectors`、`hardware_acceleration`和`ffmpeg-presets`文档（如适用）以反映此社区开发板的配置。