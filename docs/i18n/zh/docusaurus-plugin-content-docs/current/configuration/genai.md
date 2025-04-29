---
id: genai
title: 生成式AI
---

生成式AI可用于根据跟踪对象的缩略图自动生成描述性文本。这有助于Frigate中的[语义搜索](/configuration/semantic_search)，为跟踪对象提供更多上下文信息。描述可通过Frigate界面中的**浏览**页面访问，点击跟踪对象的缩略图即可查看。

描述请求会在跟踪对象生命周期结束时自动发送给您的AI提供商，也可以选择在帧发生显著变化后提前发送，例如用于更实时的通知场景。描述也可以通过Frigate界面手动重新生成。请注意，如果您在跟踪对象结束前手动输入描述，该描述将被生成的响应覆盖。

## 配置

生成式AI可以为所有摄像头启用，或仅为特定摄像头启用。目前有3种原生提供商可与Frigate集成。支持OpenAI标准API的其他提供商也可使用。请参阅下面的OpenAI部分。

要使用生成式AI，您必须在Frigate配置的全局层级定义一个提供商。如果您选择的提供商需要API密钥，可以直接将其粘贴在配置中，或存储在环境变量中(以`FRIGATE_`为前缀)。

```yaml
genai:
  enabled: True
  provider: gemini
  api_key: "{FRIGATE_GEMINI_API_KEY}"
  model: gemini-1.5-flash

cameras:
  front_camera: ...
  indoor_camera:
    genai: # <- 为室内摄像头禁用GenAI
      enabled: False
```

## Ollama

:::warning

不建议在CPU上使用Ollama，高推理时间会使生成式AI变得不实用。

:::

