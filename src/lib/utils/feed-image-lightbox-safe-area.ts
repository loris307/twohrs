export type FeedImageLightboxSafeAreaInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export function createFeedImageLightboxSafeAreaInsetsReader(
  measure: () => FeedImageLightboxSafeAreaInsets
) {
  let cachedInsets: FeedImageLightboxSafeAreaInsets | null = null;

  return {
    read() {
      if (!cachedInsets) {
        cachedInsets = measure();
      }
      return cachedInsets;
    },
    invalidate() {
      cachedInsets = null;
    },
  };
}
