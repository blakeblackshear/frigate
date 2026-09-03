/** GitHub release page for a Frigate version such as "0.19.0". */
export function releaseUrl(version: string): string {
  return `https://github.com/blakeblackshear/frigate/releases/tag/v${version}`;
}
