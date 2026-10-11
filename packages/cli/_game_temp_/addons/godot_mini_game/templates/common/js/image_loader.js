export function waitForImage(image) {
  if (!image) return Promise.resolve();
  if (image.complete) return Promise.resolve();

  return new Promise((resolve) => {
    image.onload = resolve;
    image.onerror = resolve;
  });
}
