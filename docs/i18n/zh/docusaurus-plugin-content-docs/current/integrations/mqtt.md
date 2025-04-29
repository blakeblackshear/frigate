---
id: mqtt
title: MQTT
---

:::tip

由于本文涉及过多专业领域内容，对普通用户帮助不算特别多，将不会进行精翻；本文使用DeepSeek AI进行翻译，仅做参考。

:::

这些是由Frigate生成的MQTT消息。默认的主题前缀是`frigate`，但可以在配置文件中更改。

## Frigate通用主题

### `frigate/available`

设计用于与Home Assistant的可用性主题配合使用。可能的消息有：
"online"：当Frigate运行时发布（在启动时）
"offline"：当Frigate停止后发布

### `frigate/restart`

导致Frigate退出。Docker应该配置为在退出时自动重启容器。

### `frigate/events`

为每个变化的跟踪对象发布消息。当跟踪对象不再被标记为false_positive时发布第一条消息。当Frigate找到跟踪对象的更好快照或发生区域变化时，它将发布具有相同id的消息。当跟踪对象结束时，将发布一条带有`end_time`设置的最终消息。

```json
{
  "type": "update", // new（新建）, update（更新）, end（结束）
  "before": {
    "id": "1607123955.475377-mxklsc",
    "camera": "front_door",
    "frame_time": 1607123961.837752,
    "snapshot_time": 1607123961.837752,
    "label": "person",
    "sub_label": null,
    "top_score": 0.958984375,
    "false_positive": false,
    "start_time": 1607123955.475377,
    "end_time": null,
    "score": 0.7890625,
    "box": [424, 500, 536, 712],
    "area": 23744,
    "ratio": 2.113207,
    "region": [264, 450, 667, 853],
    "current_zones": ["driveway"],
    "entered_zones": ["yard", "driveway"],
    "thumbnail": null,
    "has_snapshot": false,
    "has_clip": false,
    "active": true, // 便利属性，与"stationary"相反
    "stationary": false, // 对象是否被认为是静止的
    "motionless_count": 0, // 对象保持静止的帧数
    "position_changes": 2, // 对象从静止位置移动的次数
    "attributes": {
      "face": 0.64
    }, // 在对象上任何时候被识别的具有最高分数的属性
    "current_attributes": [], // 此帧中当前属性的详细数据
    "current_estimated_speed": 0.71, // 通过启用速度估算的区域移动的对象的当前估计速度（mph或kph）
    "velocity_angle": 180, // 通过启用速度估算的区域移动的对象相对于帧的行进方向
    "recognized_license_plate": "ABC12345", // 汽车对象的已识别车牌
    "recognized_license_plate_score": 0.933451
  },
  "after": {
    "id": "1607123955.475377-mxklsc",
    "camera": "front_door",
    "frame_time": 1607123962.082975,
    "snapshot_time": 1607123961.837752,
    "label": "person",
    "sub_label": ["John Smith", 0.79],
    "top_score": 0.958984375,
    "false_positive": false,
    "start_time": 1607123955.475377,
    "end_time": null,
    "score": 0.87890625,
    "box": [432, 496, 544, 854],
    "area": 40096,
    "ratio": 1.251397,
    "region": [218, 440, 693, 915],
    "current_zones": ["yard", "driveway"],
    "entered_zones": ["yard", "driveway"],
    "thumbnail": null,
    "has_snapshot": false,
    "has_clip": false,
    "active": true, // 便利属性，与"stationary"相反
    "stationary": false, // 对象是否被认为是静止的
    "motionless_count": 0, // 对象保持静止的帧数
    "position_changes": 2, // 对象改变位置的次数
    "attributes": {
      "face": 0.86
    }, // 在对象上任何时候被识别的具有最高分数的属性
    "current_attributes": [
      // 此帧中当前属性的详细数据
      {
        "label": "face",
        "box": [442, 506, 534, 524],
        "score": 0.86
      }
    ],
    "current_estimated_speed": 0.77, // 通过启用速度估算的区域移动的对象的当前估计速度（mph或kph）
    "velocity_angle": 180, // 通过启用速度估算的区域移动的对象相对于帧的行进方向
    "recognized_license_plate": "ABC12345", // 汽车对象的已识别车牌
    "recognized_license_plate_score": 0.933451
  }
}
```

### `frigate/tracked_object_update`

当跟踪对象元数据更新时发布的消息，例如当GenAI运行并返回跟踪对象描述时。

```json
{
  "type": "description",
  "id": "1607123955.475377-mxklsc",
  "description": "The car is a red sedan moving away from the camera."
}
```

### `frigate/reviews`

