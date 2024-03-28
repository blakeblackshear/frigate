module.exports = {
  docs: {
    Frigate: [
      "frigate/index",
      "frigate/hardware",
      "frigate/installation",
      "frigate/camera_setup",
      "frigate/video_pipeline",
      "frigate/glossary",
    ],
    Guides: [
      "guides/getting_started",
      "guides/configuring_go2rtc",
      "guides/ha_notifications",
      "guides/ha_network_storage",
      "guides/parked_cars",
      "guides/reverse_proxy",
    ],
    Configuration: {
      "Configuration Files": [
        "configuration/index",
        "configuration/reference",
        {
          type: "link",
          label: "Go2RTC Configuration Reference",
          href: "https://github.com/AlexxIT/go2rtc/tree/v1.8.5#configuration",
        },
      ],
      Detectors: [
        "configuration/object_detectors",
        "configuration/audio_detectors",
      ],
      Cameras: [
        "configuration/cameras",
        "configuration/events",
        "configuration/record",
        "configuration/snapshots",
        "configuration/motion_detection",
        "configuration/birdseye",
        "configuration/live",
        "configuration/restream",
        "configuration/autotracking",
        "configuration/camera_specific",
      ],
      Objects: [
        "configuration/object_filters",
        "configuration/masks",
        "configuration/zones",
        "configuration/objects",
        "configuration/stationary_objects",
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
    "Frigate+": [
      "plus/index",
      "plus/first_model",
      "plus/improving_model",
      "plus/faq",
    ],
    Troubleshooting: [
      "troubleshooting/faqs",
      "troubleshooting/recordings",
      "troubleshooting/edgetpu",
    ],
    Development: [
      "development/contributing",
      "development/contributing-boards",
    ],
  },
};
