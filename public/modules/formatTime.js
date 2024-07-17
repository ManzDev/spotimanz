export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(remainingSeconds).padStart(2, '0');

  return `${formattedMinutes}:${formattedSeconds}`;
}

export function convertToSeconds(duration) {
  const [minutes, seconds] = duration.split(":").map(Number);
  const totalSeconds = (minutes * 60) + seconds;

  return totalSeconds;
}
