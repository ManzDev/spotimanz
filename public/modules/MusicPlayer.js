import { emitEvent } from "./emitter.js";
import { formatTime } from "./formatTime.js";

const shuffleButton = document.querySelector(".song-player-container .shuffle");
const repeatButton = document.querySelector(".song-player-container .repeat");

export class MusicPlayer {
  songList = [];
  currentSongIndex = 0;
  currentSong = new Audio();
  globalVolume = 1;

  constructor(songs) {
    const [currentTimeTag, durationTag] = document.querySelectorAll(".song-player-container time");
    this.durationTag = durationTag;
    this.songList = songs;
    this.prepare(0);
    const songProgress = document.querySelector("progress-slider#current-song");

    this.currentSong.addEventListener("timeupdate", (ev) => {
      const mstime = ~~ev.target.currentTime;
      const time = formatTime(mstime);
      currentTimeTag.textContent = time;
      const percentage = ((mstime * 100) / this.currentSong.duration);

      songProgress.setValue(percentage + 1);  // Fix for progress slider UI
    });

    document.addEventListener("song:changetime", ({ detail }) => {
      const targetCurrentTime = ((detail * this.currentSong.duration) / 100);
      this.currentSong.currentTime = targetCurrentTime;
    });

    document.addEventListener("volume:change", ({ detail }) => {
      this.globalVolume = detail / 100;
      this.updateVolume();
    });

    document.addEventListener("volume:slide", ({ detail }) => {
      this.globalVolume = Math.max(0, Math.min(1, this.globalVolume + detail));
      this.updateVolume();
    });

    document.addEventListener("song:slidetime", ({ detail }) => {
      const percentage = (((detail * 100) * this.currentSong.duration) / 100);
      const targetCurrentTime = Math.max(0, Math.min(100, this.currentSong.currentTime + percentage));
      this.currentSong.currentTime = targetCurrentTime;
    });

    this.currentSong.addEventListener("ended", () => {
      if (this.isRepeat) {
        this.currentSong.currentTime = 0;
        this.currentSong.play();
      }
      else {
        this.next();
      }
    });

    this.updateList(songs);
  }

  get isShuffle() {
    return !shuffleButton.classList.contains("disabled");
  }

  get isRepeat() {
    return !repeatButton.classList.contains("disabled");
  }

  updateList(songs) {
    const songPlaylist = document.querySelector(".song.playlist");
    const oldSongs = songPlaylist.querySelectorAll("song-item");
    oldSongs.forEach(song => song.remove());
    songs.forEach((song, index) => {
      const attrs = Object.entries(song).map(([attr, value]) => `${attr}="${value}"`).join(" ");
      const element = `<song-item index="${index}" ${attrs}></song-item>`;
      songPlaylist.insertAdjacentHTML("beforeend", element);
    });
  }

  setSongs(songs) {
    this.songList = songs;
  }

  prepare(index) {
    if (this.songList.length === 0) return;
    this.currentSongIndex = index;
    const song = this.songList[this.currentSongIndex];
    this.currentSong.src = "/player/playlist/" + song.album.toLowerCase() + "/" + song.slug + ".mp3";
    this.durationTag.textContent = this.songList[this.currentSongIndex].duration;
  }

  play() {
    this.updateVolume();
    if (this.currentSong.paused) {
      this.currentSong.play();
      this.sendInfo();
    }
    else
      this.currentSong.pause();

    this.togglePlayPause();
    this.animatePlay();
  }

  updateVolume() {
    this.currentSong.volume = this.globalVolume;
  }

  togglePlayPause(forcePause = false) {
    if (!forcePause) {
      [...document.querySelectorAll(".buttons .play > div")]
        .forEach(div => div.toggleAttribute("hidden"));
    } else {
      const [play, pause] = document.querySelectorAll(".buttons .play > div");
      play.setAttribute("hidden", "");
      pause.removeAttribute("hidden");
    }
  }

  animatePlay() {
    // const button = document.querySelector(".buttons .play");
    // const animation = button.animate([{ "scale": "1" }, { "scale": "1.1" }, { "scale": "1" }], 200);
  }

  next() {
    const index = (this.currentSongIndex + 1) % this.songList.length;
    console.log({ actual: this.currentSongIndex, nuevo: index });
    this.prepare(index);
    this.play();
    this.togglePlayPause(true);
  }

  prev() {
    const index = ((this.currentSongIndex - 1) <= 0) ? this.songList.length - 1 : this.currentSongIndex - 1;
    this.prepare(index);
    this.play();
    this.togglePlayPause(true);
  }

  sendInfo() {
    emitEvent("player:update-info", document, this.songList[this.currentSongIndex]);
  }
}
