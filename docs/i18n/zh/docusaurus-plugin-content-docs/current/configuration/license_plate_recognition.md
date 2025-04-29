---
id: license_plate_recognition
title: 车牌识别(LPR)
---

:::warning

车牌识别功能目前对中国大陆的车牌识别的支持并不完善，我们会在后面优化该功能。目前将不会对该文档进行精翻；本文使用DeepSeek AI进行翻译，仅做参考。

:::

Frigate能够识别车辆上的车牌，并自动将检测到的字符添加到`recognized_license_plate`字段，或将已知名称作为`sub_label`添加到`car`类型的跟踪对象中。常见用例包括识别驶入车道的车辆或街道上经过车辆的车牌。

当车牌清晰可见时，LPR效果最佳。对于移动车辆，Frigate会持续优化识别过程，保留置信度最高的结果。但LPR不会对静止车辆运行。

当识别到车牌时，识别结果会：
- 作为`sub_label`(已知车牌)或`recognized_license_plate`字段(未知车牌)添加到跟踪对象
- 在核查的 核查项细节 面板中可见(sub labels)
- 在浏览的 探测对象细节 面板中可见(sub labels和recognized_license_plate)
- 可通过浏览中的 更多筛选项 菜单进行过滤
- 通过MQTT主题`frigate/events`发布，作为`car`跟踪对象的`sub_label`(已知)或`recognized_license_plate`(未知)

## 模型要求