为每个变化的核查项目发布消息。当`检测`或`警报`初始化时发布第一条消息。当检测到其他对象或发生区域变化时，会发布具有相同id的`update`消息。当核查活动结束时，发布最终的`end`消息。

```json
{
  "type": "update", // new（新建）, update（更新）, end（结束）
  "before": {
    "id": "1718987129.308396-fqk5ka", // review_id（核查ID）
    "camera": "front_cam",
    "start_time": 1718987129.308396,
    "end_time": null,
    "severity": "detection",
    "thumb_path": "/media/frigate/clips/review/thumb-front_cam-1718987129.308396-fqk5ka.webp",
    "data": {
      "detections": [
        // 事件ID列表
        "1718987128.947436-g92ztx",
        "1718987148.879516-d7oq7r",
        "1718987126.934663-q5ywpt"
      ],
      "objects": ["person", "car"],
      "sub_labels": [],
      "zones": [],
      "audio": []
    }
  },
  "after": {
    "id": "1718987129.308396-fqk5ka",
    "camera": "front_cam",
    "start_time": 1718987129.308396,
    "end_time": null,
    "severity": "alert",
    "thumb_path": "/media/frigate/clips/review/thumb-front_cam-1718987129.308396-fqk5ka.webp",
    "data": {
      "detections": [
        "1718987128.947436-g92ztx",
        "1718987148.879516-d7oq7r",
        "1718987126.934663-q5ywpt"
      ],
      "objects": ["person", "car"],
      "sub_labels": ["Bob"],
      "zones": ["front_yard"],
      "audio": []
    }
  }
}
```

### `frigate/stats`

与`/api/stats`相同的数据，按可配置的间隔发布。

### `frigate/camera_activity`

返回每个摄像头的当前功能状态，包括是否检测到运动、对象等。可以通过向`frigate/onConnect`发布消息来触发。

### `frigate/notifications/set`

控制通知开关的主题。期望值为`ON`和`OFF`。

### `frigate/notifications/state`

通知当前状态的主题。发布值为`ON`和`OFF`。

## Frigate摄像头主题

### `frigate/<camera_name>/<object_name>`

发布摄像头检测到的对象数量，用于Home Assistant传感器。
`all`可作为object_name表示摄像头所有对象的计数。

### `frigate/<camera_name>/<object_name>/active`

发布摄像头检测到的活动对象数量，用于Home Assistant传感器。
`all`可作为object_name表示摄像头所有活动对象的计数。

### `frigate/<zone_name>/<object_name>`

发布区域内检测到的对象数量，用于Home Assistant传感器。
`all`可作为object_name表示区域内所有对象的计数。

### `frigate/<zone_name>/<object_name>/active`

发布区域内活动对象的数量，用于Home Assistant传感器。
`all`可作为object_name表示区域内所有活动对象的计数。

### `frigate/<camera_name>/<object_name>/snapshot`

发布检测到对象类型的JPEG编码帧。当对象不再被检测到时，发布最高置信度的图像或重新发布原始图像。

快照的高度和裁剪可在配置中设置。

### `frigate/<camera_name>/audio/<audio_type>`

当检测到特定类型音频时发布"ON"，未检测到时发布"OFF"，用于Home Assistant传感器。

### `frigate/<camera_name>/audio/dBFS`

发布该摄像头检测到的音频dBFS值。

**注意：**需要启用音频检测

### `frigate/<camera_name>/audio/rms`

发布该摄像头检测到的音频RMS值。

**注意：**需要启用音频检测

### `frigate/<camera_name>/enabled/set`

控制Frigate对摄像头处理的开关主题。期望值为`ON`和`OFF`。

### `frigate/<camera_name>/enabled/state`

摄像头处理当前状态的主题。发布值为`ON`和`OFF`。

### `frigate/<camera_name>/detect/set`

控制摄像头对象检测的开关主题。期望值为`ON`和`OFF`。

### `frigate/<camera_name>/detect/state`

摄像头对象检测当前状态的主题。发布值为`ON`和`OFF`。

### `frigate/<camera_name>/audio/set`

控制摄像头音频检测的开关主题。期望值为`ON`和`OFF`。

### `frigate/<camera_name>/audio/state`

摄像头音频检测当前状态的主题。发布值为`ON`和`OFF`。

### `frigate/<camera_name>/recordings/set`

控制摄像头录制的开关主题。期望值为`ON`和`OFF`。

### `frigate/<camera_name>/recordings/state`

摄像头录制当前状态的主题。发布值为`ON`和`OFF`。

### `frigate/<camera_name>/snapshots/set`

控制摄像头快照的开关主题。期望值为`ON`和`OFF`。

### `frigate/<camera_name>/snapshots/state`

摄像头快照当前状态的主题。发布值为`ON`和`OFF`。

### `frigate/<camera_name>/motion/set`

