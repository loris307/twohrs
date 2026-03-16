export function decodeRouteSegment(segment: string): string {
  try {
    return decodeURIComponent(segment).normalize("NFC");
  } catch {
    return segment.normalize("NFC");
  }
}
