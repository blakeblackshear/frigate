---
id: contributing
title: 向主代码库贡献代码
---

## 获取源代码

### 核心、Web界面、Docker和文档

这个仓库包含了主要的Frigate应用程序及其所有依赖项。

将[blakeblackshear/frigate](https://github.com/blakeblackshear/frigate.git)复制(fork)到你自己的GitHub账户，然后将复制的仓库克隆到你的本地机器。

从这里，按照以下指南进行操作：

- [核心](#核心)
- [Web界面](#web界面)
- [文档](#文档)

### Frigate Home Assistant插件

这个仓库包含了Home Assistant插件，用于Home Assistant OS和兼容的安装。它允许你通过Home Assistant的Supervisor标签页运行Frigate。

将[blakeblackshear/frigate-hass-addons](https://github.com/blakeblackshear/frigate-hass-addons)复制到你自己的GitHub账户，然后将复制的仓库克隆到你的本地机器。

### Frigate Home Assistant集成

这个仓库包含了自定义集成，可以让你的Home Assistant安装自动为Frigate实例创建实体，无论你是将Frigate作为独立的Docker容器运行还是作为[Home Assistant插件](#frigate-home-assistant插件)运行。

将[blakeblackshear/frigate-hass-integration](https://github.com/blakeblackshear/frigate-hass-integration)复制到你自己的GitHub账户，然后将复制的仓库克隆到你的本地机器。

## 核心

### 前提条件

- GNU make
- Docker (包括buildx插件)
- 额外的检测器(Coral、OpenVINO等)是可选的，但建议用于模拟真实世界的性能。

:::note

一个Coral设备一次只能被一个进程使用，因此如果将Coral用于开发目的，建议使用额外的Coral设备。

:::

### 设置

#### 1. 使用Visual Studio Code打开仓库

打开后，你应该会收到在远程容器中打开项目的提示。这将在基础Frigate容器之上构建一个安装了所有开发依赖项的容器。这确保了每个人都使用一致的开发环境，而无需在主机上安装任何依赖项。

#### 2. 修改本地配置文件以进行测试

将文件放在仓库根目录的`config/config.yml`中。

这里是一个示例，但请根据你的需求修改：

```yaml
mqtt:
  host: mqtt

cameras:
  test:
    ffmpeg:
      inputs:
        - path: /media/frigate/car-stopping.mp4
          input_args: -re -stream_loop -1 -fflags +genpts
          roles:
            - detect
```

这些输入参数告诉ffmpeg以无限循环方式读取mp4文件。你可以在这里使用任何有效的ffmpeg输入。

#### 3. 收集一些mp4文件用于测试

在仓库根目录创建一个`debug`文件夹并放入这些文件。如果你启用了录制功能，录制的文件也会保存在这里。更新上面步骤2中的配置以指向正确的文件。你可以查看仓库中的`docker-compose.yml`文件来了解卷的映射方式。

#### 4. 从命令行运行Frigate

VS Code会为你启动Docker Compose文件并打开一个连接到`frigate-dev`的终端窗口。

- 根据你的开发硬件，你可能需要修改项目根目录中的`docker-compose.yml`以传递USB Coral或GPU进行硬件加速。
- 运行`python3 -m frigate`启动后端。
- 在VS Code的另一个终端窗口中，切换到`web`目录并运行`npm install && npm run dev`启动前端。

#### 5. 清理

关闭VS Code后，可能仍有容器在运行。要关闭所有内容，只需运行`docker-compose down -v`来清理所有容器。

### 测试

#### FFMPEG硬件加速

以下命令在容器内部使用，以确保硬件加速正常工作。

**树莓派(64位)**

这应该在top中显示低于50%的CPU使用率，不使用`-c:v h264_v4l2m2m`时约为80%的CPU使用率。

```shell
ffmpeg -c:v h264_v4l2m2m -re -stream_loop -1 -i https://streams.videolan.org/ffmpeg/incoming/720p60.mp4 -f rawvideo -pix_fmt yuv420p pipe: > /dev/null
```

**NVIDIA GPU**

```shell
ffmpeg -c:v h264_cuvid -re -stream_loop -1 -i https://streams.videolan.org/ffmpeg/incoming/720p60.mp4 -f rawvideo -pix_fmt yuv420p pipe: > /dev/null
```

**NVIDIA Jetson**

```shell
ffmpeg -c:v h264_nvmpi -re -stream_loop -1 -i https://streams.videolan.org/ffmpeg/incoming/720p60.mp4 -f rawvideo -pix_fmt yuv420p pipe: > /dev/null
```

**VAAPI**

```shell
ffmpeg -hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format yuv420p -re -stream_loop -1 -i https://streams.videolan.org/ffmpeg/incoming/720p60.mp4 -f rawvideo -pix_fmt yuv420p pipe: > /dev/null
```

**QSV**

```shell
ffmpeg -c:v h264_qsv -re -stream_loop -1 -i https://streams.videolan.org/ffmpeg/incoming/720p60.mp4 -f rawvideo -pix_fmt yuv420p pipe: > /dev/null
```

## Web界面

### 前提条件

- 所有[核心](#core)前提条件 _或_ 另一个本地可用的运行中的Frigate实例
- Node.js 20

### 进行更改

#### 1. 设置Frigate实例

Web UI需要一个Frigate实例来交互以获取所有数据。你可以在本地运行一个实例(推荐)或连接到网络上可访问的独立实例。

要运行本地实例，请按照[核心](#core)开发说明进行操作。

如果你不会对Frigate HTTP API进行任何更改，可以将web开发服务器连接到网络上的任何Frigate实例。跳过这一步，直接转到[3a](#3a-针对非本地实例运行开发服务器)。

#### 2. 安装依赖项

```console
cd web && npm install
```

#### 3. 运行开发服务器

```console
cd web && npm run dev
```

##### 3a. 针对非本地实例运行开发服务器

要针对非本地实例运行开发服务器，你需要将`vite.config.ts`中的`localhost`值替换为非本地后端服务器的IP地址。

#### 4. 进行更改

Web UI使用[Vite](https://vitejs.dev/)、[Preact](https://preactjs.com)和[Tailwind CSS](https://tailwindcss.com)构建。

轻量级指南和建议：

- 避免添加更多依赖项。web UI旨在轻量化和快速加载。
- 不要进行大规模的改动。对于任何大型或架构性的想法，请[在GitHub上开启讨论](https://github.com/blakeblackshear/frigate/discussions/new)。
- 确保`lint`通过。此命令将确保基本符合样式规范，应用尽可能多的自动修复，包括Prettier格式化。

```console
npm run lint
```

- 添加单元测试并确保它们通过。尽可能地，你应该在进行更改时努力_增加_测试覆盖率。这将有助于确保功能在未来不会意外损坏。
- 如果在运行测试时遇到"TypeError: Cannot read properties of undefined (reading 'context')"之类的错误消息，这可能是由于vitest中的这些问题(https://github.com/vitest-dev/vitest/issues/1910, https://github.com/vitest-dev/vitest/issues/1652)，但我还没能解决它们。

```console
npm run test
```

- 在不同浏览器中测试。Firefox、Chrome和Safari都有使它们成为独特目标的不同特性。

## 文档

### 前提条件

- Node.js 20

### 进行更改

#### 1. 安装

```console
cd docs && npm install
```

#### 2. 本地开发

```console
npm run start
```

此命令启动本地开发服务器并打开浏览器窗口。大多数更改无需重启服务器即可实时反映。

文档使用[Docusaurus v3](https://docusaurus.io)构建。请参阅Docusaurus文档以获取有关如何修改Frigate文档的更多信息。

#### 3. 构建(可选)

```console
npm run build
```

此命令将静态内容生成到`build`目录中，可以使用任何静态内容托管服务来提供服务。

## 官方构建

设置buildx进行多架构构建

```
docker buildx stop builder && docker buildx rm builder # <---- 如果已存在
docker run --privileged --rm tonistiigi/binfmt --install all
docker buildx create --name builder --driver docker-container --driver-opt network=host --use
docker buildx inspect builder --bootstrap
make push
```

## 其他

### Nginx

当从开发容器内测试nginx配置更改时，可以使用以下命令复制并重新加载配置进行测试，而无需重新构建容器：

```console
sudo cp docker/main/rootfs/usr/local/nginx/conf/* /usr/local/nginx/conf/ && sudo /usr/local/nginx/sbin/nginx -s reload
```

## 贡献Web UI的翻译

Frigate使用[Weblate](https://weblate.org)来管理Web UI的翻译。要贡献翻译，请在Weblate注册一个账户并导航到Frigate NVR项目：

https://hosted.weblate.org/projects/frigate-nvr/

在翻译时，保持现有的键结构，只翻译值。确保你的翻译保持适当的格式，包括任何占位符变量(如`{{example}}`)。