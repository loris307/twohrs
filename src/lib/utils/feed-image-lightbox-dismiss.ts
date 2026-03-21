type DismissEvent = {
  preventDefault(): void;
  stopPropagation(): void;
};

export function dismissFeedImageLightbox(
  event: DismissEvent,
  close: () => void
) {
  event.preventDefault();
  event.stopPropagation();
  close();
}
