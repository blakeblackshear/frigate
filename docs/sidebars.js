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
      "guides/ha_network_storage",
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
        "configuration/record",
        "configuration/snapshots",
        "configuration/birdseye",
        "configuration/live",
        "configuration/restream",
        "configuration/autotracking",
        "configuration/camera_specific",
      ],
      Objects: [
        "configuration/masks",
        "configuration/objects",
        "configuration/stationary_objects",
        "configuration/zones",
      ],
      "Extra Configuration": [
        "configuration/hardware_acceleration",
        "configuration/ffmpeg_presets",
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
      "troubleshooting/recordings",
    ],
    Development: [
      "development/contributing",
      "development/contributing-boards"
    ],
  },
};
