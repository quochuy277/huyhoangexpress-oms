export function getTrackingPopupLayer(baseZIndex = 10000) {
  return {
    overlayZIndex: baseZIndex,
    shellZIndex: baseZIndex + 1,
  };
}
