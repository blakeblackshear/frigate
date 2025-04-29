---
id: reference
title: 完整配置参考
---

### 完整配置参考：

:::warning

不建议直接复制这个完整的配置文件。只需指定与默认值不同的值。配置选项和默认值可能会在未来版本中发生变化。

:::

```yaml
mqtt:
  # 可选：启用mqtt服务器（默认值：如下所示）
  enabled: True
  # 必需：主机名
  host: mqtt.server.com
  # 可选：端口（默认值：如下所示）
  port: 1883
  # 可选：主题前缀（默认值：如下所示）
  # 注意：如果运行多个实例，必须是唯一的
  topic_prefix: frigate
  # 可选：客户端ID（默认值：如下所示）
  # 注意：如果运行多个实例，必须是唯一的
  client_id: frigate
  # 可选：用户名
  # 注意：MQTT用户可以通过以'FRIGATE_'开头的环境变量或docker secrets指定
  #      例如：user: '{FRIGATE_MQTT_USER}'
  user: mqtt_user
  # 可选：密码
  # 注意：MQTT密码可以通过以'FRIGATE_'开头的环境变量或docker secrets指定
  #      例如：password: '{FRIGATE_MQTT_PASSWORD}'
  password: password
  # 可选：用于启用TLS的自签名证书的CA证书（默认值：无）
  tls_ca_certs: /path/to/ca.crt
  # 可选：用于使用自签名客户端证书的客户端证书和密钥
  # （默认值：无）
  # 注意：证书不能有密码保护
  #      使用客户端证书时不要设置用户名和密码
  tls_client_cert: /path/to/client.crt
  tls_client_key: /path/to/client.key
  # 可选：tls_insecure（true/false）用于启用服务器证书中
  # 主机名的TLS验证（默认值：无）
  tls_insecure: false
  # 可选：发布统计信息的时间间隔（秒）（默认值：如下所示）
  stats_interval: 60
  # 可选：订阅和发布的QoS级别（默认值：如下所示）
  # 0 = 最多一次
  # 1 = 至少一次
  # 2 = 恰好一次
  qos: 0

# 可选：检测器配置。默认为单个CPU检测器
detectors:
  # 必需：检测器名称
  detector_name:
    # 必需：检测器类型
    # Frigate提供多种类型，详见 https://docs.frigate.video/configuration/object_detectors（默认值：如下所示）
    # 也可以插入其他类型的检测器。
    # 检测器可能需要额外的配置。
    # 更多信息请参考检测器配置页面。
    type: cpu

# 可选：数据库配置
database:
  # SQLite数据库文件的存储路径（默认值：如下所示）
  path: /config/frigate.db

# 可选：TLS配置
tls:
  # 可选：为8971端口启用TLS（默认值：如下所示）
  enabled: True

# 可选：代理配置
proxy:
  # 可选：上游代理的请求头映射。仅在Frigate的身份验证被禁用时使用。
  # 注意：许多身份验证代理会在下游传递一个包含已验证用户名的请求头。
  #      并非所有值都受支持。必须是白名单中的请求头。
  #      更多信息请参见文档。
  header_map:
    user: x-forwarded-user
  # 可选：用户登出的URL。这设置了UI中登出URL的位置。
  logout_url: /api/logout
  # 可选：用于检查代理发送的X-Proxy-Secret请求头的认证密钥。
  # 如果未设置，则不考虑来源信任所有请求。
  auth_secret: None

# 可选：身份验证配置
auth:
  # 可选：启用身份验证
  enabled: True
  # 可选：在启动时重置管理员用户密码（默认值：如下所示）
  # 新密码会打印在日志中
  reset_admin_password: False
  # 可选：存储原生身份验证JWT令牌的Cookie名称（默认值：如下所示）
  cookie_name: frigate_token
  # 可选：设置cookie的secure标志（默认值：如下所示）
  # 注意：如果你使用TLS，应该将此设置为True
  cookie_secure: False
  # 可选：会话长度（秒）（默认值：如下所示）
  session_length: 86400 # 24小时
  # 可选：刷新时间（秒）（默认值：如下所示）
  # 当会话将在小于此设置的时间内过期时，
  # 它将被刷新回session_length的时长。
  refresh_time: 43200 # 12小时
  # 可选：登录失败的速率限制，用于防止暴力破解
  # 登录攻击（默认值：如下所示）
  # 有关有效值的更多信息，请参见文档
  failed_login_rate_limit: None
  # 可选：用于确定IP地址进行速率限制的受信任代理
  # 注意：这仅用于限制登录尝试的速率，不会绕过
  # 身份验证。更多详情请参见身份验证文档。
  trusted_proxies: []
  # 可选：用户密码的哈希迭代次数
  # 截至2023年2月，OWASP建议PBKDF2-SHA256使用600000次迭代
  # 注意：更改此值不会自动更新密码哈希，你
  #      需要更改每个用户的密码才能使其生效
  hash_iterations: 600000

# 可选：模型修改
# 注意：默认值是针对EdgeTPU检测器的。
# 其他检测器需要设置模型配置。
model:
  # 必需：模型路径。Frigate+模型使用 plus://<model_id>（默认值：根据检测器自动设置）
  path: /edgetpu_model.tflite
  # 必需：标签映射文件路径（默认值：如下所示）
  labelmap_path: /labelmap.txt
  # 必需：对象检测模型输入宽度（默认值：如下所示）
  width: 320
  # 必需：对象检测模型输入高度（默认值：如下所示）
  height: 320
  # 必需：对象检测模型输入颜色空间
  # 有效值为 rgb、bgr 或 yuv（默认值：如下所示）
  input_pixel_format: rgb
  # 必需：对象检测模型输入张量格式
  # 有效值为 nhwc 或 nchw（默认值：如下所示）
  input_tensor: nhwc
  # 必需：对象检测模型类型，目前仅用于OpenVINO检测器
  # 有效值为 ssd、yolox、yolonas（默认值：如下所示）
  model_type: ssd
  # 必需：标签名称修改。这些会合并到标准标签映射中。
  labelmap:
    2: vehicle
  # 可选：对象标签到其属性标签的映射（默认值：取决于模型）
  attributes_map:
    person:
      - amazon
      - face
    car:
      - amazon
      - fedex
      - license_plate
      - ups

# 可选：音频事件配置
# 注意：可以在摄像头级别重写
audio:
  # 可选：启用音频事件（默认值：如下所示）
  enabled: False
  # 可选：配置在没有检测到音频后结束事件的秒数（默认值：如下所示）
  max_not_heard: 30
  # 可选：配置运行音频检测所需的最小RMS音量（默认值：如下所示）
  # 参考标准：
  #  - 200 - 高灵敏度
  #  - 500 - 中等灵敏度
  #  - 1000 - 低灵敏度
  min_volume: 500
  # 可选：要监听的音频类型（默认值：如下所示）
  listen:
    - bark      # 狗叫
    - fire_alarm # 火警
    - scream    # 尖叫
    - speech    # 说话
    - yell      # 喊叫
  # 可选：配置检测过滤器
  filters:
    # 与listen配置中标签匹配的标签
    speech:
      # 触发音频事件的最小分数（默认值：如下所示）
      threshold: 0.8

# 可选：日志记录器详细程度设置
logger:
  # 可选：默认日志详细程度（默认值：如下所示）
  default: info
  # 可选：特定组件的日志记录器覆盖
  logs:
    frigate.event: debug

# 可选：设置环境变量
environment_vars:
  EXAMPLE_VAR: value

# 可选：鸟瞰图配置
# 注意：可以在摄像头级别重写enabled和mode参数
birdseye:
  # 可选：启用鸟瞰视图（默认值：如下所示）
  enabled: True
  # 可选：通过RTSP重新串流鸟瞰视图（默认值：如下所示）
  # 注意：启用此功能将使鸟瞰视图全天候运行，可能会略微增加CPU使用率。
  restream: False
  # 可选：输出分辨率的宽度（默认值：如下所示）
  width: 1280
  # 可选：输出分辨率的高度（默认值：如下所示）
  height: 720
  # 可选：mpeg1视频流的编码质量（默认值：如下所示）
  # 1是最高质量，31是最低质量。较低的质量会减少CPU资源使用。
  quality: 8
  # 可选：视图模式。可用选项有：objects、motion和continuous
  #   objects - 如果摄像头在过去30秒内有被跟踪的对象，则包含该摄像头
  #   motion - 如果摄像头在过去30秒内检测到运动，则包含该摄像头
  #   continuous - 始终包含所有摄像头
  mode: objects
  # 可选：停止显示摄像头的活动阈值（默认值：如下所示）
  inactivity_threshold: 30
  # 可选：配置鸟瞰视图布局
  layout:
    # 可选：布局计算器的缩放因子，范围1.0-5.0（默认值：如下所示）
    scaling_factor: 2.0
    # 可选：一次最多显示的摄像头数量，显示最近的摄像头（默认值：显示所有摄像头）
    max_cameras: 1

# 可选：ffmpeg配置
# 关于预设的更多信息请访问 https://docs.frigate.video/configuration/ffmpeg_presets
ffmpeg:
  # 可选：ffmpeg二进制文件路径（默认值：如下所示）
  # 可以设置为`7.0`或`5.0`以指定其中一个包含的版本
  # 或者可以设置为任何包含`bin/ffmpeg`和`bin/ffprobe`的路径
  path: "default"
  # 可选：全局ffmpeg参数（默认值：如下所示）
  global_args: -hide_banner -loglevel warning -threads 2
  # 可选：全局硬件加速参数（默认值：自动检测）
  # 注意：请参阅特定设备的硬件加速文档
  hwaccel_args: "auto"
  # 可选：全局输入参数（默认值：如下所示）
  input_args: preset-rtsp-generic
  # 可选：全局输出参数
  output_args:
    # 可选：检测流的输出参数（默认值：如下所示）
    detect: -threads 2 -f rawvideo -pix_fmt yuv420p
    # 可选：录制流的输出参数（默认值：如下所示）
    record: preset-record-generic
  # 可选：ffmpeg重试连接摄像头前等待的秒数（默认值：如下所示）
  # 如果设置太低，frigate会过于频繁地重试连接摄像头流，消耗摄像头同时允许的有限流数
  # 如果设置太高，那么当ffmpeg崩溃或摄像头流超时时，你可能会丢失最多retry_interval秒的录像
  # 注意：这对于无线/电池供电的摄像头来说是一个有用的设置，可以减少连接超时期间潜在丢失的录像量
  retry_interval: 10
  # 可选：在HEVC（H.265）录制流上设置标签以提高与Apple播放器的兼容性（默认值：如下所示）
  apple_compatibility: false

# 可选：检测配置
# 注意：可以在摄像头级别重写
detect:
  # 可选：启用摄像头的检测功能（默认值：如下所示）
  enabled: False
  # 可选：检测角色输入帧的宽度（默认值：使用原生流分辨率）
  width: 1280
  # 可选：检测角色输入帧的高度（默认值：使用原生流分辨率）
  height: 720
  # 可选：检测角色输入的目标帧率（默认值：如下所示）
  # 注意：建议值为5。理想情况下，尽量在摄像头端降低帧率。
  fps: 5
  # 可选：对象在跟踪器中初始化所需的连续检测命中次数（默认值：帧率的1/2）
  min_initialized: 2
  # 可选：Frigate认为对象消失前的无检测帧数（默认值：帧率的5倍）
  max_disappeared: 25
  # 可选：静止对象跟踪配置
  stationary:
    # 可选：确认静止对象的频率（默认值：与阈值相同）
    # 当设置为1时，每帧都会运行对象检测来确认对象是否仍然存在。
    # 如果设置为10，则每10帧运行一次对象检测来确认对象是否仍然存在。
    interval: 50
    # 可选：对象被视为静止前的无位置变化帧数（默认值：帧率的10倍或10秒）
    threshold: 50
    # 可选：定义跟踪静止对象的最大帧数（默认值：未设置，永久跟踪）
    # 这可以帮助减少只应该短时间静止的对象的误报。
    # 也可以用来禁用静止对象跟踪。例如，你可能想为person设置一个值，
    # 但让car保持默认值。
    # 警告：设置这些值会覆盖默认行为并禁用静止对象跟踪。
    #      很少有情况需要禁用它。除非你知道确实需要，
    #      否则不建议从示例配置中复制这些值到你的配置中。
    max_frames:
      # 可选：所有对象类型的默认值（默认值：未设置，永久跟踪）
      default: 3000
      # 可选：特定对象的值
      objects:
        person: 1000
  # 可选：检测注释的偏移毫秒数（默认值：如下所示）。
  # 录制和检测过程之间经常存在延迟，
  # 特别是当使用单独的流进行检测和录制时。
  # 使用此设置可以使时间轴上的边界框与录制内容更好地对齐。
  # 该值可以是正数或负数。
  # 提示：想象有一个跟踪对象剪辑，其中一个人从左向右走。
  #      如果跟踪对象生命周期边界框始终在人的左侧，
  #      则应该减小该值。同样，如果一个人从左向右走，
  #      而边界框始终在人的前面，则应该增加该值。
  # 提示：此偏移是动态的，所以你可以更改值，它会更新现有的
  #      跟踪对象，这使得调整变得容易。
  # 警告：快速移动的对象的边界框可能无法对齐。
  annotation_offset: 0

# 可选：对象配置
# 注意：可以在摄像头级别重写
objects:
  # 可选：从labelmap.txt中要跟踪的对象列表（默认值：如下所示）
  track:
    - person    # 人
  # 可选：防止在某些区域检测所有类型对象的蒙版（默认值：无蒙版）
  # 基于对象边界框的底部中心进行检查。
  # 注意：此蒙版与下面的对象类型特定蒙版组合使用
  mask: 0.000,0.000,0.781,0.000,0.781,0.278,0.000,0.278
  # 可选：减少特定对象类型误报的过滤器
  filters:
    person:    # 人
      # 可选：检测到的对象边界框的最小尺寸（默认值：0）。
      # 可以指定为像素宽度*高度的整数，或表示帧百分比的小数（0.000001到0.99）。
      min_area: 5000
      # 可选：检测到的对象边界框的最大尺寸（默认值：24000000）。
      # 可以指定为像素宽度*高度的整数，或表示帧百分比的小数（0.000001到0.99）。
      max_area: 100000
      # 可选：检测到的对象边界框的最小宽高比（默认值：0）
      min_ratio: 0.5
      # 可选：检测到的对象边界框的最大宽高比（默认值：24000000）
      max_ratio: 2.0
      # 可选：开始跟踪对象所需的最小分数（默认值：如下所示）
      min_score: 0.5
      # 可选：被跟踪对象的计算分数被认为是真阳性的最小百分比（小数）（默认值：如下所示）
      threshold: 0.7
      # 可选：防止在某些区域检测此类型对象的蒙版（默认值：无蒙版）
      # 基于对象边界框的底部中心进行检查
      mask: 0.000,0.000,0.781,0.000,0.781,0.278,0.000,0.278

# 可选：审查配置
# 注意：可以在摄像头级别重写
review:
  # 可选：警报配置
  alerts:
    # 可选：启用摄像头的警报（默认值：如下所示）
    enabled: True
    # 可选：符合警报条件的标签（默认值：如下所示）
    labels:
      - car      # 汽车
      - person   # 人
    # 可选：对象被标记为警报所需的区域（默认值：无）
    # 注意：当在全局设置必需区域时，此区域必须存在于所有摄像头中，
    #      否则配置将被视为无效。在这种情况下，required_zones
    #      应该在摄像头级别配置。
    required_zones:
      - driveway  # 车道
  # 可选：检测配置
  detections:
    # 可选：启用摄像头的检测（默认值：如下所示）
    enabled: True
    # 可选：符合检测条件的标签（默认值：所有被跟踪/监听的标签）
    labels:
      - car      # 汽车
      - person   # 人
    # 可选：对象被标记为检测所需的区域（默认值：无）
    # 注意：当在全局设置必需区域时，此区域必须存在于所有摄像头中，
    #      否则配置将被视为无效。在这种情况下，required_zones
    #      应该在摄像头级别配置。
    required_zones:
      - driveway  # 车道

# 可选：运动配置
# 注意：可以在摄像头级别重写
motion:
  # 可选：启用摄像头的检测功能（默认值：True）
  # 注意：运动检测是对象检测所必需的，
  #      如果将此设置为False但保持detect启用，
  #      将在启动时导致错误。
  enabled: False
  # 可选：传递给cv2.threshold的阈值，用于确定像素是否足够不同以被计为运动（默认值：如下所示）
  # 增加此值将降低运动检测的灵敏度，减小此值将提高运动检测的灵敏度。
  # 该值应在1到255之间。
  threshold: 30
  # 可选：用于检测闪电或其他需要重新校准运动检测的重大变化的图像百分比
  #      （默认值：如下所示）
  # 增加此值将使运动检测更可能将闪电或红外模式变化视为有效运动。
  # 减小此值将使运动检测更可能忽略大量运动，例如有人接近门铃摄像头。
  lightning_threshold: 0.8
  # 可选：调整大小后的运动图像中被计为运动的最小像素尺寸（默认值：如下所示）
  # 增加此值将防止检测到较小的运动区域。减小此值将
  # 使运动检测对较小的移动物体更敏感。
  # 参考标准：
  #  - 10 - 高灵敏度
  #  - 30 - 中等灵敏度
  #  - 50 - 低灵敏度
  contour_area: 10
  # 可选：在平均帧以确定背景时传递给cv2.accumulateWeighted的Alpha值（默认值：如下所示）
  # 较高的值意味着当前帧对平均值影响很大，新对象将更快地被平均到背景中。
  # 较低的值将导致移动阴影等被检测为运动的时间更长。
  # https://www.geeksforgeeks.org/background-subtraction-in-an-image-using-concept-of-running-average/
  frame_alpha: 0.01
  # 可选：调整大小后的运动帧的高度（默认值：100）
  # 较高的值将以更高的CPU使用为代价获得更细粒度的运动检测。
  # 较低的值会减少CPU使用，但小的变化可能不会被识别为运动。
  frame_height: 100
  # 可选：运动蒙版
  # 注意：有关创建蒙版的更详细信息，请参见文档
  mask: 0.000,0.469,1.000,0.469,1.000,1.000,0.000,1.000
  # 可选：改善对比度（默认值：如下所示）
  # 启用动态对比度改善。这应该有助于改善夜间检测，但代价是使白天的运动检测更敏感。
  improve_contrast: True
  # 可选：通过MQTT更新摄像头运动状态从ON到OFF时的延迟（默认值：如下所示）。
  mqtt_off_delay: 30

# 可选：通知配置
# 注意：可以在摄像头级别重写（除了email）
notifications:
  # 可选：启用通知服务（默认值：如下所示）
  enabled: False
  # 可选：推送服务要联系的电子邮件
  # 注意：这是使用通知功能所必需的
  email: "admin@example.com"
  # 可选：通知的冷却时间（秒）（默认值：如下所示）
  cooldown: 0

# 可选：录制配置
# 注意：可以在摄像头级别重写
record:
  # 可选：启用录制（默认值：如下所示）
  # 警告：如果在配置中禁用了录制，稍后通过UI或MQTT开启将不会生效。
  enabled: False
  # 可选：清理运行之间的等待分钟数（默认值：如下所示）
  # 如果你想最小化I/O操作，可以使用此设置来减少从磁盘删除录制片段的频率
  expire_interval: 60
  # 可选：在启动时和每天一次同步录制文件（默认值：如下所示）。
  sync_recordings: False
  # 可选：录制保留设置
  retain:
    # 可选：无论是否有跟踪对象都要保留录像的天数（默认值：如下所示）
    # 注意：如果你只想保留警报和检测的录像，应该将此设置为0，
    #      并在下面的alerts和detections部分定义保留设置。
    days: 0
    # 可选：保留模式。可用选项有：all、motion和active_objects
    #   all - 保存所有录制片段，无论是否有活动
    #   motion - 保存所有检测到运动的录制片段
    #   active_objects - 保存所有有活动/移动对象的录制片段
    # 注意：此模式仅在上面days设置大于0时适用
    mode: all
  # 可选：录制导出设置
  export:
    # 可选：延时摄影输出参数（默认值：如下所示）。
    # 注意：默认参数设置为将24小时的录制压缩为1小时的播放。
    # 有关这些参数如何工作的更多信息，请参见https://stackoverflow.com/a/58268695。
    # 例如：如果你想将24小时压缩为30分钟，那就是从86400秒到1800秒，
    # 即1800 / 86400 = 0.02。
    # -r（帧率）决定了输出视频的流畅度。
    # 所以在这种情况下参数应该是 -vf setpts=0.02*PTS -r 30。
    timelapse_args: "-vf setpts=0.04*PTS -r 30"
  # 可选：录制预览设置
  preview:
    # 可选：录制预览质量（默认值：如下所示）。
    # 选项有：very_low（极低）、low（低）、medium（中）、high（高）、very_high（极高）
    quality: medium
  # 可选：警报录制设置
  alerts:
    # 可选：警报前包含的秒数（默认值：如下所示）
    pre_capture: 5
    # 可选：警报后包含的秒数（默认值：如下所示）
    post_capture: 5
    # 可选：警报录像的保留设置
    retain:
      # 必需：保留天数（默认值：如下所示）
      days: 14
      # 可选：保留模式（默认值：如下所示）
      #   all - 保存所有警报录制片段，无论是否有活动
      #   motion - 保存所有检测到运动的警报录制片段
      #   active_objects - 保存所有有活动/移动对象的警报录制片段
      #
      # 注意：如果摄像头的保留模式比此处配置的模式更严格，
      #      在应用此模式时，片段可能已经被删除。
      #      例如，如果摄像头保留模式是"motion"，没有运动的片段
      #      永远不会被存储，所以在这里设置模式为"all"不会恢复它们。
      mode: motion
  # 可选：检测录制设置
  detections:
    # 可选：检测前包含的秒数（默认值：如下所示）
    pre_capture: 5
    # 可选：检测后包含的秒数（默认值：如下所示）
    post_capture: 5
    # 可选：检测录像的保留设置
    retain:
      # 必需：保留天数（默认值：如下所示）
      days: 14
      # 可选：保留模式（默认值：如下所示）
      #   all - 保存所有检测录制片段，无论是否有活动
      #   motion - 保存所有检测到运动的检测录制片段
      #   active_objects - 保存所有有活动/移动对象的检测录制片段
      #
      # 注意：如果摄像头的保留模式比此处配置的模式更严格，
      #      在应用此模式时，片段可能已经被删除。
      #      例如，如果摄像头保留模式是"motion"，没有运动的片段
      #      永远不会被存储，所以在这里设置模式为"all"不会恢复它们。
      mode: motion

# 可选：为每个跟踪对象写入clips目录的jpg快照配置
# 注意：可以在摄像头级别重写
snapshots:
  # 可选：启用将jpg快照写入/media/frigate/clips（默认值：如下所示）
  enabled: False
  # 可选：保存快照图像的干净PNG副本（默认值：如下所示）
  clean_copy: True
  # 可选：在快照上打印时间戳（默认值：如下所示）
  timestamp: False
  # 可选：在快照上绘制边界框（默认值：如下所示）
  bounding_box: True
  # 可选：裁剪快照（默认值：如下所示）
  crop: False
  # 可选：调整快照的高度（默认值：原始大小）
  height: 175
  # 可选：限制快照仅包含进入所列区域的对象（默认值：无必需区域）
  required_zones: []
  # 可选：摄像头特定的保留设置覆盖（默认值：全局值）
  retain:
    # 必需：默认保留天数（默认值：如下所示）
    default: 10
    # 可选：按对象保留天数
    objects:
      person: 15    # 人
  # 可选：编码jpeg的质量，0-100（默认值：如下所示）
  quality: 70

# 可选：语义搜索功能配置
semantic_search:
  # 可选：启用语义搜索（默认值：如下所示）
  enabled: False
  # 可选：从历史跟踪对象重新索引嵌入数据库（默认值：如下所示）
  reindex: False
  # 可选：设置用于嵌入的模型（默认值：如下所示）
  model: "jinav1"
  # 可选：设置用于嵌入的模型大小（默认值：如下所示）
  # 注意：小型模型在CPU上运行，大型模型在GPU上运行
  model_size: "small"

# 可选：人脸识别功能配置
# 注意：enabled和min_area可以在摄像头级别重写
face_recognition:
  # 可选：启用语义搜索（默认值：如下所示）
  enabled: False
  # 可选：标记为潜在匹配所需的最小人脸距离分数（默认值：如下所示）
  unknown_score: 0.8
  # 可选：检测人脸所需的最小人脸检测分数（默认值：如下所示）
  # 注意：这仅在不运行Frigate+模型时适用
  detection_threshold: 0.7
  # 可选：被视为匹配所需的最小人脸距离分数（默认值：如下所示）
  recognition_threshold: 0.9
  # 可选：运行人脸识别所需的检测到的人脸框最小面积（默认值：如下所示）
  min_area: 500
  # 可选：保存用于训练的已识别人脸图像数量（默认值：如下所示）
  save_attempts: 100
  # 可选：应用模糊质量过滤器，根据图像的模糊程度调整置信度（默认值：如下所示）
  blur_confidence_filter: True

# 可选：车牌识别功能配置
# 注意：enabled、min_area和enhancement可以在摄像头级别重写
lpr:
  # 可选：启用车牌识别（默认值：如下所示）
  enabled: False
  # 可选：运行模型的设备（默认值：如下所示）
  device: CPU
  # 可选：设置用于文本检测的模型大小（默认值：如下所示）
  model_size: small
  # 可选：开始运行识别所需的车牌对象置信度分数（默认值：如下所示）
  detection_threshold: 0.7
  # 可选：开始运行识别所需的车牌最小面积（默认值：如下所示）
  min_area: 1000
  # 可选：将车牌作为子标签添加到对象所需的识别置信度分数（默认值：如下所示）
  recognition_threshold: 0.9
  # 可选：将车牌作为子标签添加到对象所需的最小字符数（默认值：如下所示）
  min_plate_length: 4
  # 可选：车牌预期格式的正则表达式（默认值：如下所示）
  format: None
  # 可选：允许检测到的车牌与已知车牌匹配时可以有的缺失/错误字符数
  match_distance: 1
  # 可选：要跟踪的已知车牌（字符串或正则表达式）（默认值：如下所示）
  known_plates: {}
  # 可选：通过对比度调整和降噪增强检测到的车牌图像（默认值：如下所示）
  # 值在0到10之间。更高的值并不总是更好，可能比较低的值表现更差。
  enhancement: 0
  # 可选：保存车牌图像到/media/frigate/clips/lpr用于调试目的（默认值：如下所示）
  debug_save_plates: False

# 可选：AI生成的跟踪对象描述配置
# 警告：根据提供者的不同，这将通过互联网将缩略图发送到
# Google或OpenAI的LLM来生成描述。可以在摄像头级别重写
# （enabled: False）以增强室内摄像头的隐私保护。
genai:
  # 可选：启用AI描述生成（默认值：如下所示）
  enabled: False
  # 启用时必需：提供者必须是ollama、gemini或openai之一
  provider: ollama
  # 当提供者是ollama时必需。也可以用于openai提供者的OpenAI API兼容后端。如果要使用openai类接口的第三方服务商，请使用系统变量
  base_url: http://localhost:11434
  # 当使用gemini或openai时必需
  api_key: "{FRIGATE_GENAI_API_KEY}"
  # 可选：生成描述的默认提示。可以使用替换变量
  # 如"label"、"sub_label"、"camera"来使其更加动态（默认值：如下所示）
  prompt: "请分析以下监控摄像头画面中的 “{label}” 元素，如果可以，请尽可能描述 “{label}” 的动作、行为和潜在意图，并尽可能详细的描述它的外观，同时请不要描述周围环境和其他元素细节等。注意，引号内的对象名可能为英文，同时需要将它转换为中文。"
  # 可选：自定义描述结果的对象特定提示
  # 格式：{label}: {prompt}
  object_prompts:
    person: "分析这些图像中的主要人物。他们在做什么，他们的行动可能暗示他们的意图是什么（例如，接近一扇门，离开一个区域，静止不动）？不要描述周围环境或静态细节。"

# 可选：重新串流配置
# 使用 https://github.com/AlexxIT/go2rtc (v1.9.9)
# 注意：必须使用默认的go2rtc API端口（1984），
#      不支持更改集成的go2rtc实例的端口。
go2rtc:

# 可选：WebUI的实时流配置
# 注意：可以在摄像头级别重写
live:
  # 可选：设置在go2rtc中配置的流
  # 用于frigate WebUI的实时查看（默认值：摄像头名称）
  # 注意：在大多数情况下，这应该只在摄像头级别设置。
  streams:
    main_stream: main_stream_name
    sub_stream: sub_stream_name
  # 可选：设置jsmpeg流的高度（默认值：720）
  # 这必须小于或等于检测流的高度。较低的分辨率
  # 减少查看jsmpeg流所需的带宽。宽度根据已知的宽高比计算。
  height: 720
  # 可选：设置jsmpeg流的编码质量（默认值：如下所示）
  # 1是最高质量，31是最低质量。较低的质量使用更少的CPU资源。
  quality: 8

# 可选：视频流内时间戳样式配置
# 注意：可以在摄像头级别重写
timestamp_style:
  # 可选：时间戳的位置（默认值：如下所示）
  #      "tl"（左上）、"tr"（右上）、"bl"（左下）、"br"（右下）
  position: "tl"
  # 可选：符合Python包"datetime"的格式指定符（默认值：如下所示）
  #      其他示例：
  #        德语格式："%d.%m.%Y %H:%M:%S"
  format: "%m/%d/%Y %H:%M:%S"
  # 可选：字体颜色
  color:
    # 指定颜色时所有参数都必需（默认值：如下所示）
    red: 255
    green: 255
    blue: 255
  # 可选：字体线条粗细（默认值：如下所示）
  thickness: 2
  # 可选：文字效果（默认值：如下所示）
  #      None（无效果）
  #      "solid"（字体反色的实心背景）
  #      "shadow"（字体阴影）
  effect: None

# 必需
cameras:
  # 必需：摄像头名称，目前仅能使用英文数字与下划线
  back:
    # 可选：启用/禁用摄像头（默认值：如下所示）。
    # 如果禁用：配置仍然有效但没有实时流和捕获等功能。
    # 事件/录像仍然可以查看。
    enabled: True
    # 可选：用于某些Frigate功能的摄像头类型（默认值：如下所示）
    # 选项为 "generic"（通用）和 "lpr"（车牌识别）
    type: "generic"
    # 必需：摄像头的ffmpeg设置
    ffmpeg:
      # 必需：摄像头的输入流列表。更多信息请参见文档。
      inputs:
        # 必需：流的路径
        # 注意：路径可以包含环境变量或docker secrets，必须以'FRIGATE_'开头并在{}中引用
        - path: rtsp://viewer:{FRIGATE_RTSP_PASSWORD}@10.0.10.10:554/cam/realmonitor?channel=1&subtype=2
          # 必需：此流的角色列表。有效值为：audio（音频）,detect（检测）,record（录制）
          # 注意：除了分配audio、detect和record角色外，
          # 它们还必须在摄像头配置中启用。
          roles:
            - audio
            - detect
            - record
          # 可选：流特定的全局参数（默认值：继承）
          # global_args:
          # 可选：流特定的硬件加速参数（默认值：继承）
          # hwaccel_args:
          # 可选：流特定的输入参数（默认值：继承）
          # input_args:
      # 可选：摄像头特定的全局参数（默认值：继承）
      # global_args:
      # 可选：摄像头特定的硬件加速参数（默认值：继承）
      # hwaccel_args:
      # 可选：摄像头特定的输入参数（默认值：继承）
      # input_args:
      # 可选：摄像头特定的输出参数（默认值：继承）
      # output_args:

    # 可选：允许最高评分图像被新图像替换前的超时时间（默认值：如下所示）
    best_image_timeout: 60

    # 可选：从系统页面直接访问摄像头Web界面的URL。可能并非所有摄像头都支持。
    webui_url: ""

    # 可选：此摄像头的区域配置
    zones:
      # 必需：区域名称，目前仅能使用英文数字与下划线
      # 注意：这必须与任何摄像头名称不同，但可以与其他摄像头上的
      #      另一个区域名称相匹配。
      front_steps:    # 前台阶
        # 必需：定义区域多边形的x,y坐标列表。
        # 注意：区域内的存在仅基于对象边界框的底部中心进行评估。
        coordinates: 0.033,0.306,0.324,0.138,0.439,0.185,0.042,0.428
        # 可选：启用速度估算的4边形区域的实际距离（默认值：无）
        # 按区域点坐标的顺序列出距离，并使用ui配置中定义的单位系统
        distances: 10,15,12,11
        # 可选：对象被视为在区域内所需的连续帧数（默认值：如下所示）。
        inertia: 3
        # 可选：对象必须在区域内停留的秒数才被视为在区域内（默认值：如下所示）
        loitering_time: 0
        # 可选：可以触发此区域的对象列表（默认值：所有被跟踪的对象）
        objects:
          - person    # 人
        # 可选：区域级别的对象过滤器。
        # 注意：全局和摄像头过滤器在上游应用。
        filters:
          person:    # 人
            min_area: 5000
            max_area: 100000
            threshold: 0.7

    # 可选：通过MQTT发布的jpg快照配置
    mqtt:
      # 可选：启用通过MQTT发布摄像头快照（默认值：如下所示）
      # 注意：仅适用于通过'frigate/<camera_name>/<object_name>/snapshot'发布图像数据到MQTT。
      # 所有其他消息仍将被发布。
      enabled: True
      # 可选：在快照上打印时间戳（默认值：如下所示）
      timestamp: True
      # 可选：在快照上绘制边界框（默认值：如下所示）
      bounding_box: True
      # 可选：裁剪快照（默认值：如下所示）
      crop: True
      # 可选：调整快照的高度（默认值：如下所示）
      height: 270
      # 可选：jpeg编码质量（默认值：如下所示）
      quality: 70
      # 可选：限制MQTT消息仅发送进入所列区域的对象（默认值：无必需区域）
      required_zones: []

    # 可选：摄像头在GUI中的处理配置
    ui:
      # 可选：调整摄像头在UI中的排序。数字越大显示越靠后（默认值：如下所示）
      # 默认情况下摄像头按字母顺序排序。
      order: 0
      # 可选：是否在Frigate UI中显示该摄像头（默认值：如下所示）
      dashboard: True

    # 可选：连接到ONVIF摄像头
    # 以启用PTZ控制功能
    onvif:
      # 必需：要连接的摄像头主机
      # 注意：默认使用HTTP；如果指定scheme也支持HTTPS，例如："https://0.0.0.0"
      host: 0.0.0.0
      # 可选：设备的ONVIF端口（默认值：如下所示）
      port: 8000
      # 可选：登录用户名
      # 注意：某些设备需要管理员权限才能访问ONVIF
      user: admin
      # 可选：登录密码
      password: admin
      # 可选：跳过ONVIF服务器的TLS验证（默认值：如下所示）
      tls_insecure: False
      # 可选：忽略认证过程中摄像头与服务器的时间同步差异
      # 建议在两端都使用NTP，由于存在安全风险，只应在"安全"环境中将此设置为True
      ignore_time_mismatch: False
      # 可选：PTZ摄像头对象自动跟踪功能。通过自动移动PTZ摄像头，
      # 将移动对象保持在画面中心。
      autotracking:
        # 可选：启用/禁用对象自动跟踪（默认值：如下所示）
        enabled: False
        # 可选：启动时校准摄像头（默认值：如下所示）
        # 校准会逐步移动PTZ并测量移动所需时间。
        # 结果用于帮助估计摄像头移动后跟踪对象的位置。
        # Frigate会在校准后自动更新配置文件，
        # 为摄像头添加"movement_weights"条目。之后应将calibrate_on_startup设为False。
        calibrate_on_startup: False
        # 可选：自动跟踪期间对对象进行缩放的模式（默认值：如下所示）
        # 可用选项有：disabled（禁用）、absolute（绝对）和relative（相对）
        #   disabled - 不对自动跟踪的对象进行缩放，仅使用平移/倾斜
        #   absolute - 使用绝对缩放（大多数PTZ摄像头支持）
        #   relative - 使用相对缩放（并非所有PTZ都支持，但可以实现同步平移/倾斜/缩放运动）
        zooming: disabled
        # 可选：改变自动跟踪对象缩放行为的数值（默认值：如下所示）
        # 较低的值会在跟踪对象周围保留更多场景。
        # 较高的值会更多地放大跟踪对象，但Frigate可能会更快失去跟踪。
        # 该值应在0.1到0.75之间
        zoom_factor: 0.3
        # 可选：从labelmap.txt中要跟踪的对象列表（默认值：如下所示）
        track:
          - person    # 人
        # 必需：当对象进入任何列出的区域时开始自动跟踪
        required_zones:
          - zone_name
        # 必需：跟踪结束后返回的ONVIF预设名称（默认值：如下所示）
        return_preset: home
        # 可选：返回预设前的延迟秒数（默认值：如下所示）
        timeout: 10
        # 可选：摄像头校准自动生成的值。请勿手动修改（默认值：如下所示）
        movement_weights: []

    # 可选：鸟瞰图中摄像头的排序配置
    birdseye:
      # 可选：调整鸟瞰图中摄像头的排序。数字越大显示越靠后（默认值：如下所示）
      # 默认情况下摄像头按字母顺序排序。
      order: 0

    # 可选：AI生成的跟踪对象描述配置
    genai:
      # 可选：启用AI描述生成（默认值：如下所示）
      enabled: False
      # 可选：使用对象快照而非缩略图进行描述生成（默认值：如下所示）
      use_snapshot: False
      # 可选：生成描述的默认提示。可以使用替换变量
      # 如"label"、"sub_label"、"camera"来使其更加动态（默认值：如下所示）
      prompt: "请分析以下监控摄像头画面中的'{label}'元素，尽可能详细描述其动作、行为和潜在意图，同时避免描述背景环境。"
      # 可选：自定义描述结果的对象特定提示
      # 格式：{label}: {prompt}
      object_prompts:
        person: "分析画面中人物的行为特征，包括动作方向、停留时间和可能的意图，但不要描述周围环境。"
      # 可选：要生成描述的对象（默认值：所有被跟踪的对象）
      objects:
        - person    # 人
        - cat       # 猫
      # 可选：限制描述生成仅针对进入所列区域的对象（默认值：无限制，所有区域都适用）
      required_zones: []
      # 可选：触发将跟踪对象的帧发送给生成式AI的条件（默认值：如下所示）
      send_triggers:
        # 当对象不再被跟踪时
        tracked_object_end: True
        # 可选：在收到X次重要更新后（默认值：如下所示）
        after_significant_updates: None
      # 可选：保存发送给生成式AI的缩略图以供审查/调试（默认值：如下所示）
      debug_save_thumbnails: False

# 可选：UI配置
ui:
  # 可选：设置UI中使用的时区（默认值：使用浏览器本地时间）
  # timezone: America/Denver
  # 可选：设置使用的时间格式
  # 选项有：browser（浏览器默认）、12hour（12小时制）或24hour（24小时制）（默认值：如下所示）
  time_format: browser
  # 可选：设置指定长度的日期样式
  # 选项有：full（完整）、long（长）、medium（中）、short（短）
  # 示例：
  #    short: 2/11/23
  #    medium: Feb 11, 2023
  #    full: Saturday, February 11, 2023
  # （默认值：如下所示）
  date_style: short
  # 可选：设置指定长度的时间样式
  # 选项有：full（完整）、long（长）、medium（中）、short（短）
  # 示例：
  #    short: 8:14 PM
  #    medium: 8:15:22 PM
  #    full: 8:15:22 PM Mountain Standard Time
  # （默认值：如下所示）
  time_style: medium
  # 可选：手动覆盖日期/时间样式，使用strftime格式
  # https://www.gnu.org/software/libc/manual/html_node/Formatting-Calendar-Time.html
  # 可能的值如上所示（默认值：未设置）
  strftime_fmt: "%Y/%m/%d %H:%M"
  # 可选：设置单位系统为"imperial"（英制）或"metric"（公制）（默认值：metric）
  # 用于UI和MQTT主题
  unit_system: metric

# 可选：遥测配置
telemetry:
  # 可选：用于带宽统计监控的启用网络接口（默认值：空列表，让nethogs搜索所有接口）
  network_interfaces:
    - eth
    - enp
    - eno
    - ens
    - wl
    - lo
  # 可选：配置系统统计
  stats:
    # 可选：启用AMD GPU统计（默认值：如下所示）
    amd_gpu_stats: True
    # 可选：启用Intel GPU统计（默认值：如下所示）
    intel_gpu_stats: True
    # 可选：将GPU视为SR-IOV以修复GPU统计（默认值：如下所示）
    sriov: False
    # 可选：启用摄像头ffmpeg进程、go2rtc和对象检测器的网络带宽统计监控（默认值：如下所示）
    # 注意：容器必须具有特权或启用cap_net_admin、cap_net_raw能力
    network_bandwidth: False
  # 可选：启用最新版本检查（默认值：如下所示）
    # 注意：如果使用Home Assistant集成，禁用此功能将阻止它报告新版本
  version_check: True

# 可选：摄像头组配置（默认值：未设置任何组）
# 注意：建议使用UI来设置摄像头组
camera_groups:
  # 必需：摄像头组名称，目前仅能使用英文数字与下划线
  front:
    # 必需：组中的摄像头列表
    cameras:
      - front_cam    # 前摄像头
      - side_cam     # 侧摄像头
      - front_doorbell_cam  # 前门铃摄像头
    # 必需：组使用的图标
    icon: LuCar
    # 必需：该组的索引
    order: 0
```