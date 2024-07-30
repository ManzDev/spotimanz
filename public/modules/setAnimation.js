const ANIMATIONS = {
  "SpinScaleRight": [
    { "opacity": 0, "scale": 0, "rotate": "35deg" },
    { "opacity": 1, "scale": 1.35 },
    { "scale": 1, "rotate": "0deg" }
  ],
  "SpinScaleLeft": [
    { "opacity": 0, "scale": 0, "rotate": "-35deg" },
    { "opacity": 1, "scale": 1.35 },
    { "scale": 1, "rotate": "0deg" }
  ],
  "Shake": [
    { "transform": "translateY(-500px)" },
    { "transform": "translateY(0)" },
    { "transform": "translateY(-65px)" },
    { "transform": "translateY(0)" },
    { "transform": "translateY(-28px)" },
    { "transform": "translateY(0)" }
  ],
  "SlideFromTop": [
    { "transform": "translateY(-750px)" },
    { "transform": "translateY(0)" },
  ],
  "SlideFromCenter": [
    { "opacity": 0, "transform": "scale(3)" },
    { "opacity": 1, "transform": "scale(1)" }
  ],
  "SlitX": [
    { "opacity": 0, "transform": "rotateY(45deg) rotateZ(45deg)", "offset": 0 },
    { "opacity": 1, "transform": "rotateY(15deg) rotateZ(15deg)", "offset": 0.54 },
    { "transform": "rotateY(0) rotateZ(0)", "offset": 1 },
  ],
  "Fade": [
    { "opacity": 0 },
    { "opacity": 1 }
  ],
  "FadeMove": [
    { "opacity": 0, "transform": "translateY(-8px)" },
    { "opacity": 1, "transform": "translateY(0)" }
  ],
  "BlurIn": [
    { "opacity": 0, "scale": 2.25, "filter": "blur(7px)" },
    { "opacity": 1, "scale": 1, "filter": "blur(0)" },
  ]
};

const options = {
  duration: 500,
  easing: "ease-in-out",
  fill: "forwards"
};

const getRandomAnimation = () => {
  const keys = Object.keys(ANIMATIONS);
  const i = Math.floor(Math.random() * keys.length);
  return keys[i];
}

export const setAnimation = (element, nameAnimation = null) => {
  const selectedNameAnimation = nameAnimation ? nameAnimation : getRandomAnimation();
  const selectedAnimation = ANIMATIONS[selectedNameAnimation];
  element.animate(selectedAnimation, options);
}
