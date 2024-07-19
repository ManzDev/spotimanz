export const toggleVolumeIcon = (value = null) => {
  const [volume, mute] = document.querySelectorAll(".volume-icon .icon");

  if (value) {
    volume.removeAttribute("hidden");
    mute.setAttribute("hidden", "");
  } else if (value === false) {
    volume.setAttribute("hidden", "");
    mute.removeAttribute("hidden");
  } else if (value === null) {
    volume.toggleAttribute("hidden");
    mute.toggleAttribute("hidden");
  }
}
