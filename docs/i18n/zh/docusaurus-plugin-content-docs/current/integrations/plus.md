---
id: plus
title: Frigate+
---

关于如何使用Frigate+来改进你的模型的更多信息，请参见[Frigate+文档](/plus/)。

## 设置

### 创建账户

可以在[https://plus.frigate.video](https://plus.frigate.video)创建免费账户。

### 生成API密钥

登录后，你可以在设置中为Frigate生成API密钥。

![API密钥](/img/plus-api-key-min.png)

### 设置API密钥

在Frigate中，你可以使用名为`PLUS_API_KEY`的环境变量或docker密钥来启用浏览页面上的`Frigate+`按钮。Home Assistant插件用户可以在设置 > 插件 > Frigate > 配置 > 选项下设置（确保切换"显示未使用的可选配置选项"开关）。

:::warning

你不能使用Frigate配置文件中的`environment_vars`部分来设置此环境变量。它必须在docker配置或Home Assistant插件配置中定义为环境变量。

:::

## 提交示例

一旦配置了API密钥，你就可以直接从Frigate的浏览页面提交示例。从更多筛选菜单中，选择"Has a Snapshot - Yes"和"Submitted to Frigate+ - No"，然后点击窗格底部的应用。然后，点击缩略图并选择快照标签。

你可以使用键盘的左右箭头键快速浏览跟踪对象的快照。

:::note

必须启用快照功能才能向Frigate+提交示例

:::

![提交到Plus](/img/plus/submit-to-plus.jpg)

### 标注和验证

你可以在[https://plus.frigate.video](https://plus.frigate.video)查看所有已提交的图像。点击图像可以添加标注。有关标注的更详细信息，请参见[改进你的模型](../plus/improving_model.md)文档。

![标注](/img/annotate.png)

## 使用模型

一旦你[请求了第一个模型](../plus/first_model.md)并获得了自己的模型ID，就可以使用特殊的模型路径。Frigate+模型不需要配置其他信息，因为它会自动从Frigate+获取剩余的配置。

你可以在Frigate UI的设置页面的Frigate+面板中选择新模型，或在配置中手动设置根级别的模型：

```yaml
model:
  path: plus://<your_model_id>
```

:::note

模型ID不是秘密值，可以自由共享。对模型的访问由你的API密钥保护。

:::

模型会下载到`/config/model_cache`文件夹中，并且只在需要时才下载。

如果需要，你可以覆盖Frigate+模型的标签映射。不建议这样做，因为如果标签在Frigate+中不可用，重命名标签会导致提交到Frigate+的功能失效。

```yaml
model:
  path: plus://<your_model_id>
  labelmap:
    3: animal
    4: animal
    5: animal
```