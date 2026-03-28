import { MusicPlayer } from "./MusicPlayer.js";

const getURLData = () => {
  const anchor = new URL(location.href).hash.toLowerCase().substring(1) || "musicdev-0";

  const pos = anchor.lastIndexOf("-");
  const playlistName = anchor.slice(0, pos);
  const id = anchor.slice(pos + 1);

  return {
    playlistName: playlistName ?? "musicdev",
    id: Number(id) ?? 0
  }
}

const { playlistName, id } = getURLData();
export const musicPlayer = new MusicPlayer(playlistName, id);
