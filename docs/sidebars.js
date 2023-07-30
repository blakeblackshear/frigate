module.exports = {
  docs: {
    Frigate: [
      "frigate/index",
      "frigate/hardware",
      "frigate/installation",
      "frigate/camera_setup",
    ],
    Guides: [
      "guides/getting_started",
      "guides/configuring_go2rtc",
      "guides/false_positives",
      "guides/ha_notifications",
      "guides/stationary_objects",
      "guides/reverse_proxy",
    ],
    Configuration: {
      "Configuration Files": [
        "configuration/index",
        {
          type: "link",
          label: "Go2RTC Configuration Reference",
          href: "https://github.com/AlexxIT/go2rtc/tree/v1.6.2#configuration"
        }
      ],
      Detectors: [
        "configuration/object_detectors",
        "configuration/audio_detectors",
      ],
      Cameras: [
        "configuration/cameras",
        "configuration/birdseye",
        "configuration/live",
        "configuration/restream",
        "configuration/camera_specific",
        "configuration/record",
        "configuration/snapshots",
      ],
      Hardware: [
        "configuration/hardware_acceleration",
        "configuration/ffmpeg_presets",
      ],
      Objects: [
        "configuration/masks",
        "configuration/objects",
        "configuration/stationary_objects",
        "configuration/zones",
      ],
      Advanced: [
        "configuration/advanced",
      ],
    },
    Integrations: [
      "integrations/plus",
      "integrations/home-assistant",
      "integrations/api",
      "integrations/mqtt",
      "integrations/third_party_extensions",
    ],
    Troubleshooting: [
      "troubleshooting/faqs",
    ],
    Development: [
      "development/contributing",
      "development/contributing-boards"
    ],
  },
};
