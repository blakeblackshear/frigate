---
id: first_model
title: 请求你的第一个模型
---

## 步骤1：上传并标注你的图片

在请求你的第一个模型之前，你需要向Frigate+上传并验证至少10张图片。上传、标注和验证的图片越多，结果就会越好。大多数用户在每个摄像头至少有100张已验证的图片后就开始看到非常好的结果。请记住要包含各种不同的条件。你需要在阴天、晴天、黎明、黄昏和夜间的图片。有关如何直接从Frigate轻松提交图片到Frigate+的说明，请参阅[集成文档](/integrations/plus.md#generate-an-api-key)。

建议同时提交**正确检测样本**和**误报样本**。这将帮助模型区分什么是正确的检测，什么是错误的检测。你应该在所有图片中争取达到80%的正确检测样本和20%的误报样本的目标。如果你在特定区域遇到误报，在相似光照条件下提交该区域附近任何对象类型的正确检测样本将有助于教会模型在没有对象存在时该区域的样子。

有关更详细的建议，你可以参考[改进你的模型](./improving_model.md)的文档。

## 步骤2：提交模型请求

一旦你有了初始的已验证图片集，你就可以在模型页面上请求一个模型。关于选择模型类型的指导，请参考[文档的这一部分](./index.md#available-model-types)。每个模型请求需要使用年度订阅中包含的12次训练中的1次。这个模型将支持所有[可用的标签类型](./index.md#available-label-types)，即使你没有为这些标签提交任何示例。模型创建可能需要长达36小时。
![Plus模型页面](/img/plus/plus-models.jpg)

## 步骤3：在配置中设置你的模型ID

当你的Frigate+模型准备就绪时，你将收到电子邮件通知。
![模型就绪邮件](/img/plus/model-ready-email.jpg)

Frigate+中可用的模型可以使用特殊的模型路径。不需要配置其他信息，因为它会自动从Frigate+获取剩余的配置。

```yaml
model:
  path: plus://<your_model_id>
```

:::note

模型ID不是秘密值，可以自由共享。对你的模型的访问由你的API密钥保护。

:::

## 步骤4：调整你的对象过滤器以获得更高的分数

Frigate+模型通常比Frigate提供的默认模型有更高的分数。你可能需要增加你的`threshold`和`min_score`值。以下是如何优化这些值的示例，但你应该预期这些值会随着模型的改进而演变。有关`threshold`和`min_score`如何相关的更多信息，请参见[对象过滤器](../configuration/object_filters.md#object-scores)文档。

```yaml
objects:
  filters:
    dog:
      min_score: .7
      threshold: .9
    cat:
      min_score: .65
      threshold: .8
    face:
      min_score: .7
    package:
      min_score: .65
      threshold: .9
    license_plate:
      min_score: .6
    amazon:
      min_score: .75
    ups:
      min_score: .75
    fedex:
      min_score: .75
    person:
      min_score: .65
      threshold: .85
    car:
      min_score: .65
      threshold: .85
```