使用Frigate+模型(或任何原生支持车牌检测的自定义模型)的用户应确保在[跟踪对象列表](https://docs.frigate.video/plus/#available-label-types)中添加`license_plate`标签，可以是全局设置或针对特定摄像头。这将提高LPR模型的准确性和性能。

没有车牌检测模型的用户仍可运行LPR。Frigate使用轻量级YOLOv9车牌检测模型，可配置在CPU或GPU上运行。这种情况下，您不应在跟踪对象列表中定义`license_plate`。

:::note

在默认模式下，Frigate的LPR需要先检测到`car`才能识别车牌。如果您使用专用LPR摄像头且视图放大到无法检测`car`的程度，仍可运行LPR，但配置参数与默认模式不同。详见下文[专用LPR摄像头](#专用lpr摄像头)部分。

:::

## 最低系统要求

车牌识别通过在系统本地运行AI模型实现。这些模型相对轻量，可根据配置在CPU或GPU上运行。至少需要4GB内存。

## 配置

车牌识别默认禁用。在配置文件中启用：

```yaml
lpr:
  enabled: True
```

与其他Frigate增强功能一样，LPR必须全局启用。如果不想在某些摄像头上运行LPR，可在摄像头级别禁用：

```yaml
cameras:
  garage:
    ...
    lpr:
      enabled: False
```

对于非专用LPR摄像头，请确保摄像头配置为检测`car`类型对象，且Frigate确实检测到了车辆。否则LPR不会运行。

与其他实时处理器一样，车牌识别运行在配置中`detect`角色定义的摄像头流上。为确保最佳性能，请在摄像头固件中选择适合您场景和需求的分辨率。

## 高级配置

在配置的全局层级使用这些可选参数微调LPR功能。唯一应在摄像头级别设置的可选参数是`enabled`、`min_area`和`enhancement`。

### 检测

- **`detection_threshold`**: 运行识别前所需的车牌检测置信度分数
  - 默认: `0.7`
  - 注意: 此字段仅适用于独立车牌检测模型，对于内置车牌检测的模型(如Frigate+)应使用`threshold`和`min_score`对象过滤器
- **`min_area`**: 定义运行识别前车牌的最小面积(像素单位)
  - 默认: `1000`像素。注意：这是面积测量(长×宽)，1000像素代表图像中约32×32像素的正方形
  - 根据摄像头`detect`流的分辨率，可增加此值以忽略过小或过远的车牌
- **`device`**: 运行车牌识别模型的设备
  - 默认: `CPU`
  - 可选`CPU`或`GPU`。对于没有原生车牌检测模型的用户，使用GPU可能提高模型性能，特别是YOLOv9车牌检测器模型
- **`model_size`**: 用于检测车牌上文字的模型大小
  - 默认: `small`
  - 可选`small`或`large`。`large`模型使用增强的文本检测器，能更准确地找到车牌上的文字但比`small`模型慢。对大多数用户推荐small模型。对于车牌有多行文字的国家，推荐large模型。注意：使用large模型不会改进文字识别，但可能改进文字检测

### 识别

- **`recognition_threshold`**: 将车牌作为`recognized_license_plate`和/或`sub_label`添加到对象所需的识别置信度分数
  - 默认: `0.9`
- **`min_plate_length`**: 指定检测到的车牌必须具有的最小字符数才能作为`recognized_license_plate`和/或`sub_label`添加到对象
  - 用于过滤短、不完整或不正确的检测
- **`format`**: 定义预期车牌格式的正则表达式。不匹配此格式的车牌将被丢弃
  - `"^[A-Z]{1,3} [A-Z]{1,2} [0-9]{1,4}$"`匹配如"B AB 1234"或"M X 7"的车牌
  - `"^[A-Z]{2}[0-9]{2} [A-Z]{3}$"`匹配如"AB12 XYZ"或"XY68 ABC"的车牌
  - 可使用https://regex101.com/等网站测试正则表达式

### 匹配

- **`known_plates`**: 字符串或正则表达式列表，当识别到的车牌匹配已知值时，为`car`对象分配自定义`sub_label`
  - 这些标签会显示在UI、过滤器和通知中
  - 未知车牌仍会保存，但添加到`recognized_license_plate`字段而非`sub_label`
- **`match_distance`**: 允许在匹配检测到的车牌与已知车牌时有微小变化(缺失/错误字符)
  - 例如设置`match_distance: 1`允许车牌`ABCDE`匹配`ABCBE`或`ABCD`
  - 此参数不适用于定义为正则表达式的已知车牌。要使用`match_distance`，应在`known_plates`中定义车牌的完整字符串

### 图像增强

- **`enhancement`**: 0到10之间的值，调整在识别前对捕获车牌应用的图像增强级别。此预处理步骤有时可提高准确性但也可能适得其反
  - 默认: `0`(无增强)
  - 较高值会增加对比度、锐化细节并减少噪点，但过度增强会使字符模糊或失真，实际上使Frigate更难识别
  - 如果在多个摄像头上运行LPR，最好在摄像头级别调整此设置
  - 如果Frigate已能正确识别车牌，保持此设置为默认值`0`。但如果经常遇到字符问题或不完整车牌，而您自己已能轻松阅读车牌，可尝试从5开始逐步增加此值。您应观察不同增强级别对车牌的影响。使用`debug_save_plates`配置选项(见下文)

### 调试

- **`debug_save_plates`**: 设为`True`保存检测到的车牌文字图像用于调试。这些图像存储在`/media/frigate/clips/lpr`，按`<摄像头>/<事件ID>`分子目录，基于捕获时间戳命名
  - 这些保存的图像不是完整车牌而是检测到的文字区域。文字检测模型有时会在车牌上找到多个文字区域是正常的。用它们分析Frigate识别了什么文字以及图像增强如何影响检测
  - 注意: Frigate不会自动删除这些调试图像。一旦LPR正常运行，应禁用此选项并手动删除保存的文件以释放存储空间

## 配置示例

这些配置参数可在配置的全局层级使用。唯一应在摄像头级别设置的可选参数是`enabled`、`min_area`和`enhancement`。

```yaml
lpr:
  enabled: True
  min_area: 1500 # 忽略面积小于1500像素的车牌
  min_plate_length: 4 # 仅识别4个或更多字符的车牌
  known_plates:
    Wife's Car:
      - "ABC-1234"
      - "ABC-I234" # 考虑数字1(1)和大写字母I可能混淆的情况
    Johnny:
      - "J*N-*234" # 匹配JHN-1234和JMN-I234，注意"*"匹配任意数量字符
    Sally:
      - "[S5]LL 1234" # 匹配SLL 1234和5LL 1234
    Work Trucks:
      - "EMP-[0-9]{3}[A-Z]" # 匹配如EMP-123A, EMP-456Z的车牌
```

```yaml
lpr:
  enabled: True
  min_area: 4000 # 仅对较大车牌运行识别(4000像素代表图像中约63×63像素的正方形)
  recognition_threshold: 0.85
  format: "^[A-Z]{2} [A-Z][0-9]{4}$" # 仅识别两个字母后跟空格、单个字母和4个数字的车牌
  match_distance: 1 # 允许车牌匹配中一个字符的变化
  known_plates:
    Delivery Van:
      - "RJ K5678"
      - "UP A1234"
    Supervisor:
      - "MN D3163"
```

:::note

如果想在摄像头上检测车辆但不想消耗资源在这些车辆上运行LPR，应禁用这些特定摄像头的LPR。

```yaml
cameras:
  side_yard:
    lpr:
      enabled: False
    ...
```

:::

## 专用LPR摄像头

专用LPR摄像头是具有强大光学变焦的单用途摄像头，用于捕捉远处车辆的车牌，通常具有精细调校的设置以在夜间捕捉车牌。

要将摄像头标记为专用LPR摄像头，在摄像头配置中添加`type: "lpr"`。

用户可根据是否使用Frigate+(或原生`license_plate`检测)模型以两种不同方式配置Frigate的专用LPR模式：

### 使用Frigate+(或原生`license_plate`检测)模型

使用Frigate+模型(或任何能原生检测`license_plate`的模型)的用户可利用`license_plate`检测功能。这使得车牌在专用LPR模式下被视为标准对象，意味着警报、检测、快照、区域和其他Frigate功能正常工作，车牌通过配置的对象检测器高效检测。

使用`license_plate`检测模型的专用LPR摄像头配置示例：

```yaml
# LPR全局配置
lpr:
  enabled: True
  device: CPU # 也可用GPU(如果可用)

# 专用LPR摄像头配置
cameras:
  dedicated_lpr_camera:
    type: "lpr" # 必需以使用专用LPR摄像头模式
    ffmpeg: ... # 添加您的流
    detect:
      enabled: True
      fps: 5 # 如果车辆快速移动可增至10。高于15不必要也不推荐
      min_initialized: 2
      width: 1920
      height: 1080
    objects:
      track:
        - license_plate
      filters:
        license_plate:
          threshold: 0.7
    motion:
      threshold: 30
      contour_area: 60 # 使用增大值过滤小的运动变化
      improve_contrast: false
      mask: 0.704,0.007,0.709,0.052,0.989,0.055,0.993,0.001 # 确保摄像头时间戳被遮罩
    record:
      enabled: True # 如果只想要快照可禁用录制
    snapshots:
      enabled: True
    review:
      detections:
        labels:
          - license_plate
```

此设置下：
- 车牌被视为Frigate中的正常对象
- 分数、警报、检测、快照、区域和对象遮罩按预期工作
- 快照上会有车牌边界框
- MQTT主题`frigate/events`会发布跟踪对象更新
- 调试视图会显示`license_plate`边界框
- 如果使用Frigate+模型并想提交专用LPR摄像头图像用于模型训练和微调，在Frigate+网站上标注快照中的`car`和`license_plate`，即使车辆几乎不可见

### 使用次级LPR管道(无Frigate+)

如果没有使用Frigate+模型，可使用Frigate内置的次级专用LPR管道。在此模式下，Frigate绕过标准对象检测管道，在检测到运动时对全帧运行本地车牌检测器模型。

使用次级管道的专用LPR摄像头配置示例：

```yaml
# LPR全局配置
lpr:
  enabled: True
  device: CPU # 也可用GPU(如果可用)
  detection_threshold: 0.7 # 必要时更改

# 专用LPR摄像头配置
cameras:
  dedicated_lpr_camera:
    type: "lpr" # 必需以使用专用LPR摄像头模式
    lpr:
      enabled: True
      enhancement: 3 # 可选，在尝试识别字符前增强图像
    ffmpeg: ... # 添加您的流
    detect:
      enabled: False # 禁用Frigate标准对象检测管道
      fps: 5 # 必要时增加，但高值可能减慢Frigate增强管道并使用大量CPU
      width: 1920
      height: 1080
    objects:
      track: [] # 无Frigate+模型的专用LPR模式必需
    motion:
      threshold: 30
      contour_area: 60 # 使用增大值过滤小的运动变化
      improve_contrast: false
      mask: 0.704,0.007,0.709,0.052,0.989,0.055,0.993,0.001 # 确保摄像头时间戳被遮罩
    record:
      enabled: True # 如果只想要快照可禁用录制
    review:
      detections:
        enabled: True
        retain:
          default: 7
```

此设置下：
- 绕过标准对象检测管道。专用LPR摄像头上检测到的任何车牌在Frigate中类似于手动事件处理。您必须不指定`license_plate`作为跟踪对象
- 检测到运动时，车牌检测器在全帧上运行，并根据检测`fps`设置处理帧
- Review项目始终分类为`detection`
- 始终保存快照
- 不使用区域和对象遮罩
- MQTT主题`frigate/events`不会发布带车牌边界框和分数的跟踪对象更新，但如果启用录制，`frigate/reviews`会发布。如果识别为已知车牌，会发布带更新`sub_label`字段的消息；如果识别出字符，会发布带更新`recognized_license_plate`字段的消息
- 车牌快照在得分最高时刻保存并出现在Explore中
- 调试视图不显示`license_plate`边界框

### 总结

| 功能                 | 原生`license_plate`检测模型(如Frigate+) | 次级管道(无原生模型或Frigate+)           |
|----------------------|----------------------------------------|------------------------------------------|
| 车牌检测             | 使用`license_plate`作为跟踪对象        | 运行专用LPR管道                          |
| FPS设置              | 5(快速移动车辆可增加)                  | 5(快速移动车辆可增加，但可能使用更多CPU) |
| 对象检测             | 应用标准Frigate+检测                  | 绕过标准对象检测                         |
| 区域和对象遮罩       | 支持                                   | 不支持                                   |
| 调试视图             | 可能显示`license_plate`边界框         | 可能不显示`license_plate`边界框          |
| MQTT `frigate/events` | 发布跟踪对象更新                       | 发布有限更新                             |
| Explore              | 识别的车牌在More Filters中可用        | 识别的车牌在More Filters中可用           |

通过选择适当的配置，用户可根据是否使用Frigate+模型或次级LPR管道优化专用LPR摄像头。

### 使用专用LPR摄像头模式的最佳实践

- 调整运动检测并增加`contour_area`，直到只有车辆通过时创建较大的运动框(对于1920×1080检测流可能在50-90之间)。增加`contour_area`过滤小的运动区域，防止在没有车辆通过的帧中寻找车牌浪费资源
- 禁用`improve_contrast`运动设置，特别是在夜间运行LPR且画面大部分黑暗时。这将防止小像素变化和小的运动区域触发车牌检测
- 确保用运动遮罩覆盖摄像头时间戳，防止其被误检测为车牌
- 对于非Frigate+用户，可能需要更改摄像头设置以获得更清晰的图像，或如果夜间车牌识别不准确，降低全局`recognition_threshold`配置
- 次级管道模式在CPU或GPU(取决于`device`配置)上运行本地AI模型检测车牌。增加检测`fps`将按比例增加资源使用

## 常见问题

### 为什么我的车牌没有被检测和识别？

确保：
- 摄像头有清晰、人眼可读、光照良好的车牌视图。如果您自己都看不清车牌字符，Frigate肯定也做不到，即使模型识别到了`license_plate`。根据场景和车辆速度，可能需要更改视频大小、质量或帧率设置
- 车牌在图像中足够大(尝试调整`min_area`)或增加摄像头流的分辨率
- 您的`enhancement`级别(如果已从默认值`0`更改)不过高。过度增强会进行过多降噪，导致车牌字符模糊难读

如果使用Frigate+模型或自定义车牌检测模型，确保在跟踪对象列表