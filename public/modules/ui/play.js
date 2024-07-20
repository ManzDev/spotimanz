export const togglePlayIcon = (value = null) => {
  const [play, pause] = document.querySelectorAll(".player .play > div");

  if (value) {
    play.removeAttribute("hidden");
    pause.setAttribute("hidden", "");
  } else if (value === false) {
    play.setAttribute("hidden", "");
    pause.removeAttribute("hidden");
  } else if (value === null) {
    play.toggleAttribute("hidden");
    pause.toggleAttribute("hidden");
  }
}
