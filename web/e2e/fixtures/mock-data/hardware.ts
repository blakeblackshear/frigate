/**
 * Detection hardware as reported by GET /api/hardware/probe.
 *
 * A mixed payload on purpose: two Corals exercise the per-unit checkboxes and
 * the "already used by another model" state, while the Intel GPU exercises the
 * unlimited detector-count dropdown.
 */
export const DETECTION_HARDWARE = [
  {
    key: "edgetpu:pci",
    detector: "edgetpu",
    name: "Coral EdgeTPU (PCIe)",
    units: [
      { device: "edgetpu:pci:0", label: "PCIe 0" },
      { device: "edgetpu:pci:1", label: "PCIe 1" },
    ],
    count: 2,
    unlimited: false,
  },
  {
    key: "openvino:GPU",
    detector: "openvino",
    name: "Intel GPU",
    units: [{ device: "openvino:GPU", label: "0000:00:02.0" }],
    count: 1,
    unlimited: true,
  },
  {
    key: "cpu",
    detector: "cpu",
    name: "CPU",
    units: [{ device: "cpu", label: "CPU" }],
    count: 1,
    unlimited: true,
  },
];
