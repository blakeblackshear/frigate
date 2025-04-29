---
id: bird_classification
title: 鸟类识别功能
---

鸟类识别功能使用量化Tensorflow模型识别已知鸟类品种。当识别到已知鸟类时，其通用名称将作为`sub_label`(子标签)添加。该信息会显示在用户界面、过滤器以及通知中。

## 最低系统要求

鸟类识别在CPU上运行轻量级tflite模型，系统要求与运行Frigate本身无显著差异。

## 识别模型

使用的分类模型是MobileNet INat鸟类识别模型，[可识别物种列表见此](https://raw.githubusercontent.com/google-coral/test_data/master/inat_bird_labels.txt)。

## 基础配置

鸟类识别功能默认禁用，需在配置文件中启用。此为全局配置选项。

```yaml
classification:
  bird:
    enabled: true  # 启用鸟类识别
```

## 高级配置选项

可通过以下参数微调识别精度：

- `threshold`: 设定鸟类子标签所需的最低置信度分数
  - 默认值: `0.9`
  - 建议范围: 0.8-0.95（值越高误报越少，但可能漏识部分品种）

- `top_k`: 每次检测返回的最可能物种数量
  - 默认值: `3`
  - 较高值可增加识别多样性，但会降低运行效率

- `cache`: 启用识别结果缓存（减少重复计算）
  - 默认值: `true`
  - 建议在设备性能有限时保持启用

完整配置示例：
```yaml
classification:
  bird:
    enabled: true
    threshold: 0.85
    top_k: 5
    cache: false
```

## 使用建议

1. 庭院观鸟场景建议阈值设为0.8-0.85
2. 科研监测场景可提高top_k至5-10
3. 树莓派等设备建议启用cache
4. 识别结果可通过MQTT/webhook转发

## 性能优化

若识别延迟过高：
1. 降低top_k值
2. 确保未启用debug日志
3. 检查CPU温度是否过高
4. 考虑使用更高效硬件

:::tip
常见问题：
- 识别为"unknown_bird"表示置信度低于阈值
- 品种名称显示为拉丁学名属正常现象
- 夜间拍摄可能无法触发识别
:::