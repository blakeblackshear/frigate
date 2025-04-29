---
id: objects
title: 支持检测的对象类型
---

import labels from "../../../../../../labelmap.txt";

Frigate 默认支持检测以下来自 Google Coral 测试数据的对象类型：

请注意：
- `car`（汽车）被列出两次，因为默认配置已将`truck`（卡车）重命名为`car`。这两类对象经常被混淆检测。
- 默认情况下，只有`person`（人员）会被追踪。如需扩展追踪对象列表，请参考[完整配置参考](reference.md)中的示例。

<ul>
  {labels.split("\n").map((label) => (
    <li>{label.replace(/^\d+\s+/, "")}</li>
  ))}
</ul>

## 自定义模型

镜像中已包含适用于 CPU 和 EdgeTPU（Coral）的默认模型。您可以通过挂载以下文件来使用自定义模型：

- CPU 模型：`/cpu_model.tflite`
- EdgeTPU 模型：`/edgetpu_model.tflite`
- 标签文件：`/labelmap.txt`

如果自定义模型与默认配置不同，您还需要更新[模型配置](advanced.md#model)。