控制摄像头运动检测的开关主题。期望值为`ON`和`OFF`。
注意：如果检测未禁用，关闭运动检测将失败。

### `frigate/<camera_name>/motion`

摄像头当前是否检测到运动。期望值为`ON`和`OFF`。
注意：在最初检测到运动后，`ON`状态将持续到`mqtt_off_delay`秒（默认30秒）内没有检测到运动为止。

### `frigate/<camera_name>/motion/state`

摄像头运动检测当前状态的主题。发布值为`ON`和`OFF`。

### `frigate/<camera_name>/improve_contrast/set`

控制摄像头对比度增强的开关主题。期望值为`ON`和`OFF`。

### `frigate/<camera_name>/improve_contrast/state`

摄像头对比度增强当前状态的主题。发布值为`ON`和`OFF`。

### `frigate/<camera_name>/motion_threshold/set`

调整摄像头运动阈值的主题。期望值为整数。

### `frigate/<camera_name>/motion_threshold/state`

摄像头当前运动阈值的主题。发布值为整数。

### `frigate/<camera_name>/motion_contour_area/set`

调整摄像头运动轮廓区域的主题。期望值为整数。

### `frigate/<camera_name>/motion_contour_area/state`

摄像头当前运动轮廓区域的主题。发布值为整数。

### `frigate/<camera_name>/review_status`

摄像头当前活动状态的主题。可能的值为`NONE`、`DETECTION`或`ALERT`。

### `frigate/<camera_name>/ptz`

向摄像头发送PTZ命令的主题。

| 命令                   | 描述                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `preset_<preset_name>` | 发送命令移动到名为`<preset_name>`的预设位置                                             |
| `MOVE_<dir>`           | 发送命令持续向`<dir>`方向移动，可能的值为[UP, DOWN, LEFT, RIGHT]                        |
| `ZOOM_<dir>`           | 发送命令持续进行`<dir>`方向的缩放，可能的值为[IN, OUT]                                  |
| `STOP`                 | 发送停止移动命令                                                                        |

### `frigate/<camera_name>/ptz_autotracker/set`

控制摄像头PTZ自动跟踪器的开关主题。期望值为`ON`和`OFF`。

### `frigate/<camera_name>/ptz_autotracker/state`

摄像头PTZ自动跟踪器当前状态的主题。发布值为`ON`和`OFF`。

### `frigate/<camera_name>/ptz_autotracker/active`

确定PTZ自动跟踪器是否正在主动跟踪对象的主题。发布值为`ON`和`OFF`。

### `frigate/<camera_name>/review_alerts/set`

控制摄像头警报核查的开关主题。期望值为`ON`和`OFF`。

### `frigate/<camera_name>/review_alerts/state`

摄像头警报核查当前状态的主题。发布值为`ON`和`OFF`。

### `frigate/<camera_name>/review_detections/set`

控制摄像头检测核查的开关主题。期望值为`ON`和`OFF`。

### `frigate/<camera_name>/review_detections/state`

摄像头检测核查当前状态的主题。发布值为`ON`和`OFF`。

### `frigate/<camera_name>/birdseye/set`

控制摄像头鸟瞰视图的开关主题。期望值为`ON`和`OFF`。鸟瞰模式必须在配置中启用。

### `frigate/<camera_name>/birdseye/state`

摄像头鸟瞰视图当前状态的主题。发布值为`ON`和`OFF`。

### `frigate/<camera_name>/birdseye_mode/set`

设置摄像头鸟瞰模式的主题。鸟瞰视图提供不同的模式来自定义摄像头显示的情况。

_注意：从`CONTINUOUS`切换到`MOTION | OBJECTS`值时，摄像头从视图中移除最多需要30秒。_

| 命令         | 描述                                                        |
| ------------ | ----------------------------------------------------------------- |
| `CONTINUOUS` | 始终包含                                                    |
| `MOTION`     | 在最近30秒内检测到运动时显示                               |
| `OBJECTS`    | 在最近30秒内有活动跟踪对象时显示                           |

### `frigate/<camera_name>/birdseye_mode/state`

摄像头鸟瞰模式当前状态的主题。发布值为`CONTINUOUS`、`MOTION`、`OBJECTS`。

### `frigate/<camera_name>/notifications/set`

控制通知的开关主题。期望值为`ON`和`OFF`。

### `frigate/<camera_name>/notifications/state`

通知当前状态的主题。发布值为`ON`和`OFF`。

### `frigate/<camera_name>/notifications/suspend`

暂停通知特定分钟数的主题。期望值为整数。

### `frigate/<camera_name>/notifications/suspended`

通知暂停截止时间的主题。发布值为UNIX时间戳，如果通知未暂停则为0。