[Ollama](https://ollama.com/)允许您自托管大型语言模型并保持所有内容在本地运行。它在[llama.cpp](https://github.com/ggerganov/llama.cpp)上提供了一个很好的API。强烈建议在配备Nvidia显卡的机器或Apple silicon Mac上托管此服务器以获得最佳性能。

大多数7b参数的4位视觉模型都能在8GB显存中运行。也有可用的[Docker容器](https://hub.docker.com/r/ollama/ollama)。

并行请求也有一些注意事项。您需要设置`OLLAMA_NUM_PARALLEL=1`并选择适合您硬件和偏好的`OLLAMA_MAX_QUEUE`和`OLLAMA_MAX_LOADED_MODELS`值。请参阅[Ollama文档](https://github.com/ollama/ollama/blob/main/docs/faq.md#how-does-ollama-handle-concurrent-requests)。

### 支持的模型

您必须使用支持视觉的图生文模型。当前模型变体可在[其模型库](https://ollama.com/library)中找到。在撰写本文时，这包括`llava`、`llava-llama3`、`llava-phi3`和`moondream`。请注意，Frigate不会自动下载您在配置中指定的模型，您必须先将模型下载到您的Ollama本地实例，例如在Ollama服务器/Docker容器上运行`ollama pull llava:7b`。请注意，Frigate配置中指定的模型必须与下载的模型标签匹配。

:::note

您应至少有8GB可用RAM(或在GPU上运行时为显存)来运行7B模型，16GB运行13B模型，32GB运行33B模型。

:::

### 配置

```yaml
genai:
  enabled: True
  provider: ollama
  base_url: http://localhost:11434
  model: llava:7b
```

## Google Gemini

Google Gemini有一个免费层级，允许每分钟[15次查询](https://ai.google.dev/pricing)到API，这对于标准Frigate使用来说已经足够。

### 支持的模型

您必须使用支持视觉的图生文模型。当前模型变体可在[其文档](https://ai.google.dev/gemini-api/docs/models/gemini)中找到。在撰写本文时，这包括`gemini-1.5-pro`和`gemini-1.5-flash`。

### 获取API密钥

要开始使用Gemini，您必须首先从[Google AI Studio](https://aistudio.google.com)获取API密钥。

1. 接受服务条款
2. 从右侧导航栏点击"获取API密钥"
3. 点击"在新项目中创建API密钥"
4. 复制API密钥用于您的配置

### 配置

```yaml
genai:
  enabled: True
  provider: gemini
  api_key: "{FRIGATE_GEMINI_API_KEY}"
  model: gemini-1.5-flash
```

## OpenAI

OpenAI没有为其API提供免费层级。随着gpt-4o的发布，价格已经降低，如果您选择此路线，每次生成应该只需几分钱。

:::warning
请注意，如果您的摄像头位于公共领域（例如过道）等会检测过多对象的地方，过多的对象可能会很快耗尽您的资源包。请**务必不要开启**后付费模式！
:::

### 支持的模型

您必须使用支持视觉的图生文模型。当前模型变体可在[其文档](https://platform.openai.com/docs/models)中找到。在撰写本文时 `gpt-4o` 和 `gpt-4-turbo` 都支持图生文功能。

:::note

如果您选择国内兼容OpenAI API的大模型提供商，请注意选择支持**图生文**的模型。例如腾讯云的`hunyuan-vision`模型。DeepSeek官方目前未提供其图生文[`DeepSeek-VL2`](https://github.com/deepseek-ai/DeepSeek-VL2)模型的API，但可以在第三方服务商处获取由他们部署的版本。

:::

### 获取API密钥

要开始使用OpenAI，您必须首先[创建API密钥](https://platform.openai.com/api-keys)并[配置计费](https://platform.openai.com/settings/organization/billing/overview)。

### 配置

```yaml
genai:
  enabled: True
  provider: openai
  api_key: "{FRIGATE_OPENAI_API_KEY}"
  model: gpt-4o
```

:::note

要使用兼容OpenAI API的其他服务商（例如阿里云和腾讯云等国内云厂商），需要设置**环境变量** `OPENAI_BASE_URL` 为您的服务商的API endpoint。

例如腾讯云请设置为https://api.hunyuan.cloud.tencent.com/v1
:::

## Azure OpenAI

微软通过Azure OpenAI提供了几种视觉模型。需要订阅。

### 支持的模型

您必须使用支持视觉的图生文模型。当前模型变体可在[其文档](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models)中找到。在撰写本文时，这包括`gpt-4o`和`gpt-4-turbo`。

### 创建资源并获取API密钥

要开始使用Azure OpenAI，您必须首先[创建资源](https://learn.microsoft.com/azure/cognitive-services/openai/how-to/create-resource?pivots=web-portal#create-a-resource)。您需要您的API密钥和资源URL，其中必须包含`api-version`参数(参见下面的示例)。配置中不需要模型字段，因为模型是您部署资源时选择的部署名称的一部分。

### 配置

```yaml
genai:
  enabled: True
  provider: azure_openai
  base_url: https://example-endpoint.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2023-03-15-preview
  api_key: "{FRIGATE_OPENAI_API_KEY}"
```

## 使用方法和最佳实践

Frigate的缩略图搜索擅长识别跟踪对象的特定细节 - 例如，使用"图像标题"方法查找"穿黄色背心的人"、"在草坪上奔跑的白狗"或"住宅街道上的红色汽车"。为了进一步增强这一点，Frigate的默认提示设计为询问您的AI提供商有关对象行为背后的意图，而不仅仅是描述其外观。

虽然生成检测对象的简单描述很有用，但理解意图提供了更深层次的洞察。Frigate的默认提示不仅识别场景中的"什么"，还旨在推断"为什么"它可能在那里或"什么"它可能会做下一步。描述告诉您发生了什么，但意图提供了上下文。例如，一个人走向门可能看起来像访客，但如果他们在下班后快速移动，您可以推断潜在的闯入企图。检测到一个人在夜间在门附近徘徊可以比简单地注意到"一个人站在门旁"更快触发警报，帮助您根据情况上下文做出响应。

### 使用生成式AI进行通知

Frigate提供了一个[MQTT主题](/integrations/mqtt)，`frigate/tracked_object_update`，当您的AI提供商返回跟踪对象的描述时，它会更新包含`event_id`和`description`的JSON有效负载。此描述可直接用于通知，例如发送警报到您的手机或进行音频公告。如果需要来自跟踪对象的其他详细信息，您可以使用[HTTP API](/integrations/api/event-events-event-id-get)查询`event_id`，例如：`http://frigate_ip:5000/api/events/<event_id>`。

如果希望在对象停止被跟踪之前获得通知，可以配置`after_significant_updates`的附加发送触发器。

```yaml
genai:
  send_triggers:
    tracked_object_end: true # 默认
    after_significant_updates: 3 # 在发送图像前跟踪对象的更新次数
```

## 自定义提示

Frigate将来自跟踪对象的多帧图像与提示一起发送给您的生成式AI提供商，要求其生成描述。默认提示如下：

```
请分析以下监控摄像头画面中的 “{label}” 元素，如果可以，请尽可能描述 “{label}” 的动作、以及它接下来可能会做什么，而不是描述其外观或周围环境。请注意引号内的名称可能为英文，请输出时将其翻译为中文。
```

:::tip

提示可以使用变量替换，如`{label}`、`{sub_label}`和`{camera}`，以将跟踪对象的信息替换为提示的一部分。

:::

您也可以在配置中定义自定义提示。

```yaml
genai:
  enabled: True
  provider: ollama
  base_url: http://localhost:11434
  model: llava
  prompt: "分析来自{camera}安全摄像头的这些图像中的{label}。重点关注{label}的动作、行为和潜在意图，而不仅仅是描述其外观。"
  object_prompts:
    person: "请查看该监控画面中的主要人物。他们在做什么，他们的行为可能暗示什么意图(例如，接近门、离开区域、站立不动)？不要描述周围环境或静态细节。"
    car: "观察这些图像中的主要车辆。重点关注其移动、方向或目的(例如，停车、接近、绕行)。如果是送货车辆，请提及公司名称。"
```

提示也可以在摄像头级别覆盖，以便为模型提供关于您特定摄像头的更详细提示(如果您希望)。默认情况下，将为所有跟踪对象和所有区域生成描述。但您也可以选择指定`objects`和`required_zones`，仅生成某些跟踪对象或区域的描述。

可选地，您可以通过将`use_snapshot`设置为`True`来使用快照生成描述(如果启用)。默认情况下，此设置为`False`，它会将对象生命周期内从`detect`流收集的未压缩图像发送给模型。一旦对象生命周期结束，仅保存一个压缩和裁剪的缩略图与跟踪对象。当您想要_重新生成_跟踪对象的描述时，使用快照可能很有用，因为它将为AI提供比裁剪/压缩的缩略图更高质量的图像(通常由AI本身缩小)。否则使用快照有一个权衡，即只向您的提供商发送单个图像，这将限制模型确定对象移动或方向的能力。

```yaml
cameras:
  front_door:
    genai:
      use_snapshot: True
      prompt: "分析来自{camera}前门安全摄像头的这些图像中的“{label}”。重点关注“{label}”的动作和潜在意图。请注意引号内的名称可能为英文，请输出时将其翻译为中文。"
      object_prompts:
        person: "检查这些图像中的人物。他们在做什么，他们的行为可能暗示什么目的(例如，递送东西、接近、离开)？如果他们携带或与包裹互动，请包括有关其来源或目的地的详细信息。"
        cat: "观察这些图像中的猫。重点关注其移动和意图(例如，徘徊、狩猎、与物体互动)。如果猫靠近花盆或进行任何特定动作，请提及。"
      objects:
        - person
        - cat
      required_zones:
        - steps
```

### 尝试不同的提示

许多提供商还为其模型提供公开的聊天界面。从Frigate下载几个不同的缩略图或快照，并在他们的聊天页面中尝试新内容，然后再更新Frigate中的提示以获得您喜欢的描述。

海外：
- OpenAI - [ChatGPT](https://chatgpt.com)
- Gemini - [Google AI Studio](https://aistudio.google.com)
- Ollama - [Open WebUI](https://docs.openwebui.com/)

国内：
- 千问 - [阿里百炼](https://bailian.console.aliyun.com/)
- 豆包 - [火山引擎](https://console.volcengine.com/ark)