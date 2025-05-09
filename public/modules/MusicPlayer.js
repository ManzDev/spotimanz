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

  updateMediaSession() {
    if (!('mediaSession' in navigator)) return;

    const song = this.songList[this.currentSongIndex];

    // Set metadata for the current song
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      album: song.album,
      artwork: [
        { src: `/player/playlist/${song.album.toLowerCase()}/${song.slug}.webp`, sizes: '512x512', type: 'image/webp' }
      ]
    });

    // Set action handlers for media controls
    navigator.mediaSession.setActionHandler('play', () => this.play());
    navigator.mediaSession.setActionHandler('pause', () => this.play());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
    navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
  }

  enablePictureInPicture() {
    if (!document.pictureInPictureEnabled) return;

    // Create a hidden video element for PiP
    if (!this.pipVideoElement) {
      // Create a canvas to generate a "fake" video track
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;

      const ctx = canvas.getContext("2d");
      const song = this.songList[this.currentSongIndex];

      // Draw album artwork or a placeholder
      const img = new Image();
      img.src = `/player/playlist/${song.album.toLowerCase()}/${song.slug}.webp`;
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Create a video element and use the canvas as its source
      this.pipVideoElement = document.createElement("video");
      this.pipVideoElement.srcObject = canvas.captureStream(); // Use the canvas as a video source
      this.pipVideoElement.style.display = "none"; // Hide the video element
      document.body.appendChild(this.pipVideoElement);
    }

    // Play the video and request PiP
    this.pipVideoElement.play().then(() => {
      this.pipVideoElement.requestPictureInPicture();
    });

    // Clean up when leaving PiP
    this.pipVideoElement.addEventListener("leavepictureinpicture", () => {
      this.pipVideoElement.pause();
      this.pipVideoElement.remove();
      this.pipVideoElement = null;
    });
  }

  updatePictureInPicture() {
    if (!this.pipVideoElement) return;

    const canvas = this.pipVideoElement.srcObject.getVideoTracks()[0].canvas;
    const ctx = canvas.getContext("2d");
    const song = this.songList[this.currentSongIndex];

    // Clear the canvas and draw the new album artwork
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.src = `/player/playlist/${song.album.toLowerCase()}/${song.slug}.webp`;
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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

    this.updateMediaSession();
    this.updatePictureInPicture();
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
