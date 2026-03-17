const LOW_BANDWIDTH_PATTERN = /\b(sub|low|mobile|small|sd|lowres|low-res)\b/i;
const HIGH_BANDWIDTH_PATTERN = /\b(main|high|hd|full|primary)\b/i;

function rankStreamLabel(label: string, preferLowBandwidth: boolean): number {
  if (preferLowBandwidth && LOW_BANDWIDTH_PATTERN.test(label)) {
    return 3;
  }

  if (!preferLowBandwidth && HIGH_BANDWIDTH_PATTERN.test(label)) {
    return 3;
  }

  if (preferLowBandwidth && HIGH_BANDWIDTH_PATTERN.test(label)) {
    return 1;
  }

  if (!preferLowBandwidth && LOW_BANDWIDTH_PATTERN.test(label)) {
    return 1;
  }

  return 2;
}

export function chooseAutoLiveStream(
  streams: Record<string, string>,
  estimatedBandwidthBps?: number,
  saveData = false,
): string {
  const entries = Object.entries(streams || {});
  if (entries.length === 0) {
    return "";
  }

  const preferLowBandwidth =
    saveData || !!(estimatedBandwidthBps && estimatedBandwidthBps <= 3_000_000);

  return [...entries]
    .sort(([leftLabel], [rightLabel]) => {
      return (
        rankStreamLabel(rightLabel, preferLowBandwidth) -
        rankStreamLabel(leftLabel, preferLowBandwidth)
      );
    })[0][1];
}
