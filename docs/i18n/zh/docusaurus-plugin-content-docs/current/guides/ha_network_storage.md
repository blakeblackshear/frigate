---
id: ha_network_storage
title: Home Assistant 网络存储
---

从Home Assistant 2023.6版本开始，插件已支持网络挂载存储。

## 为Frigate设置远程存储

### 前提条件

- 已安装Home Assistant 2023.6或更新版本
- 运行Home Assistant操作系统10.2或更新版本，或者运行Supervised模式并安装了最新的os-agent（这是supervised安装所必需的）

### 初始设置

1. 停止Frigate插件

### 移动当前数据

保留当前数据是可选的，但无论如何都需要移动数据才能成功创建共享。

#### 如果你想保留当前数据

1. 将frigate.db、frigate.db-shm、frigate.db-wal文件移动到/config目录
2. 将/media/frigate文件夹重命名为/media/frigate_tmp

#### 如果你不想保留当前数据

1. 删除/media/frigate文件夹及其所有内容

### 创建媒体共享

1. 进入**设置 -> 系统 -> 存储 -> 添加网络存储**
2. 将共享命名为`frigate`（这是必需的）
3. 选择类型为`media`
4. 填写你的特定NAS所需的其他信息
5. 连接
6. 如果在之前的步骤中保留了文件，将文件从`/media/frigate_tmp`移动到`/media/frigate`
7. 启动Frigate插件