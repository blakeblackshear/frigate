---
id: index
title: 模型
---

<a href="https://frigate.video/plus" target="_blank" rel="nofollow">Frigate+</a> 提供基于Frigate+用户从安防摄像头提交的图像训练的模型，这些模型专门为Frigate分析视频的方式设计。这些模型能以更少资源提供更高准确性。您上传的图像用于微调一个基于所有Frigate+用户上传图像训练的基础模型，最终得到一个针对您特定环境优化的高精度模型。

:::info

订阅后基础模型不会直接可用。未来可能会改变，但目前您需要提交包含最低数量图像的模型请求。

:::

订阅包含每年12次模型训练。取消订阅后，您仍可保留已训练模型的使用权。提交模型请求或购买额外训练需要有效订阅。

集成Frigate+的方法请参阅[集成文档](/integrations/plus.md)。

## 可用模型类型

Frigate+提供两种模型类型：`mobiledet`和`yolonas`。两者都是目标检测模型，能检测[下方列出的相同标签](#可用标签类型)。

不是所有检测器都支持所有模型类型，请根据[支持的检测器类型](#支持的检测器类型)表格选择匹配您检测器的模型。

| 模型类型   | 描述                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| `mobiledet` | 基于与Frigate默认模型相同的架构。可在Google Coral设备和CPU上运行。                                    |
| `yolonas`   | 新架构，精度略高且对小目标检测有改进。支持Intel、NVIDIA GPU和AMD GPU。                                |

## 支持的检测器类型

目前Frigate+模型支持CPU(`cpu`)、Google Coral(`edgetpu`)、OpenVino(`openvino`)和ONNX(`onnx`)检测器。

:::warning

Frigate+模型与`onnx`检测器的配合使用仅限Frigate 0.15及以上版本。

:::

| 硬件                                                                                                                     | 推荐检测器类型 | 推荐模型类型 |
| ------------------------------------------------------------------------------------------------------------------------ | -------------- | ------------ |
| [CPU](/configuration/object_detectors.md#cpu检测器不推荐使用)                                                   | `cpu`          | `mobiledet`  |
| [Coral(所有形态)](/configuration/object_detectors.md#edge-tpu检测器)                                                  | `edgetpu`      | `mobiledet`  |
| [Intel](/configuration/object_detectors.md#openvino检测器)                                                             | `openvino`     | `yolonas`    |
| [NVIDIA GPU](https://deploy-preview-13787--frigate-docs.netlify.app/configuration/object_detectors#onnx)\*               | `onnx`         | `yolonas`    |
| [AMD ROCm GPU](https://deploy-preview-13787--frigate-docs.netlify.app/configuration/object_detectors#amdrocm-gpu检测器)\* | `onnx`         | `yolonas`    |

_\* 需要Frigate 0.15版本_

## 可用标签类型

Frigate+模型支持更适合安防摄像头的对象集。当前支持以下对象：

- **人物**：`person`、`face`
- **车辆**：`car`、`motorcycle`、`bicycle`、`boat`、`license_plate`
- **快递标识**：`amazon`、`usps`、`ups`、`fedex`、`dhl`、`an_post`、`purolator`、`postnl`、`nzpost`、`postnord`、`gls`、`dpd`
- **动物**：`dog`、`cat`、`deer`、`horse`、`bird`、`raccoon`、`fox`、`bear`、`cow`、`squirrel`、`goat`、`rabbit`
- **其他**：`package`、`waste_bin`、`bbq_grill`、`robot_lawnmower`、`umbrella`

Frigate默认模型中的其他对象类型暂不支持。未来版本将增加更多对象类型。

### 标签属性

使用Frigate+模型时，某些标签有特殊处理方式。`face`、`license_plate`及快递标识如`amazon`、`ups`和`fedex`被视为属性标签，不会像常规对象那样被追踪，也不会直接生成核查项。此外，`threshold`过滤器对这些标签无效，您需要根据需要调整`min_score`和其他过滤值。

要启用这些属性标签，需将其添加到追踪对象列表：

```yaml
objects:
  track:
    - person
    - face
    - license_plate
    - dog
    - cat
    - car
    - amazon
    - fedex
    - ups
    - package
```

使用Frigate+模型时，系统会为人物对象选择面部最清晰的快照，为车辆选择车牌最清晰的快照。这有助于面部识别和车牌识别等二次处理。

![面部属性示例](/img/plus/attribute-example-face.jpg)

快递标识如`amazon`、`ups`和`fedex`用于自动为车辆对象分配子标签。

![Fedex属性示例](/img/plus/attribute-example-fedex.jpg)