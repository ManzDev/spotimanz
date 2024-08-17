import { emitEvent } from "./emitter.js";
import { formatTime } from "./formatTime.js";
import { toggleVolumeIcon } from "./ui/volume.js";
import { togglePlayIcon } from "./ui/play.js";
import { shuffle } from "./shuffle.js";
import { MusicList } from "./MusicList.js";

const getPlaylistInfo = (playlistName) => {
  const playlists = [...document.querySelectorAll(".playlist-item")];
  const selectedPlaylist = playlists.find(playlist => playlist.dataset.id === playlistName);
  const color = selectedPlaylist.dataset.color;
  const title = selectedPlaylist.querySelector(".title").textContent;
  return { color, title };
}

const shuffleButton = document.querySelector(".song-player-container .shuffle");
const repeatButton = document.querySelector(".song-player-container .repeat");

export class MusicPlayer {
  songList = [];
  currentSongIndex = 0;
  currentSong = new Audio();
  musicList = new MusicList();
  globalVolume = 1;

  constructor(playlistName = "musicdev", id = 1) {
    this.musicList.get(playlistName).then(songs => {

      if ((id > songs.length) || (id < 1) || (isNaN(Number(id)))) {
        id = 1;
      }
      const { color, title } = getPlaylistInfo(playlistName);
      this.selectList(playlistName, title, color);

      const [currentTimeTag, durationTag] = document.querySelectorAll(".song-player-container time");
      this.durationTag = durationTag;
      this.updateList(songs);
      this.setSongs(songs);
      this.prepare(id - 1);
      this.init();
      this.updateList(songs);
      this.sendInfo({ autoplay: false });
    });
  }

  init() {
    this.currentSong.addEventListener("timeupdate", (ev) => {
      const [currentTimeTag, durationTag] = document.querySelectorAll(".song-player-container time");
      const songProgress = document.querySelector("progress-slider#current-song");
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
      const newValue = detail / 100;
      this.detectMuteUnmute(newValue);
      this.globalVolume = newValue;
      this.updateVolume();
    });

    document.addEventListener("volume:slide", ({ detail }) => {
      const newValue = Math.max(0, Math.min(1, this.globalVolume + detail));
      this.detectMuteUnmute(newValue);
      this.globalVolume = newValue;
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
  }

  detectMuteUnmute(detail) {
    if (detail / 100 === 0 && this.globalVolume > 0) {
      emitEvent("volume:mute", document, null);
    }
    else if (detail / 100 > 0 && this.globalVolume === 0) {
      emitEvent("volume:unmute", document, null);
    }
  }

  get isShuffle() {
    return !shuffleButton.classList.contains("disabled");
  }

  get isRepeat() {
    return !repeatButton.classList.contains("disabled");
  }

  async updateList(songs) {
    return new Promise((resolve, reject) => {
      const songPlaylist = document.querySelector(".song.playlist");
      const oldSongs = songPlaylist.querySelectorAll("song-item");
      oldSongs.forEach(song => song.remove());
      songs.forEach((song, index) => {
        const attrs = Object.entries(song).map(([attr, value]) => `${attr}="${value}"`).join(" ");
        const element = `<song-item index="${index}" ${attrs}></song-item>`;
        songPlaylist.insertAdjacentHTML("beforeend", element);
      });
      resolve();
    });
  }

  setSongs(songs) {
    this.songList = songs.map((song, index) => ({ ...song, index }));
    if (this.isShuffle) this.sortSongs();
  }

  sortSongs() {
    if (this.isShuffle) {
      this.songList = shuffle(this.songList);
    } else {
      const newIndex = this.songList[this.currentSongIndex].index;
      this.songList = this.songList.sort((a, b) => a.index - b.index);
      this.currentSongIndex = newIndex;
    }
  }

  prepare(index) {
    if (this.songList.length === 0) return;
    this.currentSongIndex = index;
    const song = this.songList[this.currentSongIndex];
    this.currentSong.src = `/player/playlist/${song.album.toLowerCase()}/${song.slug}.mp3`;
    this.durationTag.textContent = this.songList[this.currentSongIndex].duration;
  }

  play() {
    this.updateVolume();
    if (this.currentSong.paused) {
      const isResume = this.currentSong.currentTime < 1;
      this.currentSong.play();
      if (isResume)
        this.sendInfo();
    }
    else
      this.currentSong.pause();

    this.togglePlayPause();
  }

  updateVolume() {
    this.currentSong.volume = this.globalVolume;
  }

  togglePlayPause(forcePause = false) {
    if (!forcePause) {
      togglePlayIcon();
    } else {
      togglePlayIcon(false);
    }
  }

  async selectList(slug, title, color) {
    const songs = await this.musicList.select(slug, title, color);
    await this.updateList(songs);
  }

  next() {
    const isEndPlaylist = (this.currentSongIndex + 1) === (this.songList.length);
    if (isEndPlaylist && !this.isRepeat)
      this.nextList();
    else
      this.nextSong();
  }

  nextSong() {
    const index = (this.currentSongIndex + 1) % this.songList.length;
    this.prepare(index);
    this.play();
    this.togglePlayPause(true);
  }

  async nextList(forcePlay = true) {
    const { slug, title, color } = await this.musicList.next();
    await this.selectList(slug, title, color);
    this.setSongs(this.musicList.getCurrent());
    this.currentSongIndex = -1;
    forcePlay && this.nextSong();
  }

  async prevList(forcePlay = true) {
    const { slug, title, color } = await this.musicList.prev();
    await this.selectList(slug, title, color);
    this.setSongs(this.musicList.getCurrent());
    this.currentSongIndex = -1;
    forcePlay && this.nextSong();
  }

  prev() {
    const index = ((this.currentSongIndex - 1) <= 0) ? this.songList.length - 1 : this.currentSongIndex - 1;
    this.prepare(index);
    this.play();
    this.togglePlayPause(true);
  }

  sendInfo(options = { autoplay: true }) {
    emitEvent("player:update-info", document, {
      autoplay: options.autoplay,
      songData: this.songList[this.currentSongIndex]
    });
  }
}
