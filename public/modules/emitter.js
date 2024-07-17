export const emitEvent = (name, target, data) => {
  const event = new CustomEvent(name, {
    detail: data,
    composed: true,
    bubbles: true
  });
  target.dispatchEvent(event);
  return event;
}
